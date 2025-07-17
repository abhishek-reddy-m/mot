import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    // Await params before accessing properties
    const { propertyId } = await params;
    
    // Find the property with all related data including room types
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

    return NextResponse.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
