import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Temporary non-auth route for testing
export async function HEAD() {
  try {
    const roomTypes = await prisma.roomType.findMany({
      include: {
        property: {
          select: {
            id: true,
            name: true,
          }
        },
        _count: {
          select: {
            bookings: true,
          }
        }
      },
      take: 1
    });
    
    return NextResponse.json({ success: true, count: roomTypes.length });
  } catch (error) {
    console.error('Test HEAD: Error:', error);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}

// GET all room types
export async function GET() {
  try {
    const session = await auth();
    
    console.log('Room Types API: Auth session received:', session ? {
      id: session.user?.id,
      email: session.user?.email,
      role: session.user?.role
    } : 'No session');
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - No session' },
        { status: 401 }
      );
    }
    
    if (session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: `Unauthorized - Role ${session.user?.role} is not ADMIN` },
        { status: 401 }
      );
    }

    const roomTypes = await prisma.roomType.findMany({
      include: {
        property: {
          select: {
            id: true,
            name: true,
          }
        },
        _count: {
          select: {
            bookings: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(roomTypes);
  } catch (error) {
    console.error('Error fetching room types:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new room type
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      propertyId,
      name,
      description,
      capacity,
      basePrice,
      amenities,
      totalRooms = 0
    } = body;

    // Validate required fields
    if (!propertyId || !name || !capacity || !basePrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const roomType = await prisma.roomType.create({
      data: {
        propertyId,
        name,
        description,
        capacity: parseInt(capacity),
        basePrice: parseFloat(basePrice),
        totalRooms: parseInt(totalRooms.toString() || '0'),
        amenities: amenities || [],
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return NextResponse.json(roomType, { status: 201 });
  } catch (error) {
    console.error('Error creating room type:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
