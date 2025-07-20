import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get('propertyId');
    const checkInParam = searchParams.get('checkIn');
    const checkOutParam = searchParams.get('checkOut');
    const guestsParam = searchParams.get('guests');
    
    // Parse search parameters with proper date handling
    let checkIn: Date | null = null;
    let checkOut: Date | null = null;
    
    if (checkInParam) {
      // Remove any cache-busting query params that might have been added
      const cleanCheckInParam = checkInParam.split('?')[0].trim();
      
      // Ensure the date is in YYYY-MM-DD format and set to noon UTC to avoid timezone issues
      checkIn = new Date(`${cleanCheckInParam}T12:00:00Z`);
      
      // Validate date is valid
      if (isNaN(checkIn.getTime())) {
        console.error(`Invalid check-in date format: ${cleanCheckInParam}`);
        checkIn = null;
      } else {
        console.log(`Using check-in date: ${cleanCheckInParam} (${checkIn.toISOString()})`);
      }
    }
    
    if (checkOutParam) {
      // Ensure the date is in YYYY-MM-DD format and set to noon UTC to avoid timezone issues
      const checkOutStr = checkOutParam.trim();
      checkOut = new Date(`${checkOutStr}T12:00:00Z`);
      
      // Validate date is valid
      if (isNaN(checkOut.getTime())) {
        console.error(`Invalid check-out date format: ${checkOutParam}`);
        checkOut = null;
      }
    }
    
    // If dates are valid, log them
    if (checkIn && checkOut) {
      if (checkIn >= checkOut) {
        console.warn('Check-in date must be before check-out date. Ignoring date filters.');
        checkIn = null;
        checkOut = null;
      }
    }
    
    const guests = guestsParam ? parseInt(guestsParam, 10) : null;
    
    console.log('Search parameters:', { 
      propertyId, 
      checkIn: checkIn?.toISOString(), 
      checkOut: checkOut?.toISOString(), 
      guests 
    });
    
    // Build the base query
    const whereClause: any = {
      isActive: true,
    };
    
    // Filter by specific property if provided
    if (propertyId) {
      whereClause.id = propertyId;
    }
    
    // Get properties with their room types - FIXED VERSION WITHOUT availableRooms
    const properties = await prisma.property.findMany({
      where: whereClause,
      include: {
        photos: {
          where: { isMain: true },
          take: 1,
        },
        roomTypes: {
          where: { 
            isActive: true,
            // If guests filter is provided, only include room types that can accommodate
            ...(guests ? { capacity: { gte: guests } } : {}),
          },
          include: {
            photos: {
              where: { isMain: true },
              take: 1,
            },
          },
        },
      },
    });

    // Helper function to get dates in a range
    function getDateRange(start: Date, end: Date): Date[] {
      const dateRange: Date[] = [];
      const currentDate = new Date(start);
      
      // Normalize to start of day in UTC
      currentDate.setUTCHours(12, 0, 0, 0);
      
      // Get end date normalized to UTC noon as well for consistent comparison
      const endDateNorm = new Date(end);
      endDateNorm.setUTCHours(12, 0, 0, 0);
      
      console.log(`Getting date range from ${currentDate.toISOString()} to ${endDateNorm.toISOString()}`);
      
      while (currentDate < endDateNorm) {
        // Add a copy of the date to avoid reference issues
        dateRange.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`Generated ${dateRange.length} dates in range`);
      
      // Safety check for empty ranges or invalid dates
      if (dateRange.length === 0 && start < end) {
        console.log("Empty date range detected despite valid start/end - adding single date as fallback");
        dateRange.push(new Date(start));
      }
      
      return dateRange;
    }
    
    // Get room availability data for the requested date range if dates are provided
    let roomTypeAvailability: Record<string, Record<string, number>> = {};
    
    if (checkIn && checkOut) {
      const dateRange = getDateRange(checkIn, checkOut);
      
      // Get all room type IDs from properties
      const roomTypeIds = properties.flatMap(p => 
        p.roomTypes.map(rt => rt.id)
      );
      
      if (roomTypeIds.length > 0) {
        // Fetch room availability records for all relevant room types and dates
        const availabilityRecords = await prisma.roomAvailability.findMany({
          where: {
            roomTypeId: { in: roomTypeIds },
            date: {
              gte: checkIn,
              lt: checkOut
            }
          }
        });
        
        console.log(`Found ${availabilityRecords.length} availability records for requested date range`);
        
        // Organize availability data by room type and date
        roomTypeAvailability = {};
        
        // Initialize the data structure for all room types and dates
        for (const roomTypeId of roomTypeIds) {
          roomTypeAvailability[roomTypeId] = {};
          
          // For each date in range, initialize with 0 booked rooms (will be updated if records exist)
          for (const date of dateRange) {
            const dateStr = date.toISOString().split('T')[0];
            roomTypeAvailability[roomTypeId][dateStr] = 0;
          }
        }
        
        // Fill in actual booked rooms data where we have records
        for (const record of availabilityRecords) {
          const roomTypeId = record.roomTypeId;
          const dateStr = new Date(record.date).toISOString().split('T')[0];
          
          // Only set value if the room type and date are in our initialized structure
          if (roomTypeAvailability[roomTypeId] && dateRange.some(d => 
            d.toISOString().split('T')[0] === dateStr
          )) {
            roomTypeAvailability[roomTypeId][dateStr] = record.bookedRooms;
          }
        }
      }
    }
    
    // Transform the response to include real-time availability information
    const propertiesWithAvailability = properties.map(property => {
      // Calculate total and available rooms
      let totalRooms = 0;
      let realAvailableRooms = 0;
      let lowestPrice: number | null = null;
      
      // Filter room types based on availability for the selected dates
      const availableRoomTypes = property.roomTypes.filter(roomType => {
        if (!checkIn || !checkOut) {
          // If no dates selected, include all room types but set default availability
          (roomType as any).availableRooms = roomType.totalRooms;
          return true; // If no dates selected, include all room types
        }
        
        console.log(`\nChecking availability for property ${property.name}, room type ${roomType.name} (${roomType.id})`);
        
        // Calculate maximum bookings for this room type across the date range
        let maxBookedRooms = 0;
        
        // Get the date range
        const dateRange = getDateRange(checkIn, checkOut);
        
        // Find the maximum number of booked rooms for any date in the range
        for (const date of dateRange) {
          const dateStr = date.toISOString().split('T')[0];
          
          // Get the booked rooms for this room type on this date
          // Default to 0 if no record exists (means no bookings)
          const bookedRoomsForDate = roomTypeAvailability[roomType.id]?.[dateStr] || 0;
          
          // Keep track of the maximum number of booked rooms
          maxBookedRooms = Math.max(maxBookedRooms, bookedRoomsForDate);
          console.log(`Date ${dateStr}: ${bookedRoomsForDate} rooms booked`);
        }
        
        console.log(`Maximum booked rooms for any date: ${maxBookedRooms}`);
        
        // Check if there's availability for the entire date range
        const realAvailable = Math.max(0, roomType.totalRooms - maxBookedRooms);
        
                // Detailed logging to understand the availability calculation
        console.log(`Property: ${property.name}, Room Type: ${roomType.name}`);
        console.log(`Total rooms configured: ${roomType.totalRooms}`);
        console.log(`Max booked rooms for any date: ${maxBookedRooms}`);
        console.log(`Real available rooms: ${realAvailable}`);
        console.log(`Is available: ${realAvailable > 0 ? 'YES' : 'NO'}`);
        
        // Store calculated availability on the roomType object for use later
        (roomType as any).calculatedAvailableRooms = realAvailable;
        // Add the availableRooms property dynamically since it doesn't exist in the DB schema
        (roomType as any).availableRooms = realAvailable;
        
        return realAvailable > 0;
      });
      
      // Recalculate totals with only available room types
      availableRoomTypes.forEach(roomType => {
        totalRooms += roomType.totalRooms;
        // Use the calculated available rooms from earlier
        // We use the dynamic property we added earlier
        realAvailableRooms += (roomType as any).availableRooms || 0;
        
        // Track lowest price
        const basePrice = Number(roomType.basePrice);
        if (lowestPrice === null || basePrice < lowestPrice) {
          lowestPrice = basePrice;
        }
      });
      
      return {
        id: property.id,
        name: property.name,
        description: property.description,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        mainPhoto: property.photos[0]?.url || null,
        totalRooms,
        availableRooms: realAvailableRooms,
        lowestPrice,
        roomTypeCount: availableRoomTypes.length,
        hasAvailability: realAvailableRooms > 0
      };
    });

    console.log(`Returning ${propertiesWithAvailability.length} properties with availability`);
    propertiesWithAvailability.forEach(p => {
      console.log(`Property ${p.name}: ${p.availableRooms}/${p.totalRooms} rooms available, ${p.roomTypeCount} room types available`);
    });
    
    return NextResponse.json(propertiesWithAvailability);
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
