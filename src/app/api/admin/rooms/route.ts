import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET all rooms (optionally filtered by propertyId)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || !['ADMIN', 'OWNER', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const roomTypeId = searchParams.get('roomTypeId');
    const includeHousekeeping = searchParams.get('includeHousekeeping') === 'true';

    const where: any = {};
    if (propertyId) {
      where.propertyId = propertyId;
    }
    if (roomTypeId) {
      where.roomTypeId = roomTypeId;
    }

    const rooms = await prisma.room.findMany({
      where,
      include: {
        roomType: {
          select: {
            id: true,
            name: true,
          }
        },
        ...(includeHousekeeping && {
          housekeeping: {
            where: {
              status: {
                in: ['PENDING', 'IN_PROGRESS']
              }
            },
            include: {
              assignee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        })
      },
      orderBy: [
        { floor: 'asc' },
        { roomNumber: 'asc' }
      ]
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create a new room
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || !['ADMIN', 'OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId, roomTypeId, roomNumber, floor, notes } = await request.json();

    if (!propertyId || !roomTypeId || !roomNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if room number already exists for this property
    const existingRoom = await prisma.room.findUnique({
      where: {
        propertyId_roomNumber: {
          propertyId,
          roomNumber
        }
      }
    });

    if (existingRoom) {
      return NextResponse.json({ error: 'Room number already exists for this property' }, { status: 400 });
    }

    const room = await prisma.room.create({
      data: {
        propertyId,
        roomTypeId,
        roomNumber,
        floor: floor || null,
        notes: notes || null,
        status: 'CLEAN',
        isOutOfOrder: false,
      },
      include: {
        roomType: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
