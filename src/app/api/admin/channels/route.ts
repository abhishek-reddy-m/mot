import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, requireAdmin } from '@/lib/channel-manager/api';
import { CHANNELS, createConnection, serializeConnection } from '@/lib/channel-manager/connections';
import { ChannelApiError } from '@/lib/channel-manager/types';

// GET /api/admin/channels - every property with its OTA connections
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const [properties, recentReservations, recentLogs] = await Promise.all([
      prisma.property.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          _count: { select: { roomTypes: true } },
          channelConnections: {
            include: {
              _count: {
                select: {
                  roomMappings: { where: { isActive: true } },
                  promotions: { where: { status: 'ACTIVE' } },
                  reservations: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.channelReservation.findMany({
        take: 10,
        orderBy: { receivedAt: 'desc' },
        include: {
          connection: { select: { channel: true, property: { select: { name: true } } } },
          booking: { select: { id: true, checkIn: true, checkOut: true, status: true, roomType: { select: { name: true } } } },
        },
      }),
      prisma.channelSyncLog.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: { connection: { select: { channel: true, property: { select: { name: true } } } } },
      }),
    ]);

    return NextResponse.json({
      channels: CHANNELS,
      properties: properties.map((property) => ({
        ...property,
        channelConnections: property.channelConnections.map(serializeConnection),
      })),
      recentReservations,
      recentLogs,
    });
  } catch (err) {
    return errorResponse(err, 'Error listing channel connections');
  }
}

// POST /api/admin/channels - start onboarding a property on an OTA
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { propertyId, channel, mode = 'SANDBOX' } = await request.json();
    if (!propertyId || !channel) throw new ChannelApiError('propertyId and channel are required');
    if (mode !== 'SANDBOX' && mode !== 'LIVE') throw new ChannelApiError('mode must be SANDBOX or LIVE');
    const connection = await createConnection(propertyId, channel, mode);
    return NextResponse.json(serializeConnection(connection), { status: 201 });
  } catch (err) {
    return errorResponse(err, 'Error creating channel connection');
  }
}
