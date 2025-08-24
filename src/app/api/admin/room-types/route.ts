import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Temporary non-auth route for testing
export async function HEAD() {
  try {
    // Fixed query without availableRooms
    const roomTypes = await prisma.$queryRaw`
      SELECT id, name, "propertyId", description, capacity, "basePrice", "totalRooms", "isActive"
      FROM room_types
      LIMIT 1
    `;
    
    const results = Array.isArray(roomTypes) ? roomTypes : [];
    return NextResponse.json({ success: true, count: results.length });
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

    // Use raw query to avoid the availableRooms column issue
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
        p.id as "property.id", 
        p.name as "property.name",
        (SELECT COUNT(*) FROM bookings b WHERE b."roomTypeId" = rt.id) as "bookingCount"
      FROM room_types rt
      JOIN properties p ON rt."propertyId" = p.id
      ORDER BY rt."createdAt" DESC
    `;
    
    // Transform raw results to match expected format
    const roomTypes = Array.isArray(roomTypesRaw) ? roomTypesRaw.map(rt => ({
      id: rt.id,
      name: rt.name,
      propertyId: rt.propertyId,
      description: rt.description,
      capacity: rt.capacity,
      basePrice: rt.basePrice,
      totalRooms: rt.totalRooms,
      amenities: rt.amenities,
      isActive: rt.isActive,
      createdAt: rt.createdAt,
      updatedAt: rt.updatedAt,
      property: {
        id: rt['property.id'],
        name: rt['property.name']
      },
      _count: {
        bookings: Number(rt.bookingCount)
      }
    })) : [];

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
    
    if (!session?.user || session.user.role !== 'ADMIN') {
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

    // Initialize room rates for the next 2 years using the base price
    try {
      // Use internal call pattern to avoid API call overhead
      await fetch(`${req.nextUrl.origin}/api/admin/initialize-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Pass the auth cookie through
          'Cookie': req.headers.get('cookie') || '',
        },
        body: JSON.stringify({ roomTypeId: roomType.id }),
      });
      console.log(`Initialized rates for new room type: ${roomType.name} (${roomType.id})`);
    } catch (rateError) {
      // Log error but don't fail the room type creation
      console.error('Error initializing rates for new room type:', rateError);
    }

    return NextResponse.json(roomType, { status: 201 });
  } catch (error) {
    console.error('Error creating room type:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
