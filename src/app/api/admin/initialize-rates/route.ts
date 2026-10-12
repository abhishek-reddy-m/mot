import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/server/authz';
import { forbidden } from '@/server/errors';
import { staffGuard } from '@/server/guard';
import { handleRoute, json, parseJson } from '@/server/http';
import { setupFutureRates, setupFutureRatesForRoomType } from '@/lib/setup-future-rates';

/**
 * POST /api/admin/initialize-rates — materialise base-price rows in the rate
 * calendar. Optional: quotes already fall back to the base price.
 */
export const POST = handleRoute(async (request: NextRequest) => {
  const { roomTypeId } = await parseJson(request, z.object({ roomTypeId: z.string().optional() }).catch({}));
  if (roomTypeId) {
    const guard = await staffGuard('rates.write', { roomTypeId });
    if ('error' in guard) return guard.error;
    return json(await setupFutureRatesForRoomType(roomTypeId));
  }
  const actor = await requireStaff('rates.write');
  if (actor.role !== 'ADMIN') throw forbidden('Initialising every property at once is a platform-admin action.');
  return json(await setupFutureRates());
});
