import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET a specific room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const session = await auth();
    
    if (!session?.user || !['ADMIN', 'OWNER', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        roomType: true,
        property: true,
        housekeeping: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH update a room
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const session = await auth();
    
    if (!session?.user || !['ADMIN', 'OWNER', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, isOutOfOrder, outOfOrderReason, floor, notes } = body;

    const updateData: any = {};
    
    if (status !== undefined) updateData.status = status;
    if (isOutOfOrder !== undefined) updateData.isOutOfOrder = isOutOfOrder;
    if (outOfOrderReason !== undefined) updateData.outOfOrderReason = outOfOrderReason;
    if (floor !== undefined) updateData.floor = floor;
    if (notes !== undefined) updateData.notes = notes;

    const room = await prisma.room.update({
      where: { id: roomId },
      data: updateData,
      include: {
        roomType: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE a room
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const session = await auth();
    
    if (!session?.user || !['ADMIN', 'OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.room.delete({
      where: { id: roomId }
    });

    return NextResponse.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
