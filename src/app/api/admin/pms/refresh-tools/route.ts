import { NextRequest } from 'next/server';
import { requireStaff } from '@/server/authz';
import { handleRoute, json, parseJson } from '@/server/http';
import { refreshTools } from '@/server/pms';
import { limitOutbound, pmsProperty } from '@/server/pms/guard';
import { propertyOnlySchema } from '@/server/pms/schemas';

/** POST { propertyId } — re-read the PMS's tool list and re-cache it as skills. */
export const POST = handleRoute(async (request: NextRequest) => {
  const actor = await requireStaff('bridge.manage');
  const body = await parseJson(request, propertyOnlySchema);
  const property = await pmsProperty(actor, body.propertyId);
  limitOutbound(actor);
  return json(await refreshTools(property.id, { actor, source: 'classic' }));
});
