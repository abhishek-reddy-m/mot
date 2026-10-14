/**
 * Starting a voice conversation, whichever provider carries the audio
 * (OpenAI GPT-Live or ElevenLabs). Everything provider-independent lives
 * here: who may start one, the hotel's voice settings and prompts, spend
 * limits, the usage log row and the signed token the browser uses for
 * tool calls.
 */
import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { roleLabel } from '@/lib/status';
import { assertPropertyAccess, getActor, hasPropertyAccess, requireStaff } from '../authz';
import { DomainError, notFound } from '../errors';
import { guestContext } from './guestTools';
import { GUEST_TOOLS, PHONE_TOOLS, STAFF_TOOLS, guestPrompts, signVoiceToken, staffPrompts, type FunctionToolSpec } from './live';

const MINUTE = 60_000;
const since = (ms: number) => ({ gte: new Date(Date.now() - ms) });

interface Limit {
  where: Prisma.VoiceSessionWhereInput;
  max: number;
  message: string;
}

export interface VoiceSessionContext {
  audience: 'guest' | 'staff';
  property: { id: string; name: string };
  /** The hotel's chosen GPT-Live voice name. */
  voice: string;
  /** Voice-facing and task-facing instructions. */
  prompts: { instructions: string; backendInstructions: string };
  /** What the voice says first. */
  firstMessage: string;
  tools: FunctionToolSpec[];
}

/**
 * Sessions cost money per minute, so a slot is reserved in the database
 * before the provider is called: insert our row, then count including it.
 * However many server instances race, at most `max` rows get through (late
 * arrivals remove their own row). A failed start gives its slot back.
 */
async function reserve<T>(data: Prisma.VoiceSessionUncheckedCreateInput, limits: Limit[], start: () => Promise<{ externalId: string | null; result: T }>) {
  const row = await prisma.voiceSession.create({ data });
  const release = () => prisma.voiceSession.delete({ where: { id: row.id } }).catch(() => undefined);
  // Plus one budget across every hotel and audience: a ceiling on the provider bill.
  const global: Limit = { where: { startedAt: since(60 * MINUTE) }, max: Number(process.env.VOICE_MAX_SESSIONS_PER_HOUR || 300), message: 'The voice line is very busy right now — please try again shortly.' };
  for (const limit of [...limits, global]) {
    if ((await prisma.voiceSession.count({ where: limit.where })) > limit.max) {
      await release();
      throw new DomainError(429, 'RATE_LIMITED', limit.message);
    }
  }
  try {
    const started = await start();
    if (started.externalId) await prisma.voiceSession.update({ where: { id: row.id }, data: { liveSessionId: started.externalId } });
    return { id: row.id, result: started.result };
  } catch (e) {
    await release();
    throw e;
  }
}

/**
 * Checks access and limits, builds the hotel's prompts, runs `start` against
 * the provider, and returns its result with the browser's session token.
 * Provider errors (code VOICE_UPSTREAM) carry a reason for the hotel's team;
 * guests see a gentle line instead.
 */
export async function openVoiceSession<T>(
  request: Request,
  q: { propertyId: string; audience: 'guest' | 'staff' },
  start: (ctx: VoiceSessionContext) => Promise<{ externalId: string | null; result: T }>,
): Promise<{ result: T; token: string }> {
  const property = await prisma.property.findFirst({
    where: { id: q.propertyId, isActive: true },
    select: { id: true, name: true, voiceAgent: true },
  });
  if (!property) throw notFound('Property');
  const cfg = property.voiceAgent;
  const voice = cfg?.voice ?? 'marin';
  const today = guestContext();

  if (q.audience === 'staff') {
    const actor = await requireStaff('voice.use');
    assertPropertyAccess(actor, property.id);
    const ctx: VoiceSessionContext = {
      audience: 'staff',
      property,
      voice,
      prompts: staffPrompts({ name: property.name, userName: actor.name, role: roleLabel(actor.role), ...today }),
      firstMessage: `Hi ${actor.name.split(' ')[0]} — what do you need?`,
      tools: STAFF_TOOLS,
    };
    const session = await reserve(
      { propertyId: property.id, userId: actor.userId, audience: 'STAFF' },
      [{ where: { userId: actor.userId, audience: 'STAFF', startedAt: since(60 * MINUTE) }, max: 30, message: 'That’s a lot of voice sessions this hour — give it a few minutes, or type instead.' }],
      () => start(ctx),
    );
    return { result: session.result, token: signVoiceToken({ sid: session.id, pid: property.id, aud: 'STAFF', uid: actor.userId }) };
  }

  if (cfg && (!cfg.enabled || !cfg.guestWidget)) throw new DomainError(403, 'VOICE_OFF', `${property.name} isn’t taking voice calls online right now.`);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const clientKey = createHash('sha256').update(`${ip}|${property.id}`).digest('hex').slice(0, 32);
  const ctx: VoiceSessionContext = {
    audience: 'guest',
    property,
    voice,
    prompts: guestPrompts({ name: property.name, greeting: cfg?.greeting, houseRules: cfg?.instructions, handoffPhone: cfg?.handoffPhone, ...today }),
    firstMessage: cfg?.greeting?.trim() || `Hi, thanks for calling ${property.name}. How can I help?`,
    tools: GUEST_TOOLS,
  };
  const session = await reserve({ propertyId: property.id, audience: 'GUEST', clientKey }, guestLimits(property.id, clientKey), () => start(ctx)).catch(async (e) => {
    // The provider's reason is for the hotel's team (e.g. a test call from the console), not for guests.
    if (!(e instanceof DomainError) || e.code !== 'VOICE_UPSTREAM') throw e;
    const viewer = await getActor().catch(() => null);
    if (viewer && viewer.role !== 'CUSTOMER' && hasPropertyAccess(viewer, property.id)) throw e;
    throw new DomainError(502, 'VOICE_UPSTREAM', `${property.name}’s voice line isn’t available right now — please try again later${cfg?.handoffPhone ? ` or call ${cfg.handoffPhone}` : ''}.`);
  });
  return { result: session.result, token: signVoiceToken({ sid: session.id, pid: property.id, aud: 'GUEST', uid: null }) };
}

/** Per caller (a browser's IP, or a phone's caller ID) and per hotel; phone and web share the hotel's budget. */
function guestLimits(propertyId: string, clientKey: string | null): Limit[] {
  return [
    ...(clientKey ? [{ where: { clientKey, startedAt: since(10 * MINUTE) }, max: 6, message: 'Too many calls in a short time — please try again in a few minutes.' }] : []),
    { where: { propertyId, audience: 'GUEST', startedAt: since(60 * MINUTE) }, max: 120, message: 'Our voice line is very busy — please try again shortly or call the hotel.' },
  ];
}

/**
 * A call to a hotel's phone line (the provider asked us how to answer it).
 * Same checks and limits as the booking page, with the phone prompt and
 * tools; the token goes back to the provider, which sends it on every tool
 * call. Throws DomainError (VOICE_OFF, RATE_LIMITED, NOT_FOUND) when the
 * call shouldn't be taken.
 */
export async function openPhoneSession(input: { propertyId: string; callerNumber: string | null; externalId: string | null }): Promise<{ token: string; ctx: VoiceSessionContext }> {
  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, isActive: true },
    select: { id: true, name: true, voiceAgent: true, phoneLine: true },
  });
  if (!property) throw notFound('Property');
  const cfg = property.voiceAgent;
  const line = property.phoneLine;
  if (!line?.enabled || (cfg && !cfg.enabled)) throw new DomainError(403, 'VOICE_OFF', `${property.name} isn’t taking calls on this line right now.`);
  const ctx: VoiceSessionContext = {
    audience: 'guest',
    property: { id: property.id, name: property.name },
    voice: cfg?.voice ?? 'marin',
    prompts: guestPrompts({
      name: property.name,
      greeting: cfg?.greeting,
      houseRules: cfg?.instructions,
      handoffPhone: cfg?.handoffPhone,
      phone: { callerNumber: input.callerNumber, canTransfer: !!line.transferNumber },
      ...guestContext(),
    }),
    firstMessage: cfg?.greeting?.trim() || `Thanks for calling ${property.name} — this is the hotel’s virtual assistant. How can I help?`,
    tools: PHONE_TOOLS,
  };
  // Withheld numbers share no per-caller budget; the hotel's hourly limit still applies.
  const clientKey = input.callerNumber ? createHash('sha256').update(`phone:${input.callerNumber}|${property.id}`).digest('hex').slice(0, 32) : null;
  const session = await reserve(
    { propertyId: property.id, audience: 'GUEST', channel: 'PHONE', clientKey, callerNumber: input.callerNumber },
    guestLimits(property.id, clientKey),
    async () => ({ externalId: input.externalId, result: null }),
  );
  // Outlives the longest call (10 minutes) with room to spare.
  return { ctx, token: signVoiceToken({ sid: session.id, pid: property.id, aud: 'GUEST', uid: null, ch: 'PHONE' }, 20 * MINUTE) };
}
