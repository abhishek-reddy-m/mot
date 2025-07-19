import { NextRequest, NextResponse } from 'next/server';
import { safeQuery } from '@/lib/db-utils';
import { getAvailableRooms } from '@/lib/room-availability';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Check room availability for a specific date range
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const roomTypeId = searchParams.get('roomTypeId');
    const checkInParam = searchParams.get('checkIn');
    const checkOutParam = searchParams.get('checkOut');
    
    if (!roomTypeId || !checkInParam || !checkOutParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: roomTypeId, checkIn, checkOut' },
        { status: 400 }
      );
    }
    
    // Parse dates
    const checkIn = new Date(`${checkInParam}T12:00:00Z`);
    const checkOut = new Date(`${checkOutParam}T12:00:00Z`);
    
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    
    // Get room availability
    const availableRooms = await getAvailableRooms(roomTypeId, checkIn, checkOut);
    
    // Fallback to room type if getAvailableRooms fails
    if (availableRooms === undefined || availableRooms === null) {
      const roomTypeQuery = `
        SELECT "totalRooms"
        FROM room_types
        WHERE id = $1
      `;
      
      const roomTypeData = await safeQuery(roomTypeQuery, roomTypeId);
      const totalRooms = roomTypeData.length > 0 ? parseInt(roomTypeData[0].totalRooms) : 0;
      
      // Check existing bookings in this date range
      const bookingsQuery = `
        SELECT SUM(rooms) as booked_rooms
        FROM bookings
        WHERE "roomTypeId" = $1
          AND "checkIn" < $3
          AND "checkOut" > $2
          AND status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
      `;
      
      const bookingsData = await safeQuery(bookingsQuery, roomTypeId, checkIn, checkOut);
      const bookedRooms = bookingsData.length > 0 ? parseInt(bookingsData[0].booked_rooms || '0') : 0;
      
      return NextResponse.json({
        roomTypeId,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        totalRooms,
        bookedRooms,
        availableRooms: Math.max(0, totalRooms - bookedRooms)
      });
    }
    
    // Return availability info
    return NextResponse.json({
      roomTypeId,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      availableRooms
    });
  } catch (error) {
    console.error('Error checking room availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create a new booking with robust error handling
 */
export async function POST(request: NextRequest) {
  try {
    // Get the user from session
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const body = await request.json();
    
    // Extract and validate booking details
    const {
      propertyId,
      roomTypeId,
      checkIn: checkInStr,
      checkOut: checkOutStr,
      guestName,
      guests,
      rooms,
      totalPrice
    } = body;
    
    // Validate required fields
    if (!propertyId || !roomTypeId || !checkInStr || !checkOutStr || !guests || !rooms || !totalPrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Parse dates
    const checkIn = new Date(`${checkInStr}T12:00:00Z`);
    const checkOut = new Date(`${checkOutStr}T12:00:00Z`);
    
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    
    // Validate check-in and check-out dates
    if (checkIn >= checkOut) {
      return NextResponse.json(
        { error: 'Check-in date must be before check-out date.' },
        { status: 400 }
      );
    }
    
    // Check if there are enough available rooms
    const availableRooms = await getAvailableRooms(roomTypeId, checkIn, checkOut);
    
    if (availableRooms < rooms) {
      return NextResponse.json(
        { error: `Not enough rooms available. Only ${availableRooms} rooms available.` },
        { status: 400 }
      );
    }
    
    // Create booking
    try {
      // Get user information for guest name if not provided
      let userFullName = '';
      try {
        const userInfo = await prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true }
        });
        
        if (userInfo) {
          userFullName = `${userInfo.firstName} ${userInfo.lastName}`;
        }
      } catch (error) {
        console.warn('Could not fetch user details:', error);
      }
      
      const booking = await prisma.booking.create({
        data: {
          userId,
          propertyId,
          roomTypeId,
          checkIn,
          checkOut,
          guests: parseInt(guests.toString()),
          rooms: parseInt(rooms.toString()),
          totalPrice: parseFloat(totalPrice.toString()),
          status: 'PENDING',
          // Use guestName if provided, otherwise use user's name from the database
          ...(guestName ? { guestName } : userFullName ? { guestName: userFullName } : {})
        }
      });
      
      // Update room availability
      try {
        // Use raw SQL update instead of ORM function
        for (let date = new Date(checkIn); date < checkOut; date.setDate(date.getDate() + 1)) {
          const dateStr = date.toISOString().split('T')[0];
          
          // Check if a record exists
          const existingRecord = await safeQuery(`
            SELECT id, "bookedRooms" FROM room_availabilities
            WHERE "roomTypeId" = $1 AND date = $2::date
            LIMIT 1
          `, roomTypeId, dateStr);
          
          if (existingRecord && existingRecord.length > 0) {
            // Update existing record
            await safeQuery(`
              UPDATE room_availabilities
              SET "bookedRooms" = "bookedRooms" + $1, "updatedAt" = $2
              WHERE id = $3
            `, rooms, new Date(), existingRecord[0].id);
          } else {
            // Get total rooms for this room type
            const roomTypeData = await safeQuery(`
              SELECT "totalRooms" FROM room_types WHERE id = $1
            `, roomTypeId);
            
            const totalRooms = roomTypeData.length > 0 ? parseInt(roomTypeData[0].totalRooms) : 0;
            
            // Create new record
            await safeQuery(`
              INSERT INTO room_availabilities ("roomTypeId", date, "totalRooms", "bookedRooms", "updatedAt")
              VALUES ($1, $2::date, $3, $4, $5)
            `, roomTypeId, dateStr, totalRooms, rooms, new Date());
          }
        }
      } catch (error) {
        console.warn('Failed to update room availability - table may not exist:', error);
        // Continue with booking creation even if availability update fails
      }
      
      return NextResponse.json({ success: true, booking });
    } catch (error) {
      console.error('Error creating booking:', error);
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing booking request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
