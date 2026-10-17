import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findAvailableSubdomain, hostPropertySubdomain } from '@/lib/property-subdomains';

// GET all properties
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const properties = await prisma.property.findMany({
      include: {
        roomTypes: {
          select: {
            id: true,
            name: true,
            capacity: true,
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

    return NextResponse.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new property
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
      name,
      description,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      amenities
    } = body;

    // Validate required fields
    if (!name || !address || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const property = await prisma.property.create({
      data: {
        name,
        description,
        address,
        city,
        state,
        zipCode,
        phone,
        email,
        amenities: amenities || [],
        // Default booking page address, e.g. oceanview-resort.hotelone.site
        subdomain: await findAvailableSubdomain(name),
      },
    });

    try {
      await hostPropertySubdomain(property.subdomain!);
    } catch (error) {
      // The startup sync retries adding it to Render
      console.error('Error adding subdomain to Render:', error);
    }

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    console.error('Error creating property:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
