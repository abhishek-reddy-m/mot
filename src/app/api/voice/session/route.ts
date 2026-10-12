import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertPropertyAccess, getActor, hasPropertyAccess, requireStaff } from '@/server/authz';
import { badRequest, DomainError, notFound } from '@/server/errors';
import { handleRoute, json, parseQuery } from '@/server/http';
import { roleLabel } from '@/lib/status';
import { GUEST_TOOLS, STAFF_TOOLS, createLiveSession, guestPrompts, signVoiceToken, staffPrompts } from '@/server/voice/live';
import { guestContext } from '@/server/voice/guestTools';

const query = z.object({ propertyId: z.string().min(1), audience: z.enum(['guest', 'staff']).default('guest') });

const MINUTE = 60_000;
const since = (ms: number) => ({ gte: new Date(Date.now() - ms) });

interface Limit {
  where: Prisma.VoiceSessionWhereInput;
  max: number;
  message: string;
}

/**
 * Live sessions cost money per minute, so a slot is reserved in the database
 * before OpenAI is called: insert our row, then count including it. However
 * many server instances race, at most `max` rows get through (late arrivals
 * remove their own row). A failed call gives its slot back.
 */
async function startSession(data: Prisma.VoiceSessionUncheckedCreateInput, limits: Limit[], live: () => ReturnType<typeof createLiveSession>) {
  const row = await prisma.voiceSession.create({ data });
  const release = () => prisma.voiceSession.delete({ where: { id: row.id } }).catch(() => undefined);
  // Plus one budget across every hotel and audience: a ceiling on the OpenAI bill.
  const global: Limit = { where: { startedAt: since(60 * MINUTE) }, max: Number(process.env.VOICE_MAX_SESSIONS_PER_HOUR || 300), message: 'The voice line is very busy right now — please try again shortly.' };
  for (const limit of [...limits, global]) {
    if ((await prisma.voiceSession.count({ where: limit.where })) > limit.max) {
      await release();
      throw new DomainError(429, 'RATE_LIMITED', limit.message);
    }
  }
  try {
    const session = await live();
    await prisma.voiceSession.update({ where: { id: row.id }, data: { liveSessionId: session.sessionId } });
    return { id: row.id, sdp: session.sdp };
  } catch (e) {
    await release();
    throw e;
  }
}

/**
 * POST /api/voice/session?propertyId&audience — body is the browser's WebRTC
 * SDP offer. Creates a GPT-Live session and returns the SDP answer plus a
 * signed token the browser uses for this session's tool calls.
 */
export const POST = handleRoute(async (request: NextRequest) => {
  const q = parseQuery(request, query);
  const sdp = await request.text();
  if (!sdp.trim().startsWith('v=') || sdp.length > 64_000) throw badRequest('A WebRTC SDP offer is required.');

  const property = await prisma.property.findFirst({
    where: { id: q.propertyId, isActive: true },
    select: { id: true, name: true, voiceAgent: true },
  });
  if (!property) throw notFound('Property');
  const cfg = property.voiceAgent;
  const voice = cfg?.voice ?? 'marin';
  const ctx = guestContext();

  if (q.audience === 'staff') {
    const actor = await requireStaff('voice.use');
    assertPropertyAccess(actor, property.id);
    const prompts = staffPrompts({ name: property.name, userName: actor.name, role: roleLabel(actor.role), ...ctx });
    const session = await startSession(
      { propertyId: property.id, userId: actor.userId, audience: 'STAFF' },
      [{ where: { userId: actor.userId, audience: 'STAFF', startedAt: since(60 * MINUTE) }, max: 30, message: 'That’s a lot of voice sessions this hour — give it a few minutes, or type instead.' }],
      () => createLiveSession({ sdp, voice, ...prompts, tools: STAFF_TOOLS }),
    );
    return json({ sdp: session.sdp, token: signVoiceToken({ sid: session.id, pid: property.id, aud: 'STAFF', uid: actor.userId }) });
  }

  if (cfg && (!cfg.enabled || !cfg.guestWidget)) throw new DomainError(403, 'VOICE_OFF', `${property.name} isn’t taking voice calls online right now.`);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const clientKey = createHash('sha256').update(`${ip}|${property.id}`).digest('hex').slice(0, 32);
  const prompts = guestPrompts({ name: property.name, greeting: cfg?.greeting, houseRules: cfg?.instructions, handoffPhone: cfg?.handoffPhone, ...ctx });
  const session = await startSession(
    { propertyId: property.id, audience: 'GUEST', clientKey },
    [
      { where: { clientKey, startedAt: since(10 * MINUTE) }, max: 6, message: 'Too many calls in a short time — please try again in a few minutes.' },
      { where: { propertyId: property.id, audience: 'GUEST', startedAt: since(60 * MINUTE) }, max: 120, message: 'Our voice line is very busy — please try again shortly or call the hotel.' },
    ],
    () => createLiveSession({ sdp, voice, ...prompts, tools: GUEST_TOOLS }),
  ).catch(async (e) => {
    // OpenAI's reason is for the hotel's team (e.g. a test call from the console), not for guests.
    if (!(e instanceof DomainError) || e.code !== 'VOICE_UPSTREAM') throw e;
    const viewer = await getActor().catch(() => null);
    if (viewer && viewer.role !== 'CUSTOMER' && hasPropertyAccess(viewer, property.id)) throw e;
    throw new DomainError(502, 'VOICE_UPSTREAM', `${property.name}’s voice line isn’t available right now — please try again later${cfg?.handoffPhone ? ` or call ${cfg.handoffPhone}` : ''}.`);
  });
  return json({ sdp: session.sdp, token: signVoiceToken({ sid: session.id, pid: property.id, aud: 'GUEST', uid: null }) });
});
