import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { assertPropertyAccess, requireStaff, scopeByProperty } from '@/server/authz';
import { badRequest, conflict, notFound } from '@/server/errors';
import { handleRoute, json, parseJson, parseQuery } from '@/server/http';
import { recordAudit } from '@/server/services/audit';

const query = z.object({
  propertyId: z.string().optional(),
  roomTypeId: z.string().optional(),
  includeHousekeeping: z.enum(['true', 'false']).optional(),
});

/** GET — physical rooms (scoped to the caller's properties). */
export const GET = handleRoute(async (request: NextRequest) => {
  const actor = await requireStaff('room.view');
  const q = parseQuery(request, query);
  if (q.propertyId) assertPropertyAccess(actor, q.propertyId);
  const rooms = await prisma.room.findMany({
    where: {
      ...(q.propertyId ? { propertyId: q.propertyId } : scopeByProperty(actor)),
      ...(q.roomTypeId ? { roomTypeId: q.roomTypeId } : {}),
    },
    include: {
      roomType: { select: { id: true, name: true } },
      ...(q.includeHousekeeping === 'true'
        ? {
            housekeeping: {
              where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
              include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          }
        : {}),
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
  });
  return json(rooms);
});

const createSchema = z.object({
  propertyId: z.string().min(1),
  roomTypeId: z.string().min(1),
  roomNumber: z.string().trim().min(1).max(20),
  floor: z.string().trim().max(20).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(24)).max(12).optional(),
});

/** POST — add a physical room. */
export const POST = handleRoute(async (request: NextRequest) => {
  const actor = await requireStaff('room.manage');
  const body = await parseJson(request, createSchema);
  assertPropertyAccess(actor, body.propertyId);
  const roomType = await prisma.roomType.findUnique({ where: { id: body.roomTypeId }, select: { propertyId: true, name: true } });
  if (!roomType) throw notFound('Room type');
  if (roomType.propertyId !== body.propertyId) throw badRequest('That room type belongs to a different property.');
  const exists = await prisma.room.findUnique({
    where: { propertyId_roomNumber: { propertyId: body.propertyId, roomNumber: body.roomNumber } },
  });
  if (exists) throw conflict(`Room ${body.roomNumber} already exists at this property.`);
  const room = await prisma.room.create({
    data: {
      propertyId: body.propertyId,
      roomTypeId: body.roomTypeId,
      roomNumber: body.roomNumber,
      floor: body.floor || null,
      notes: body.notes || null,
      tags: body.tags?.map((t) => t.toLowerCase()) ?? [],
      status: 'CLEAN',
      isOutOfOrder: false,
    },
    include: { roomType: { select: { id: true, name: true } } },
  });
  await recordAudit({ actor, source: 'classic' }, body.propertyId, 'ROOM_CREATE', `Added room ${room.roomNumber} (${roomType.name})`, {
    roomId: room.id,
  });
  return json(room, { status: 201 });
});
