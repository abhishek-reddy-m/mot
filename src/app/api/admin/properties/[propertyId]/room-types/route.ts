import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/properties/[propertyId]/room-types
export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const session = await auth();
    
    // Check authentication
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { propertyId } = await params;
    
    // Get all room types for the property
    const roomTypes = await prisma.roomType.findMany({
      where: {
        propertyId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        basePrice: true,
        propertyId: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return NextResponse.json(roomTypes);
  } catch (error) {
    console.error('Error fetching room types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room types' },
      { status: 500 }
    );
  }
}
