import { prisma } from './prisma';

/**
 * Utility function to safely execute raw SQL queries
 * avoiding any potential references to non-existent fields
 */
export async function safeQuery(query: string, ...params: any[]) {
  try {
    // Using $queryRawUnsafe to support parameterized queries more flexibly
    const result = await prisma.$queryRawUnsafe(query, ...params);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Error executing safe query:', error);
    return [];
  }
}

/**
 * Calculate room availability based on bookings instead of relying on schema fields
 */
export async function calculateRoomAvailability(
  roomTypeId: string, 
  checkIn: Date, 
  checkOut: Date
) {
  try {
    // Query room availability records
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
    
    const availabilityRecords = await safeQuery(query, roomTypeId, checkIn, checkOut);
    
    if (availabilityRecords.length === 0) {
      // If no availability records, fall back to room type total rooms
      const roomTypeQuery = `
        SELECT "totalRooms"
        FROM room_types
        WHERE id = $1
      `;
      
      const roomTypeData = await safeQuery(roomTypeQuery, roomTypeId);
      const totalRooms = roomTypeData.length > 0 ? roomTypeData[0].totalRooms : 0;
      
      // Check for bookings in this date range
      const bookingsQuery = `
        SELECT COUNT(*) as booked_count
        FROM bookings
        WHERE "roomTypeId" = $1
          AND "checkIn" < $3
          AND "checkOut" > $2
          AND status NOT IN ('CANCELLED', 'NO_SHOW')
      `;
      
      const bookingData = await safeQuery(bookingsQuery, roomTypeId, checkIn, checkOut);
      const bookedRooms = bookingData.length > 0 ? parseInt(bookingData[0].booked_count) : 0;
      
      return {
        totalRooms,
        availableRooms: Math.max(0, totalRooms - bookedRooms)
      };
    }
    
    // Find max booked rooms across all dates
    let maxBookedRooms = 0;
    let totalRooms = 0;
    
    availabilityRecords.forEach(record => {
      if (record.bookedRooms > maxBookedRooms) {
        maxBookedRooms = record.bookedRooms;
      }
      if (record.totalRooms > totalRooms) {
        totalRooms = record.totalRooms;
      }
    });
    
    return {
      totalRooms,
      availableRooms: Math.max(0, totalRooms - maxBookedRooms)
    };
  } catch (error) {
    console.error('Error calculating room availability:', error);
    return {
      totalRooms: 0,
      availableRooms: 0
    };
  }
}
