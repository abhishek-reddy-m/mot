import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Get room inventory for a specific room type
export async function GET(
  request: NextRequest,
  { params }: { params: { roomTypeId: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const roomTypeId = params.roomTypeId;
    
    // Check if the room type exists
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      select: { id: true }
    });

    if (!roomType) {
      return NextResponse.json(
        { error: 'Room type not found' },
        { status: 404 }
      );
    }

    // Just get the basic inventory data for now
    const inventory = await prisma.room.findMany({
      where: { roomTypeId },
      orderBy: { roomNumber: 'asc' }
    });

    // For now, just return basic inventory data
    return NextResponse.json(inventory);
  } catch (error) {
    console.error('Error fetching room inventory:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add new room to inventory
export async function POST(
  request: NextRequest,
  { params }: { params: { roomTypeId: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const roomTypeId = params.roomTypeId;
    const body = await request.json();
    const { roomNumber } = body;
    
    if (!roomNumber) {
      return NextResponse.json(
        { error: 'Room number is required' },
        { status: 400 }
      );
    }
    
    // Check if the room type exists
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId }
    });

    if (!roomType) {
      return NextResponse.json(
        { error: 'Room type not found' },
        { status: 404 }
      );
    }
    
    // Check if room number already exists for this room type
    const existingRoom = await prisma.room.findFirst({
      where: {
        roomTypeId,
        roomNumber
      }
    });
    
    if (existingRoom) {
      return NextResponse.json(
        { error: 'A room with this number already exists for this room type' },
        { status: 400 }
      );
    }
    
    // Create the new room
    const newRoom = await prisma.room.create({
      data: {
        propertyId: roomType.propertyId,
        roomTypeId,
        roomNumber
      }
    });
    
    return NextResponse.json(newRoom, { status: 201 });
  } catch (error) {
    console.error('Error adding room to inventory:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
