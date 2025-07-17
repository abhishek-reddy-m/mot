import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be logged in to make a booking' },
        { status: 401 }
      );
    }

    // Make sure we have a valid user ID
    if (!session.user.id) {
      return NextResponse.json(
        { error: 'User identification error. Please try logging in again.' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    
    // Verify that the user actually exists in the database
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!userExists) {
      return NextResponse.json(
        { error: 'User not found. Please try logging in again.' },
        { status: 404 }
      );
    }
    
    const { 
      propertyId, 
      roomTypeId, 
      checkIn, 
      checkOut, 
      guests,
      rooms = 1,
      totalPrice 
    } = body;

    // Validate required fields
    if (!propertyId || !roomTypeId || !checkIn || !checkOut || !guests) {
      return NextResponse.json(
        { error: 'Missing required booking details' },
        { status: 400 }
      );
    }

    // Convert string dates to Date objects
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    // Validate dates
    if (checkInDate >= checkOutDate) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }

    if (checkInDate < new Date()) {
      return NextResponse.json(
        { error: 'Check-in date cannot be in the past' },
        { status: 400 }
      );
    }

    // Check if the room type exists and has enough available rooms
    const roomType = await prisma.roomType.findUnique({
      where: {
        id: roomTypeId,
        isActive: true,
      }
    });

    if (!roomType) {
      return NextResponse.json(
        { error: 'Selected room type not found or not available' },
        { status: 404 }
      );
    }

    // Check if there are enough available rooms
    if (roomType.availableRooms < rooms) {
      return NextResponse.json(
        { error: `Not enough rooms available. Only ${roomType.availableRooms} rooms available.` },
        { status: 400 }
      );
    }
    
    // Use a transaction to create booking and update available rooms
    const booking = await prisma.$transaction(async (prisma) => {
      // First, decrease the available rooms count
      await prisma.roomType.update({
        where: { id: roomTypeId },
        data: {
          availableRooms: {
            decrement: rooms
          }
        }
      });

      // Create the booking
      return await prisma.booking.create({
        data: {
          userId,
          propertyId,
          roomTypeId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guests,
          rooms,
          totalPrice: totalPrice || parseFloat(roomType.basePrice.toString()) * rooms,
          status: 'PENDING',
          statusHistory: {
            create: {
              status: 'PENDING',
              notes: 'Booking created'
            }
          }
        }
      });
    });

    return NextResponse.json({ 
      success: true, 
      booking: {
        id: booking.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        status: booking.status
      }
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    
    // Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    
    // Build the query
    // Define a type that includes the possible booking properties
    type BookingWhereClause = {
      userId?: string;
      status?: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
    };
    
    const whereClause: BookingWhereClause = {};
    
    // If not admin, only show the user's bookings
    if (!isAdmin) {
      whereClause.userId = userId;
    }
    
    // Filter by status if provided
    if (status) {
      const upperStatus = status.toUpperCase();
      // Type guard to check if status is valid
      if (['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(upperStatus)) {
        whereClause.status = upperStatus as "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
      }
    }

    // Use type assertion to convert to the Prisma where clause type
    // The Prisma type definition is complex, but our whereClause is compatible at runtime
    // Using type assertion is acceptable here to bridge the gap between our type and Prisma's
    const bookings = await prisma.booking.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: whereClause as any,
      include: {
        property: {
          select: {
            name: true,
            city: true,
            state: true,
            photos: {
              where: { isMain: true },
              take: 1
            }
          }
        },
        roomType: {
          select: {
            name: true,
            capacity: true
          }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(bookings);

  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
