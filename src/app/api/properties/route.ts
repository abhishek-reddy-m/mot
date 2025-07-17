import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest
) {
  try {
    // Get all active properties with their room types
    const properties = await prisma.property.findMany({
      where: {
        isActive: true,
      },
      include: {
        photos: {
          where: { isMain: true },
          take: 1,
        },
        roomTypes: {
          where: { isActive: true },
          include: {
            photos: {
              where: { isMain: true },
              take: 1,
            },
          },
        },
      },
    });

    // Transform the response to include availability information
    const propertiesWithAvailability = properties.map(property => {
      // Calculate total and available rooms
      let totalRooms = 0;
      let availableRooms = 0;
      let lowestPrice: number | null = null;
      
      property.roomTypes.forEach(roomType => {
        // Use the new totalRooms and availableRooms fields
        totalRooms += roomType.totalRooms;
        availableRooms += roomType.availableRooms;
        
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
        availableRooms,
        lowestPrice,
        roomTypeCount: property.roomTypes.length,
        hasAvailability: availableRooms > 0
      };
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
