import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { staffGuard } from '@/server/guard';

// GET a single room type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomTypeId: string }> }
) {
  try {
    // Check authentication
    const guard = await staffGuard(null, { roomTypeId: (await params).roomTypeId });
    if ('error' in guard) return guard.error;

    // Await params before accessing properties
    const { roomTypeId } = await params;

    // Get room type with details
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true
          }
        },
        photos: true
      }
    });

    if (!roomType) {
      return NextResponse.json(
        { error: 'Room type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(roomType);
  } catch (error) {
    console.error('Error fetching room type:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update a room type
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roomTypeId: string }> }
) {
  try {
    // Check authentication
    const guard = await staffGuard('inventory.write', { roomTypeId: (await params).roomTypeId });
    if ('error' in guard) return guard.error;

    // Await params before accessing properties
    const { roomTypeId } = await params;
    const body = await request.json();
    
    const { 
      name, 
      description, 
      capacity, 
      basePrice, 
      amenities, 
      isActive,
      totalRooms
    } = body;

    // Validate required fields
    if (!name || capacity === undefined || basePrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if the room type exists
    const existingRoomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId }
    });

    if (!existingRoomType) {
      return NextResponse.json(
        { error: 'Room type not found' },
        { status: 404 }
      );
    }

    // Update the room type
    const updatedRoomType = await prisma.$transaction(async (prisma: any) => {
      // Update the room type basic info
      const roomType = await prisma.roomType.update({
        where: { id: roomTypeId },
        data: {
          name,
          description,
          capacity: Number(capacity),
          basePrice: Number(basePrice),
          totalRooms: totalRooms !== undefined ? Number(totalRooms) : undefined,
          amenities: amenities || [],
          isActive: isActive !== false
        }
      });

      // Return the updated room type
      return prisma.roomType.findUnique({
        where: { id: roomTypeId },
        include: {
          property: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    });

    return NextResponse.json(updatedRoomType);
  } catch (error) {
    console.error('Error updating room type:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE a room type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomTypeId: string }> }
) {
  try {
    // Check authentication
    const guard = await staffGuard('inventory.write', { roomTypeId: (await params).roomTypeId });
    if ('error' in guard) return guard.error;

    // Await params before accessing properties
    const { roomTypeId } = await params;

    // Check if the room type has any bookings
    const bookingsCount = await prisma.booking.count({
      where: { roomTypeId }
    });

    if (bookingsCount > 0) {
      // If it has bookings, don't delete - just mark as inactive
      await prisma.roomType.update({
        where: { id: roomTypeId },
        data: { isActive: false }
      });
      
      return NextResponse.json({ 
        message: 'Room type has existing bookings and cannot be deleted. It has been marked as inactive.' 
      });
    }

    // If no bookings, delete the room type
    await prisma.roomType.delete({
      where: { id: roomTypeId }
    });

    return NextResponse.json({ 
      message: 'Room type deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting room type:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
