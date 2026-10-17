import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, requireAdmin } from '@/lib/channel-manager/api';
import { serializeConnection, updateConnectionSettings } from '@/lib/channel-manager/connections';
import { serializePromotion } from '@/lib/channel-manager/promotions';
import { connectionSettingsSchema, zodMessage } from '@/lib/channel-manager/schemas';
import { ChannelApiError } from '@/lib/channel-manager/types';

type Params = { params: Promise<{ connectionId: string }> };

// GET /api/admin/channels/[connectionId]
export async function GET(_request: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { connectionId } = await params;
    const connection = await prisma.channelConnection.findUnique({
      where: { id: connectionId },
      include: {
        property: { select: { id: true, name: true } },
        roomMappings: { include: { roomType: { select: { id: true, name: true, basePrice: true, totalRooms: true } } } },
        promotions: { orderBy: { createdAt: 'desc' } },
        reservations: {
          take: 25,
          orderBy: { receivedAt: 'desc' },
          include: {
            booking: {
              select: { id: true, checkIn: true, checkOut: true, status: true, rooms: true, roomType: { select: { name: true } } },
            },
          },
        },
        syncLogs: { take: 30, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!connection) return NextResponse.json({ error: 'Channel connection not found' }, { status: 404 });

    return NextResponse.json({
      ...serializeConnection(connection),
      roomMappings: connection.roomMappings.map((m) => ({
        ...m,
        markupPercent: m.markupPercent === null ? null : Number(m.markupPercent),
        roomType: { ...m.roomType, basePrice: Number(m.roomType.basePrice) },
      })),
      promotions: connection.promotions.map(serializePromotion),
    });
  } catch (err) {
    return errorResponse(err, 'Error loading channel connection');
  }
}

// PATCH /api/admin/channels/[connectionId] - credentials and sync settings
export async function PATCH(request: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { connectionId } = await params;
    const parsed = connectionSettingsSchema.safeParse(await request.json());
    if (!parsed.success) throw new ChannelApiError(zodMessage(parsed.error));
    const connection = await updateConnectionSettings(connectionId, parsed.data);
    return NextResponse.json(serializeConnection(connection));
  } catch (err) {
    return errorResponse(err, 'Error updating channel connection');
  }
}

// DELETE /api/admin/channels/[connectionId] - disconnect (PMS bookings are kept)
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { connectionId } = await params;
    await prisma.channelConnection.delete({ where: { id: connectionId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, 'Error deleting channel connection');
  }
}
