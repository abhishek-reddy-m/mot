import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAvailableRooms } from '@/lib/room-availability';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    // Await params before accessing properties
    const { propertyId } = await params;

    // Get search parameters for date-specific availability
    const searchParams = request.nextUrl.searchParams;
    const checkInParam = searchParams.get('checkIn');
    const checkOutParam = searchParams.get('checkOut');
    const guestsParam = searchParams.get('guests');
    
    // Parse search parameters with proper date handling
    let checkIn: Date | null = null;
    let checkOut: Date | null = null;
    
    // Process check-in date if provided
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
    
    // Process check-out date if provided
    if (checkOutParam) {
      // Ensure the date is in YYYY-MM-DD format and set to noon UTC to avoid timezone issues
      const checkOutStr = checkOutParam.trim();
      checkOut = new Date(`${checkOutStr}T12:00:00Z`);
      
      // Validate date is valid
      if (isNaN(checkOut.getTime())) {
        console.error(`Invalid check-out date format: ${checkOutParam}`);
        checkOut = null;
      } else {
        console.log(`Using check-out date: ${checkOutStr} (${checkOut.toISOString()})`);
      }
    }
    
    // If dates are valid, validate them
    if (checkIn && checkOut) {
      if (checkIn >= checkOut) {
        console.warn('Check-in date must be before check-out date. Ignoring date filters.');
        checkIn = null;
        checkOut = null;
      }
    }
    
    // Get property with all related data
    const property = await prisma.property.findUnique({
      where: {
        id: propertyId,
        isActive: true,
      },
      include: {
        photos: true,
        roomTypes: {
          where: { isActive: true },
          include: {
            photos: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // If we have valid dates, calculate date-specific availability for each room type
    if (checkIn && checkOut) {
      console.log(`Calculating date-specific availability for property ${property.name}`);
      
      // Process each room type to calculate real-time availability
      for (const roomType of property.roomTypes) {
        try {
          // Use the utility function to calculate available rooms
          const { availableRooms, availabilityByDate } = await getAvailableRooms(roomType.id, checkIn, checkOut);
          
          console.log(`Room type ${roomType.name}: Total=${roomType.totalRooms}, Available=${availableRooms}`);
          
          // Add calculated availability to the room type
          (roomType as any).calculatedAvailableRooms = availableRooms;
          (roomType as any).availabilityByDate = availabilityByDate;
        } catch (error) {
          console.error(`Error calculating availability for room type ${roomType.name}:`, error);
          // Default to 0 available rooms if there's an error
          (roomType as any).calculatedAvailableRooms = 0;
          (roomType as any).availabilityByDate = {};
        }
      }
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
