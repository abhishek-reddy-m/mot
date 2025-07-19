import { prisma } from '@/lib/prisma';
import { safeQuery } from '@/lib/db-utils';

/**
 * Gets the available rooms for a specific room type on a specific date range
 * with fallback options for production environment
 */
export async function getAvailableRooms(
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date
): Promise<number> {
  try {
    // Try using Prisma first to get room type
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId }
    });
    
    if (!roomType) {
      // Fallback to raw query if Prisma fails
      const roomTypeQuery = `SELECT "totalRooms" FROM room_types WHERE id = $1`;
      const roomTypeData = await safeQuery(roomTypeQuery, roomTypeId);
      
      if (!roomTypeData || roomTypeData.length === 0) {
        console.error(`Room type with ID ${roomTypeId} not found`);
        return 0;
      }
      
      // Calculate availability using raw queries
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
      const totalRooms = parseInt(roomTypeData[0].totalRooms || '0');
      
      return Math.max(0, totalRooms - bookedRooms);
    }
    
    // Generate the date range
    const dateRange = getDateRange(checkIn, checkOut);
    
    // Check if room_availability table exists
    try {
      // Try to get availability records
      const availabilityQuery = `
        SELECT date, "bookedRooms" 
        FROM room_availabilities
        WHERE "roomTypeId" = $1
          AND date >= $2
          AND date < $3
      `;
      
      const availabilityRecords = await safeQuery(availabilityQuery, roomTypeId, checkIn, checkOut);
      
      // Find the maximum number of booked rooms for any date in the range
      let maxBookedRooms = 0;
      
      for (const date of dateRange) {
        const dateStr = date.toISOString().split('T')[0];
        
        // Find the record for this date
        const record = availabilityRecords.find(
          (r: any) => new Date(r.date).toISOString().split('T')[0] === dateStr
        );
        
        // If a record exists, use its bookedRooms value, otherwise use 0 (no bookings)
        const bookedRoomsForDate = record ? parseInt(record.bookedRooms || '0') : 0;
        
        // Update max booked rooms if this date has more
        maxBookedRooms = Math.max(maxBookedRooms, bookedRoomsForDate);
      }
      
      // Calculate available rooms
      return Math.max(0, roomType.totalRooms - maxBookedRooms);
    } catch (error) {
      // Fallback if room_availabilities table doesn't exist
      // Calculate based on bookings directly
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
      
      return Math.max(0, roomType.totalRooms - bookedRooms);
    }
  } catch (error) {
    console.error('Error getting available rooms:', error);
    return 0; // Default to no rooms available on error
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
    // Get the room type to ensure it exists and get total rooms
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId }
    });
    
    if (!roomType) {
      throw new Error(`Room type with ID ${roomTypeId} not found`);
    }
    
    // Generate all dates in the booking range
    const dateRange = getDateRange(checkIn, checkOut);
    
    // Check if room_availability table exists
    try {
      // For each date in the booking range, update the availability
      for (const date of dateRange) {
        // Try to find an existing record for this room type and date
        const findQuery = `
          SELECT id, "bookedRooms" 
          FROM room_availabilities
          WHERE "roomTypeId" = $1 AND date = $2
          LIMIT 1
        `;
        
        const records = await safeQuery(findQuery, roomTypeId, date);
        
        if (records && records.length > 0) {
          const availabilityRecord = records[0];
          // Update existing record
          const updateQuery = `
            UPDATE room_availabilities
            SET "bookedRooms" = $1, "updatedAt" = $2
            WHERE id = $3
          `;
          
          const newBookedRooms = isCancel
            ? Math.max(0, parseInt(availabilityRecord.bookedRooms || '0') - roomCount)
            : parseInt(availabilityRecord.bookedRooms || '0') + roomCount;
          
          await safeQuery(updateQuery, newBookedRooms, new Date(), availabilityRecord.id);
        } else if (!isCancel) {
          // Only create a new record if this is not a cancellation
          const insertQuery = `
            INSERT INTO room_availabilities ("roomTypeId", date, "totalRooms", "bookedRooms", "updatedAt")
            VALUES ($1, $2, $3, $4, $5)
          `;
          
          await safeQuery(
            insertQuery,
            roomTypeId,
            date,
            roomType.totalRooms,
            roomCount,
            new Date()
          );
        }
      }
    } catch (error) {
      // If room_availabilities table doesn't exist, log and ignore
      console.warn('Could not update room availability - table may not exist:', error);
    }
  } catch (error) {
    console.error('Error updating room availability:', error);
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
