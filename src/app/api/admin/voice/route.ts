import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireStaff, requirePermission, resolvePropertyId } from '@/server/authz';
import { handleRoute, json, parseJson, parseQuery } from '@/server/http';
import { recordAudit } from '@/server/services/audit';
import { LIVE_MODEL, VOICES, voiceConfigured } from '@/server/voice/live';

const DEFAULTS = { enabled: true, voice: 'marin', greeting: null, instructions: null, faqs: [], handoffPhone: null, guestWidget: true };

/** GET — voice agent settings, recent usage and open guest requests. */
export const GET = handleRoute(async (request: NextRequest) => {
  const actor = await requireStaff('requests.view');
  const q = parseQuery(request, z.object({ propertyId: z.string().optional() }));
  const propertyId = await resolvePropertyId(actor, q.propertyId);
  const since = new Date(Date.now() - 7 * 86400_000);
  const [config, sessions, openRequests, recentSessions] = await Promise.all([
    prisma.voiceAgentConfig.findUnique({ where: { propertyId } }),
    prisma.voiceSession.groupBy({ by: ['audience'], where: { propertyId, startedAt: { gte: since } }, _count: { _all: true }, _sum: { toolCalls: true } }),
    prisma.guestRequest.count({ where: { propertyId, status: 'NEW' } }),
    prisma.voiceSession.findMany({ where: { propertyId }, orderBy: { startedAt: 'desc' }, take: 8, select: { id: true, audience: true, startedAt: true, endedAt: true, toolCalls: true } }),
  ]);
  const minutes = recentSessions.reduce((s, r) => s + (r.endedAt ? (r.endedAt.getTime() - r.startedAt.getTime()) / 60000 : 0), 0);
  return json({
    connected: voiceConfigured(),
    model: LIVE_MODEL,
    voices: VOICES,
    config: config ?? { ...DEFAULTS, propertyId },
    stats: {
      guestCalls: sessions.find((s) => s.audience === 'GUEST')?._count._all ?? 0,
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
  const config = await prisma.voiceAgentConfig.upsert({
    where: { propertyId },
    create: { propertyId, ...DEFAULTS, ...clean, faqs: clean.faqs ?? [] },
    update: clean,
  });
  await recordAudit({ actor, source: 'classic' }, propertyId, 'VOICE_SETTINGS', 'Updated voice agent settings');
  return json(config);
});
