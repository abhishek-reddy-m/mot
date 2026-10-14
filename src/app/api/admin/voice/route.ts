import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireStaff, requirePermission, resolvePropertyId } from '@/server/authz';
import { handleRoute, json, parseJson, parseQuery } from '@/server/http';
import { recordAudit } from '@/server/services/audit';
import { LIVE_MODEL, VOICES } from '@/server/voice/live';
import { voiceAvailable, voiceProvider } from '@/server/voice/provider';
import { elevenLabsConfigured } from '@/server/voice/elevenlabs';
import { assertDemoHotelUnchanged } from '@/server/demo';

const DEFAULTS = { enabled: true, voice: 'marin', greeting: null, instructions: null, faqs: [], handoffPhone: null, guestWidget: true };

/** GET — voice agent settings, recent usage and open guest requests. */
export const GET = handleRoute(async (request: NextRequest) => {
  const actor = await requireStaff('requests.view');
  const q = parseQuery(request, z.object({ propertyId: z.string().optional() }));
  const propertyId = await resolvePropertyId(actor, q.propertyId);
  const since = new Date(Date.now() - 7 * 86400_000);
  const [config, sessions, phoneCalls, whatsAppChats, openRequests, recentSessions, phoneLine] = await Promise.all([
    prisma.voiceAgentConfig.findUnique({ where: { propertyId } }),
    prisma.voiceSession.groupBy({ by: ['audience'], where: { propertyId, startedAt: { gte: since } }, _count: { _all: true }, _sum: { toolCalls: true } }),
    prisma.voiceSession.count({ where: { propertyId, channel: 'PHONE', startedAt: { gte: since } } }),
    prisma.voiceSession.count({ where: { propertyId, channel: 'WHATSAPP', startedAt: { gte: since } } }),
    prisma.guestRequest.count({ where: { propertyId, status: 'NEW' } }),
    prisma.voiceSession.findMany({ where: { propertyId }, orderBy: { startedAt: 'desc' }, take: 8, select: { id: true, audience: true, startedAt: true, endedAt: true, toolCalls: true } }),
    prisma.voicePhoneLine.findUnique({ where: { propertyId }, select: { enabled: true } }),
  ]);
  const minutes = recentSessions.reduce((s, r) => s + (r.endedAt ? (r.endedAt.getTime() - r.startedAt.getTime()) / 60000 : 0), 0);
  return json({
    connected: voiceAvailable(),
    provider: voiceProvider(),
    model: voiceProvider() === 'elevenlabs' ? 'ElevenLabs Agents' : LIVE_MODEL,
    voices: VOICES,
    config: config ?? { ...DEFAULTS, propertyId },
    phoneLine: phoneLine ? { enabled: phoneLine.enabled } : null,
    phoneReady: elevenLabsConfigured(),
    stats: {
      guestCalls: sessions.find((s) => s.audience === 'GUEST')?._count._all ?? 0,
      phoneCalls,
      whatsAppChats,
      staffSessions: sessions.find((s) => s.audience === 'STAFF')?._count._all ?? 0,
      toolCalls: sessions.reduce((s, r) => s + (r._sum.toolCalls ?? 0), 0),
      recentMinutes: Math.round(minutes),
      openRequests,
    },
    recent: recentSessions.map((r) => ({ ...r, startedAt: r.startedAt.toISOString(), endedAt: r.endedAt?.toISOString() ?? null })),
  });
});

const schema = z.object({
  propertyId: z.string().min(1),
  enabled: z.boolean().optional(),
  voice: z.enum(VOICES).optional(),
  greeting: z.string().trim().max(300).nullable().optional(),
  instructions: z.string().trim().max(4000).nullable().optional(),
  faqs: z.array(z.object({ q: z.string().trim().min(1).max(300), a: z.string().trim().min(1).max(1200) })).max(40).optional(),
  handoffPhone: z.string().trim().max(40).nullable().optional(),
  guestWidget: z.boolean().optional(),
});

/** PUT — update voice settings (managers and owners). */
export const PUT = handleRoute(async (request: NextRequest) => {
  const actor = await requireStaff('voice.manage');
  const body = await parseJson(request, schema);
  const propertyId = await resolvePropertyId(actor, body.propertyId);
  requirePermission(actor, 'voice.manage');
  const { propertyId: _p, ...data } = body;
  const clean = { ...data, greeting: data.greeting || null, instructions: data.instructions || null, handoffPhone: data.handoffPhone || null };
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId }, select: { isDemo: true, voiceAgent: true } });
  const sent = Object.fromEntries(Object.keys(data).map((k) => [k, clean[k as keyof typeof clean]]));
  assertDemoHotelUnchanged(actor, { isDemo: property.isDemo, ...DEFAULTS, ...(property.voiceAgent ?? {}) }, sent, ['greeting', 'instructions', 'faqs', 'handoffPhone', 'enabled', 'guestWidget']);
  const config = await prisma.voiceAgentConfig.upsert({
    where: { propertyId },
    create: { propertyId, ...DEFAULTS, ...clean, faqs: clean.faqs ?? [] },
    update: clean,
  });
  await recordAudit({ actor, source: 'classic' }, propertyId, 'VOICE_SETTINGS', 'Updated voice agent settings');
  return json(config);
});
