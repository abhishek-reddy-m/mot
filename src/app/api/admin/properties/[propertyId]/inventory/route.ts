import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET room inventory for a property
export async function GET(
  request: NextRequest, 
  { params }: { params: { propertyId: string } }
) {
  try {
    const propertyId = params.propertyId;
    
    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

    // Get all room types for this property
    const roomTypes = await prisma.roomType.findMany({
      where: {
        propertyId,
        isActive: true
      },
      include: {
        inventory: true,
        bookings: {
          where: {
            // Only include active bookings
            status: {
              in: ['CONFIRMED', 'PENDING']
            },
            // Only current and future bookings
            checkOut: {
              gte: new Date()
            }
          }
        }
      }
    });

    // Calculate availability for each room type
    const inventoryWithAvailability = roomTypes.map(roomType => {
      // Get total rooms for this type
      const totalInventory = roomType.inventory.length;
      
      // Count booked rooms for current date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const bookedToday = roomType.bookings.filter(booking => {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        return today >= checkIn && today < checkOut;
      }).length;
      
      const availableToday = totalInventory - bookedToday;

      return {
        roomTypeId: roomType.id,
        name: roomType.name,
        capacity: roomType.capacity,
        basePrice: roomType.basePrice,
        description: roomType.description,
        totalRooms: totalInventory,
        availableRooms: availableToday,
        bookingsCount: roomType.bookings.length
      };
    });

    return NextResponse.json(inventoryWithAvailability);
  } catch (error) {
    console.error('Error getting room inventory:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST update room inventory for a property
export async function POST(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const propertyId = params.propertyId;
    const body = await request.json();
    const { roomTypeId, count } = body;

    if (!roomTypeId || count === undefined || count < 0) {
      return NextResponse.json(
        { error: 'Room type ID and valid count are required' },
        { status: 400 }
      );
    }

    // Check if room type exists and belongs to this property
    const roomType = await prisma.roomType.findFirst({
      where: {
        id: roomTypeId,
        propertyId
      }
    });

    if (!roomType) {
      return NextResponse.json(
        { error: 'Room type not found for this property' },
        { status: 404 }
      );
    }

    // Get current inventory
    const currentInventory = await prisma.roomInventory.count({
      where: {
        roomTypeId
      }
    });

    // If increasing inventory
    if (count > currentInventory) {
      // Add new inventory items
      const newItems = [];
      for (let i = 0; i < count - currentInventory; i++) {
        // Generate a room number using the current count and an incrementing value
        const roomNumber = `${roomType.name.substring(0, 2).toUpperCase()}${currentInventory + i + 1}`.padStart(4, '0');
        newItems.push({ 
          roomTypeId, 
          roomNumber 
        });
      }
      
      if (newItems.length > 0) {
        await prisma.roomInventory.createMany({
          data: newItems
        });
      }
    } 
    // If decreasing inventory
    else if (count < currentInventory) {
      // Get inventory items to delete
      const inventoryItems = await prisma.roomInventory.findMany({
        where: {
          roomTypeId
        },
        take: currentInventory - count
      });
      
      if (inventoryItems.length > 0) {
        await prisma.roomInventory.deleteMany({
          where: {
            id: {
              in: inventoryItems.map(item => item.id)
            }
          }
        });
      }
    }

    // Get updated inventory
    const updatedInventory = await prisma.roomInventory.count({
      where: {
        roomTypeId
      }
    });

    return NextResponse.json({ 
      roomTypeId, 
      inventoryCount: updatedInventory 
    });
  } catch (error) {
    console.error('Error updating room inventory:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
