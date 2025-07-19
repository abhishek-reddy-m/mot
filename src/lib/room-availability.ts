import { prisma } from '@/lib/prisma';

/**
 * Gets the available rooms for a specific room type on a specific date range
 */
export async function getAvailableRooms(
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date
): Promise<number> {
  // Fetch the room type to get total rooms
  const roomType = await prisma.roomType.findUnique({
    where: { id: roomTypeId }
  });
  
  if (!roomType) {
    throw new Error(`Room type with ID ${roomTypeId} not found`);
  }
  
  // Generate the date range
  const dateRange = getDateRange(checkIn, checkOut);
  
  // Get all availability records for this room type and date range
  const availabilityRecords = await prisma.roomAvailability.findMany({
    where: {
      roomTypeId,
      date: {
        gte: checkIn,
        lt: checkOut
      }
    }
  });
  
  // Find the maximum number of booked rooms for any date in the range
  let maxBookedRooms = 0;
  
  for (const date of dateRange) {
    const dateStr = date.toISOString().split('T')[0];
    
    // Find the record for this date
    const record = availabilityRecords.find(
      r => new Date(r.date).toISOString().split('T')[0] === dateStr
    );
    
    // If a record exists, use its bookedRooms value, otherwise use 0 (no bookings)
    const bookedRoomsForDate = record ? record.bookedRooms : 0;
    
    // Update max booked rooms if this date has more
    maxBookedRooms = Math.max(maxBookedRooms, bookedRoomsForDate);
  }
  
  // Calculate available rooms
  return Math.max(0, roomType.totalRooms - maxBookedRooms);
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
  // Get the room type to ensure it exists and get total rooms
  const roomType = await prisma.roomType.findUnique({
    where: { id: roomTypeId }
  });
  
  if (!roomType) {
    throw new Error(`Room type with ID ${roomTypeId} not found`);
  }
  
  // Generate all dates in the booking range
  const dateRange = getDateRange(checkIn, checkOut);
  
  // For each date in the booking range, update the availability
  for (const date of dateRange) {
    // Try to find an existing record for this room type and date
    let availabilityRecord = await prisma.roomAvailability.findFirst({
      where: {
        roomTypeId,
        date: {
          equals: date
        }
      }
    });
    
    if (availabilityRecord) {
      // Update existing record
      await prisma.roomAvailability.update({
        where: { id: availabilityRecord.id },
        data: {
          // Increase or decrease booked rooms based on whether this is a cancellation
          bookedRooms: isCancel
            ? Math.max(0, availabilityRecord.bookedRooms - roomCount)
            : availabilityRecord.bookedRooms + roomCount,
          updatedAt: new Date()
        }
      });
    } else if (!isCancel) {
      // Only create a new record if this is not a cancellation
      await prisma.roomAvailability.create({
        data: {
          roomTypeId,
          date,
          totalRooms: roomType.totalRooms,
          bookedRooms: roomCount, // Initial booking count
          updatedAt: new Date()
        }
      });
    }
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
