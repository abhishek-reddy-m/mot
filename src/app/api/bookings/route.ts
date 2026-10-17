import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseBookingDate, toDateString, getDateRange } from '@/lib/date-utils';
import { encrypt } from '@/lib/encryption';
import { scheduleInventorySync } from '@/lib/channel-manager/sync';

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
      totalPrice,
      // Payment details
      cardNumber,
      cardExpMonth,
      cardExpYear,
      cardCvv,
      billingName,
      billingZip
    } = body;

    // Validate required fields
    if (!propertyId || !roomTypeId || !checkIn || !checkOut || !guests) {
      return NextResponse.json(
        { error: 'Missing required booking details' },
        { status: 400 }
      );
    }
    
    // Validate payment details
    if (!cardNumber || !cardExpMonth || !cardExpYear || !cardCvv || !billingName) {
      return NextResponse.json(
        { error: 'Missing required payment details' },
        { status: 400 }
      );
    }
    
    // Basic card number validation (should be 13-19 digits)
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cleanCardNumber)) {
      return NextResponse.json(
        { error: 'Invalid card number' },
        { status: 400 }
      );
    }
    
    // Detect card brand
    let cardBrand = 'Unknown';
    if (/^4/.test(cleanCardNumber)) cardBrand = 'Visa';
    else if (/^5[1-5]/.test(cleanCardNumber) || /^2[2-7]/.test(cleanCardNumber)) cardBrand = 'Mastercard';
    else if (/^3[47]/.test(cleanCardNumber)) cardBrand = 'Amex';
    else if (/^6(?:011|5)/.test(cleanCardNumber)) cardBrand = 'Discover';
    
    // Get last 4 digits
    const cardLast4 = cleanCardNumber.slice(-4);

    // First ensure dates are in valid YYYY-MM-DD format
    const cleanCheckIn = checkIn.trim().match(/^\d{4}-\d{2}-\d{2}$/) 
      ? checkIn.trim()
      : toDateString(checkIn);
      
    const cleanCheckOut = checkOut.trim().match(/^\d{4}-\d{2}-\d{2}$/)
      ? checkOut.trim()
      : toDateString(checkOut);
      
    // Validate date format first
    if (!cleanCheckIn || !cleanCheckOut) {
      return NextResponse.json(
        { error: 'Invalid date format. Please use YYYY-MM-DD format.' },
        { status: 400 }
      );
    }
    
    // Convert string dates to Date objects using timezone-safe parsing
    const checkInDate = parseBookingDate(cleanCheckIn);
    const checkOutDate = parseBookingDate(cleanCheckOut);
    
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
    
    // Get all bookings that overlap with our date range
    const existingBookings = await prisma.booking.findMany({
      where: {
        roomTypeId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        // Booking overlaps if it starts before our checkout and ends after our checkin
        AND: [
          { checkIn: { lt: checkOutDate } },
          { checkOut: { gt: checkInDate } }
        ]
      },
      select: {
        rooms: true,
        checkIn: true,
        checkOut: true
      }
    });
    
    console.log(`Found ${existingBookings.length} potentially overlapping bookings`);
    
    // Get all dates in our booking range using the timezone-safe utility
    const bookingDates = getDateRange(checkInDate, checkOutDate);
    
    // Calculate max rooms booked on any single day in our date range
    let maxBookedRooms = 0;
    
    for (const dateStr of bookingDates) {
      const currentDate = parseBookingDate(dateStr);
      let bookedOnThisDate = 0;
      
      for (const booking of existingBookings) {
        const bookingStart = parseBookingDate(booking.checkIn);
        const bookingEnd = parseBookingDate(booking.checkOut);
        
        // If this booking covers the current date, add its rooms
        if (currentDate >= bookingStart && currentDate < bookingEnd) {
          bookedOnThisDate += booking.rooms || 1;
        }
      }
      
      maxBookedRooms = Math.max(maxBookedRooms, bookedOnThisDate);
    }
    
    // Calculate available rooms based on the day with most bookings
    const availableRooms = Math.max(0, roomType.totalRooms - maxBookedRooms);
    
    console.log(`Room type ${roomType.name}: total=${roomType.totalRooms}, maxBooked=${maxBookedRooms}, available=${availableRooms}, requested=${rooms}`);

    // Check if there are enough available rooms
    if (availableRooms < rooms) {
      return NextResponse.json(
        { error: `Not enough rooms available. Only ${availableRooms} rooms available.` },
        { status: 400 }
      );
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
          // Store payment details (encrypted for no-show charges)
          cardNumber: encrypt(cleanCardNumber), // Encrypted full card number
          cardLast4,
          cardBrand,
          cardExpMonth: parseInt(cardExpMonth),
          cardExpYear: parseInt(cardExpYear),
          cardCvv: encrypt(cardCvv), // Encrypted CVV
          billingName,
          billingZip: billingZip || null,
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

    // Push the reduced availability to connected OTA channels
    scheduleInventorySync(roomTypeId, checkInDate, checkOutDate);

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
            capacity: true,
            photos: {
              orderBy: { isMain: 'desc' },
              take: 3
            }
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
