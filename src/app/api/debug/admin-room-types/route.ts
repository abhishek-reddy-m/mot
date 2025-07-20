import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('Testing admin room types without auth...');
    
    // Use raw query to avoid any column issues
    const roomTypesRaw = await prisma.$queryRaw`
      SELECT 
        rt.id, 
        rt.name, 
        rt."propertyId", 
        rt.description, 
        rt.capacity, 
        rt."basePrice", 
        rt."totalRooms",
        rt.amenities,
        rt."isActive",
        rt."createdAt",
        rt."updatedAt",
        p.id as "property_id", 
        p.name as "property_name"
      FROM room_types rt
      LEFT JOIN properties p ON rt."propertyId" = p.id
      WHERE rt."isActive" = true
      ORDER BY rt."createdAt" DESC
    `;
    
    console.log('Raw room types result:', roomTypesRaw);
    
    // Transform raw results to match expected format
    const roomTypes = Array.isArray(roomTypesRaw) ? roomTypesRaw.map(rt => ({
      id: rt.id,
      name: rt.name,
      propertyId: rt.propertyId,
      description: rt.description,
      capacity: Number(rt.capacity),
      basePrice: rt.basePrice,
      totalRooms: Number(rt.totalRooms),
      amenities: rt.amenities || [],
      isActive: rt.isActive,
      createdAt: rt.createdAt,
      updatedAt: rt.updatedAt,
      property: {
        id: rt.property_id,
        name: rt.property_name
      }
    })) : [];

    console.log('Transformed room types:', roomTypes);

    return NextResponse.json({
      success: true,
      count: roomTypes.length,
      data: roomTypes
    });
    
  } catch (error) {
    console.error('Error in test admin room types:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      stack: errorStack
    }, { status: 500 });
  }
}
