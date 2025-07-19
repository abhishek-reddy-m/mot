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

    // First ensure dates are in valid YYYY-MM-DD format
    const cleanCheckIn = checkIn.trim().match(/^\d{4}-\d{2}-\d{2}$/) 
      ? checkIn.trim()
      : null;
      
    const cleanCheckOut = checkOut.trim().match(/^\d{4}-\d{2}-\d{2}$/)
      ? checkOut.trim()
      : null;
      
    // Validate date format first
    if (!cleanCheckIn || !cleanCheckOut) {
      return NextResponse.json(
        { error: 'Invalid date format. Please use YYYY-MM-DD format.' },
        { status: 400 }
      );
    }
    
    // Convert string dates to Date objects and normalize to noon UTC to avoid timezone issues
    const checkInDate = new Date(`${cleanCheckIn}T12:00:00Z`);
    const checkOutDate = new Date(`${cleanCheckOut}T12:00:00Z`);
    
    // Log the dates for debugging
    console.log('Booking request dates:', {
      rawCheckIn: checkIn,
      rawCheckOut: checkOut,
      cleanCheckIn,
      cleanCheckOut,
      parsedCheckIn: checkInDate.toISOString(),
      parsedCheckOut: checkOutDate.toISOString()
    });
    
    // Double-check date validity after parsing
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date values. Please provide valid dates.' },
        { status: 400 }
      );
    }
    
    // Validate date logic
    if (checkInDate >= checkOutDate) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }

    // Get today's date at the start of day UTC for fair comparison
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    if (checkInDate < today) {
      return NextResponse.json(
        { error: 'Check-in date cannot be in the past' },
        { status: 400 }
      );
    }
    
    // Ensure booking period is reasonable (e.g., not more than 30 days)
    const daysDiff = (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 30) {
      return NextResponse.json(
        { error: 'Bookings cannot exceed 30 days' },
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
    
    // Check for existing bookings that would overlap with this date range
    const existingBookings = await prisma.booking.findMany({
      where: {
        roomTypeId,
        status: { notIn: ['CANCELLED'] },
        // Use the overlap condition: booking starts before our end and ends after our start
        AND: [
          { checkIn: { lt: checkOutDate } }, // Existing booking starts before our checkout
          { checkOut: { gt: checkInDate } }  // Existing booking ends after our checkin
        ]
      },
      select: {
        rooms: true,
        checkIn: true,
        checkOut: true
      }
    });
    
    console.log(`Found ${existingBookings.length} potentially conflicting bookings for this date range`);
    
    // If we found overlapping bookings, we need to check if there's enough capacity
    if (existingBookings.length > 0) {
      // Helper function to get all dates in a range as strings
      function getDateRange(start: Date, end: Date): string[] {
        const dateRange: string[] = [];
        const currentDate = new Date(start);
        
        // Normalize to start of day for consistent comparison
        currentDate.setUTCHours(0, 0, 0, 0);
        
        const endDateNorm = new Date(end);
        endDateNorm.setUTCHours(0, 0, 0, 0);
        
        while (currentDate < endDateNorm) {
          // Store dates as YYYY-MM-DD strings for consistent comparison
          dateRange.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        return dateRange;
      }
      
      // Get all dates in the requested booking period
      const requestedDates = getDateRange(checkInDate, checkOutDate);
      console.log(`Requested dates: ${requestedDates.join(', ')}`);
      
      // Track bookings per date
      const bookedRoomsByDate: Record<string, number> = {};
      
      // For each existing booking, mark the rooms as booked for each date
      existingBookings.forEach(booking => {
        const bookingDates = getDateRange(booking.checkIn, booking.checkOut);
        bookingDates.forEach(date => {
          // If the date is in our requested range, count it
          if (requestedDates.includes(date)) {
            if (!bookedRoomsByDate[date]) bookedRoomsByDate[date] = 0;
            bookedRoomsByDate[date] += booking.rooms;
          }
        });
      });
      
      // Find the maximum number of booked rooms for any date
      let maxBookedRooms = 0;
      Object.entries(bookedRoomsByDate).forEach(([date, count]) => {
        console.log(`Date ${date}: ${count} rooms already booked`);
        maxBookedRooms = Math.max(maxBookedRooms, count);
      });
      
      console.log(`Maximum rooms booked on any date: ${maxBookedRooms}`);
      console.log(`Total rooms: ${roomType.totalRooms}, Available: ${roomType.availableRooms}`);
      
      // If there aren't enough rooms available for the requested dates, reject the booking
      if (roomType.totalRooms - maxBookedRooms < rooms) {
        return NextResponse.json(
          { error: `Not enough rooms available for the selected dates. Maximum available: ${roomType.totalRooms - maxBookedRooms}.` },
          { status: 400 }
        );
      }
    }
    
    // Import the room availability update function
    const { updateRoomAvailability } = await import('@/lib/room-availability');

    // Use a transaction to create booking and update room availability
    const booking = await prisma.$transaction(async (prisma) => {
      // Create the booking
      const newBooking = await prisma.booking.create({
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
      
      return newBooking;
    });
    
    // Update room availability records after transaction is complete
    await updateRoomAvailability(
      roomTypeId, 
      checkInDate, 
      checkOutDate, 
      rooms,
      false // Not a cancellation
    );

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
    // Using a more specific type instead of any
    const bookings = await prisma.booking.findMany({
      where: whereClause as Record<string, unknown>,
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
