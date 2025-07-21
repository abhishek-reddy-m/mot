import { prisma } from '@/lib/prisma';
import { safeQuery } from '@/lib/db-utils';

/**
 * Calculate the maximum number of booked rooms for any single day in a date range
 * This ensures we don't overbook even when bookings overlap in complex ways
 */
async function calculateMaxBookedRoomsInRange(
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date
): Promise<{ maxBookedRooms: number, bookedRoomsByDate: Map<string, number> }> {
  try {
    // Get all bookings that overlap with our date range
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        roomTypeId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        // Booking overlaps if it starts before our end and ends after our start
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn }
      },
      select: {
        checkIn: true,
        checkOut: true,
        rooms: true
      }
    });

    if (overlappingBookings.length === 0) {
      return { maxBookedRooms: 0, bookedRoomsByDate: new Map() };
    }

    // Generate all dates in our range
    const dateRange = getDateRange(checkIn, checkOut);
    let maxBookedRooms = 0;
    const bookedRoomsByDate = new Map<string, number>();

    // For each date in our range, calculate how many rooms are booked
    for (const date of dateRange) {
      let bookedRoomsOnDate = 0;
      const currentDate = new Date(date);
      currentDate.setUTCHours(0, 0, 0, 0);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Check each overlapping booking to see if it covers this date
      for (const booking of overlappingBookings) {
        const bookingStart = new Date(booking.checkIn);
        const bookingEnd = new Date(booking.checkOut);
        
        // Normalize all dates to start of day for consistent comparison
        bookingStart.setUTCHours(0, 0, 0, 0);
        bookingEnd.setUTCHours(0, 0, 0, 0);
        
        // If this booking covers the current date, add its rooms
        if (currentDate >= bookingStart && currentDate < bookingEnd) {
          bookedRoomsOnDate += booking.rooms;
        }
      }
      
      // Store booked rooms for this specific date
      bookedRoomsByDate.set(dateStr, bookedRoomsOnDate);
      
      // Track the maximum rooms booked on any single day
      maxBookedRooms = Math.max(maxBookedRooms, bookedRoomsOnDate);
    }

    return { maxBookedRooms, bookedRoomsByDate };
  } catch (error) {
    console.error('Error calculating max booked rooms:', error);
    return { maxBookedRooms: 0, bookedRoomsByDate: new Map() };
  }
}

/**
 * Gets the available rooms for a specific room type on a specific date range
 * Calculates availability based on overlapping bookings for the exact date range
 */
export async function getAvailableRooms(
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date
): Promise<{ availableRooms: number, availabilityByDate: { [key: string]: number } }> {
  try {
    // Get room type information
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId }
    });
    
    if (!roomType) {
      console.error(`Room type with ID ${roomTypeId} not found`);
      return { availableRooms: 0, availabilityByDate: {} };
    }
    
    // Get availability records using raw SQL query for compatibility
    const query = `
      SELECT 
        "roomTypeId",
        date,
        "totalRooms",
        "bookedRooms"
      FROM room_availabilities
      WHERE "roomTypeId" = $1
        AND date >= $2
        AND date < $3
    `;
    
    const availabilityRecords = await safeQuery(
      query, 
      roomTypeId, 
      new Date(checkIn.toISOString().split('T')[0]),
      new Date(checkOut.toISOString().split('T')[0])
    );
    
    // Calculate the booked rooms for each day in the date range from existing bookings
    const { maxBookedRooms, bookedRoomsByDate } = await calculateMaxBookedRoomsInRange(roomTypeId, checkIn, checkOut);
    
    // Convert Map to an object for easier consumption in the frontend
    const availabilityByDate: { [key: string]: number } = {};
    bookedRoomsByDate.forEach((bookedRooms, dateStr) => {
      availabilityByDate[dateStr] = Math.max(0, roomType.totalRooms - bookedRooms);
    });
    
    // Log detailed availability for debugging
    console.log(`Room type ${roomTypeId}: total rooms=${roomType.totalRooms}, max booked=${maxBookedRooms}`);
    Object.entries(availabilityByDate).forEach(([date, available]) => {
      console.log(`Date ${date}: ${available}/${roomType.totalRooms} available`);
    });
    
    // Return available rooms (total - max booked on any single day)
    // This ensures we can accommodate all nights of the stay
    return { 
      availableRooms: Math.max(0, roomType.totalRooms - maxBookedRooms),
      availabilityByDate
    };
  } catch (error) {
    console.error('Error getting available rooms:', error);
    return { availableRooms: 0, availabilityByDate: {} }; // Default to no rooms available on error
  }
}

/**
 * Updates room availability when a booking is created or updated
 */
export async function updateRoomAvailability(
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date,
  roomCount: number,
  isCancel: boolean = false
): Promise<void> {
  try {
    console.log(`updateRoomAvailability called: ${isCancel ? 'CANCEL' : 'BOOK'} ${roomCount} rooms from ${checkIn.toISOString().split('T')[0]} to ${checkOut.toISOString().split('T')[0]}`);
    
    // Get the room type to ensure it exists and get total rooms
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId }
    });
    
    if (!roomType) {
      throw new Error(`Room type with ID ${roomTypeId} not found`);
    }
    
    // Generate all dates in the booking range
    const dateRange = getDateRange(checkIn, checkOut);
    
    // For each date in the booking range, update the availability using raw queries
    for (const date of dateRange) {
      try {
        const dateStr = date.toISOString().split('T')[0];
        console.log(`Processing date: ${dateStr}`);
        
        if (isCancel) {
          // For cancellations, decrease booked rooms
          const updateQuery = `
            UPDATE room_availabilities 
            SET "bookedRooms" = GREATEST(0, "bookedRooms" - $1), "updatedAt" = NOW()
            WHERE "roomTypeId" = $2 AND date = $3
          `;
          await safeQuery(updateQuery, roomCount, roomTypeId, date);
          console.log(`Decreased booked rooms by ${roomCount} for ${dateStr}`);
        } else {
          // For bookings, use INSERT ... ON CONFLICT to handle both new and existing records
          const upsertQuery = `
            INSERT INTO room_availabilities ("roomTypeId", date, "totalRooms", "bookedRooms", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT ("roomTypeId", date) 
            DO UPDATE SET 
              "bookedRooms" = room_availabilities."bookedRooms" + $4,
              "updatedAt" = NOW()
            RETURNING "bookedRooms"
          `;
          const result = await safeQuery(upsertQuery, roomTypeId, date, roomType.totalRooms, roomCount);
          
          if (result && result.length > 0) {
            console.log(`Upserted availability record, now at ${result[0].bookedRooms} booked rooms for ${dateStr}`);
          } else {
            console.log(`Upserted availability record, added ${roomCount} booked rooms for ${dateStr}`);
          }
        }
      } catch (error) {
        console.error(`Error processing date ${date.toISOString().split('T')[0]}:`, error);
      }
    }
    
    console.log(`updateRoomAvailability completed for ${dateRange.length} dates`);
  } catch (error) {
    console.error('Error in updateRoomAvailability:', error);
  }
}

/**
 * Helper function to generate a range of dates
 */
export function getDateRange(start: Date, end: Date): Date[] {
  const dateRange: Date[] = [];
  const currentDate = new Date(start);
  
  // Normalize to noon UTC for consistent comparison
  currentDate.setUTCHours(12, 0, 0, 0);
  
  const endDateNorm = new Date(end);
  endDateNorm.setUTCHours(12, 0, 0, 0);
  
  while (currentDate < endDateNorm) {
    dateRange.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dateRange;
}
