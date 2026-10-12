import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { assertPropertyAccess, requireStaff } from '@/server/authz';
import { badRequest, DomainError, notFound } from '@/server/errors';
import { handleRoute, json, parseQuery } from '@/server/http';
import { roleLabel } from '@/lib/status';
import { GUEST_TOOLS, STAFF_TOOLS, createLiveSession, guestPrompts, signVoiceToken, staffPrompts } from '@/server/voice/live';
import { guestContext } from '@/server/voice/guestTools';

const query = z.object({ propertyId: z.string().min(1), audience: z.enum(['guest', 'staff']).default('guest') });

// Public guest sessions cost money per minute: a small per-IP window here
// plus a per-property hourly cap in the database.
const recent = new Map<string, number[]>();
function rateLimited(ip: string, limit = 6, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > limit;
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
    const live = await createLiveSession({ sdp, voice, ...prompts, tools: STAFF_TOOLS });
    const session = await prisma.voiceSession.create({ data: { propertyId: property.id, userId: actor.userId, audience: 'STAFF', liveSessionId: live.sessionId } });
    return json({ sdp: live.sdp, token: signVoiceToken({ sid: session.id, pid: property.id, aud: 'STAFF', uid: actor.userId }) });
  }

  if (cfg && (!cfg.enabled || !cfg.guestWidget)) throw new DomainError(403, 'VOICE_OFF', `${property.name} isn’t taking voice calls online right now.`);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  if (rateLimited(`${ip}:${property.id}`)) throw new DomainError(429, 'RATE_LIMITED', 'Too many calls in a short time — please try again in a few minutes.');
  const lastHour = await prisma.voiceSession.count({ where: { propertyId: property.id, audience: 'GUEST', startedAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (lastHour >= 120) throw new DomainError(429, 'RATE_LIMITED', 'Our voice line is very busy — please try again shortly or call the hotel.');

  const prompts = guestPrompts({ name: property.name, greeting: cfg?.greeting, houseRules: cfg?.instructions, handoffPhone: cfg?.handoffPhone, ...ctx });
  const live = await createLiveSession({ sdp, voice, ...prompts, tools: GUEST_TOOLS });
  const session = await prisma.voiceSession.create({ data: { propertyId: property.id, audience: 'GUEST', liveSessionId: live.sessionId } });
  return json({ sdp: live.sdp, token: signVoiceToken({ sid: session.id, pid: property.id, aud: 'GUEST', uid: null }) });
});
