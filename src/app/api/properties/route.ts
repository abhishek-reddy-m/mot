import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAvailableRooms } from '@/lib/room-availability';

// Fixed database schema error - force rebuild for Render deployment
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

    // Transform the response to include real-time availability information
    const propertiesWithAvailability = await Promise.all(properties.map(async (property) => {
      // Track overall availability and pricing
      let totalRooms = 0;
      let totalAvailableRooms = 0;
      let lowestPrice: number | null = null;
      
      // If we have valid dates, calculate date-specific availability for each room type
      if (checkIn && checkOut) {
        console.log(`Calculating date-specific availability for property ${property.name}`);
        
        // Calculate availability for each room type using the same utility function
        // that the property details page uses
        for (const roomType of property.roomTypes) {
          try {
            // Calculate available rooms for this room type - using min rooms across the entire stay
            // This matches the logic in the property details page
            const { availableRooms, availabilityByDate } = await getAvailableRooms(roomType.id, checkIn, checkOut);
            console.log(`Room type ${roomType.name}: Total=${roomType.totalRooms}, Available=${availableRooms}`);
            
            // Add calculated availability to the room type
            (roomType as any).calculatedAvailableRooms = availableRooms;
            (roomType as any).availableRooms = availableRooms;
            (roomType as any).availabilityByDate = availabilityByDate;
            
            // Sum overall availability
            totalRooms += roomType.totalRooms;
            totalAvailableRooms += availableRooms;
            
            // Track lowest price
            const basePrice = Number(roomType.basePrice);
            if (lowestPrice === null || basePrice < lowestPrice) {
              lowestPrice = basePrice;
            }
          } catch (error) {
            console.error(`Error calculating availability for room type ${roomType.name}:`, error);
            (roomType as any).calculatedAvailableRooms = 0;
            (roomType as any).availableRooms = 0;
          }
        }
      } else {
        // Use static total rooms when no dates provided for consistency
        for (const roomType of property.roomTypes) {
          const total = roomType.totalRooms;
          (roomType as any).availableRooms = total;
          totalRooms += total;
          totalAvailableRooms += total;
          
          const basePrice = Number(roomType.basePrice);
          if (lowestPrice === null || basePrice < lowestPrice) {
            lowestPrice = basePrice;
          }
        }
      }
      
      // Return aggregated availability
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
        availableRooms: totalAvailableRooms,
        lowestPrice,
        roomTypeCount: property.roomTypes.filter(rt => (rt as any).availableRooms > 0).length,
        hasAvailability: totalAvailableRooms > 0
      };
    }));

    console.log(`Returning ${propertiesWithAvailability.length} properties with availability`);
    propertiesWithAvailability.forEach(p => {
      console.log(`Property ${p.name}: ${p.availableRooms}/${p.totalRooms} total rooms available (across ${p.roomTypeCount} room types)`);
    });
    
    return NextResponse.json(propertiesWithAvailability, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      }
    );
  }
}
