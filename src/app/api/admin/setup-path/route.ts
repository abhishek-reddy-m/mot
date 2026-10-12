import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireStaff, resolvePropertyId } from '@/server/authz';
import { handleRoute, json, parseJson } from '@/server/http';
import { recordAudit } from '@/server/services/audit';

const LABEL = { FULL: 'everything on StayOS', BRIDGE: 'keep your PMS (bridge)', VOICE: 'voice front desk only' } as const;

/**
 * PUT { propertyId, setupPath } — move between adoption paths without
 * starting over (voice only → bridge → full StayOS). Data is kept.
 */
export const PUT = handleRoute(async (request: NextRequest) => {
  const actor = await requireStaff('property.write');
  const body = await parseJson(request, z.object({ propertyId: z.string().min(1), setupPath: z.enum(['FULL', 'BRIDGE', 'VOICE']) }));
  const propertyId = await resolvePropertyId(actor, body.propertyId);
  const before = await prisma.property.findUniqueOrThrow({ where: { id: propertyId }, select: { setupPath: true } });
  const p = await prisma.property.update({ where: { id: propertyId }, data: { setupPath: body.setupPath }, select: { id: true, setupPath: true } });
  if (before.setupPath !== body.setupPath) {
    await recordAudit({ actor, source: 'classic' }, propertyId, 'SETUP_PATH', `Switched to ${LABEL[body.setupPath]}`, { from: before.setupPath, to: body.setupPath });
  }
  return json(p);
});
