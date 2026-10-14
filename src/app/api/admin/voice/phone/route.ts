import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { toE164 } from '@/lib/phone';
import { can, requireStaff, resolvePropertyId, type Actor } from '@/server/authz';
import { assertNotDemoHotel, demoHotelLocked } from '@/server/demo';
import { DomainError, badRequest } from '@/server/errors';
import { handleRoute, json, parseJson, parseQuery } from '@/server/http';
import { recordAudit } from '@/server/services/audit';
import { describeElevenLabsError, phoneLineStatus, phoneWebhookBase } from '@/server/voice/elevenlabs';
import { voiceAvailable, voiceProvider } from '@/server/voice/provider';

export const dynamic = 'force-dynamic';

const DEMO_LOCKED = 'Demo hotels can’t take a real phone line. Set up your own hotel (Get started), then connect your number there.';

/**
 * The hotel's phone line as the console shows it. With `check`, also syncs
 * the hotel's phone agent at ElevenLabs and lists the numbers that ring it
 * (the account owner points numbers at the agent in ElevenLabs).
 */
async function overview(actor: Actor, propertyId: string, check: boolean) {
  const provider = voiceProvider();
  const ready = provider === 'elevenlabs' && voiceAvailable();
  const [line, property] = await Promise.all([
    prisma.voicePhoneLine.findUnique({ where: { propertyId }, select: { enabled: true, transferNumber: true } }),
    prisma.property.findUniqueOrThrow({ where: { id: propertyId }, select: { isDemo: true } }),
  ]);
  const locked = demoHotelLocked(actor, property.isDemo);
  let urlIssue: string | null = null;
  if (ready) {
    try {
      phoneWebhookBase();
    } catch (e) {
      urlIssue = (e as Error).message;
    }
  }
  let status: Awaited<ReturnType<typeof phoneLineStatus>> | null = null;
  let statusError: string | null = null;
  if (check && ready && line?.enabled && !urlIssue) {
    try {
      status = await phoneLineStatus(propertyId);
    } catch (e) {
      statusError = describeElevenLabsError(e);
    }
  }
  return { provider, ready, canManage: can(actor, 'phone.manage') && !locked, locked: locked ? DEMO_LOCKED : null, line, urlIssue, status, statusError };
}

/** GET ?propertyId[&check=1] — phone line settings and, with check, live status from ElevenLabs. */
export const GET = handleRoute(async (request: NextRequest) => {
  const actor = await requireStaff('requests.view');
  const q = parseQuery(request, z.object({ propertyId: z.string().optional(), check: z.enum(['0', '1']).optional() }));
  const propertyId = await resolvePropertyId(actor, q.propertyId);
  // Checking syncs the agent at ElevenLabs, so it's for the people who manage the voice.
  return json(await overview(actor, propertyId, q.check === '1' && can(actor, 'voice.manage')));
});

const schema = z.object({
  propertyId: z.string().min(1),
  enabled: z.boolean(),
  transferNumber: z.string().trim().max(40).nullable().optional(),
});

/** PUT — turn the phone line on or off and set where callers are put through (owners and platform admins). */
export const PUT = handleRoute(async (request: NextRequest) => {
  const actor = await requireStaff('phone.manage');
  const body = await parseJson(request, schema);
  const propertyId = await resolvePropertyId(actor, body.propertyId);
  if (voiceProvider() !== 'elevenlabs' || !voiceAvailable()) {
    throw new DomainError(409, 'VOICE_DISABLED', 'Phone lines run on ElevenLabs Agents — add ELEVENLABS_API_KEY to the server first.');
  }
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId }, select: { isDemo: true } });
  assertNotDemoHotel(actor, property.isDemo, DEMO_LOCKED);
  const transferNumber = body.transferNumber ? toE164(body.transferNumber) : null;
  if (body.transferNumber && !transferNumber) throw badRequest('Enter the transfer number in international format, like +1 831 555 0100.');

  await prisma.voicePhoneLine.upsert({
    where: { propertyId },
    create: { propertyId, enabled: body.enabled, transferNumber },
    update: { enabled: body.enabled, transferNumber },
  });
  await recordAudit(
    { actor, source: 'classic' },
    propertyId,
    'VOICE_PHONE_LINE',
    `${body.enabled ? 'Turned on' : 'Paused'} the phone line${transferNumber ? `; callers who ask for a person go to ${transferNumber}` : ''}`,
  );
  return json(await overview(actor, propertyId, body.enabled));
});
