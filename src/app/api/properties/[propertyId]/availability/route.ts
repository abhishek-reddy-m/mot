import { NextRequest, NextResponse } from 'next/server';
import { getAvailableRooms } from '@/lib/room-availability';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/properties/[propertyId]/availability
 * Real-time room availability for a specific property and date range
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    const checkInParam = searchParams.get('checkIn');
    const checkOutParam = searchParams.get('checkOut');
    
    if (!checkInParam || !checkOutParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: checkIn, checkOut' },
        { status: 400 }
      );
    }
    
    // Parse and validate dates
    const checkIn = new Date(`${checkInParam}T12:00:00Z`);
    const checkOut = new Date(`${checkOutParam}T12:00:00Z`);
    
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    
    if (checkIn >= checkOut) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }
    
    // Get all room types for this property
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        roomTypes: {
          where: { isActive: true },
          include: {
            photos: {
              where: { isMain: true },
              take: 1
            }
          }
        }
      }
    });
    
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }
    
    // Calculate availability for each room type
    const roomTypesWithAvailability = await Promise.all(
      property.roomTypes.map(async (roomType: any) => {
        const { availableRooms, availabilityByDate } = await getAvailableRooms(roomType.id, checkIn, checkOut);
        
        return {
          id: roomType.id,
          name: roomType.name,
          description: roomType.description,
          capacity: roomType.capacity,
          basePrice: roomType.basePrice,
          amenities: roomType.amenities,
          totalRooms: roomType.totalRooms,
          availableRooms,
          availabilityByDate,
          isAvailable: availableRooms > 0,
          photos: roomType.photos
        };
      })
    );
    
    return NextResponse.json({
      propertyId,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      roomTypes: roomTypesWithAvailability
    });
    
  } catch (error) {
    console.error('Error checking property availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
