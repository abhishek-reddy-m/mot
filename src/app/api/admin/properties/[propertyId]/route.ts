import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET specific property details
export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const property = await prisma.property.findUnique({
      where: {
        id: params.propertyId,
      },
      include: {
        photos: true,
        roomTypes: {
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

// PUT update property
export async function PUT(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      amenities,
      isActive
    } = body;

    // Validate required fields
    if (!name || !address || !city || !state || !zipCode || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const updatedProperty = await prisma.property.update({
      where: {
        id: params.propertyId,
      },
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
        isActive: isActive !== undefined ? isActive : true,
      }
    });

    return NextResponse.json(updatedProperty);
  } catch (error) {
    console.error('Error updating property:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE property
export async function DELETE(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: {
        id: params.propertyId,
      },
      include: {
        bookings: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'CHECKED_IN']
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

    // Check for active bookings
    if (property.bookings.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete property with active bookings',
          bookingsCount: property.bookings.length
        },
        { status: 400 }
      );
    }

    try {
      // Delete property (cascade will handle photos, room types, etc.)
      await prisma.property.delete({
        where: {
          id: params.propertyId,
        },
      });

      return NextResponse.json({ success: true });
    } catch (deleteError: any) {
      console.error('Database error deleting property:', deleteError);
      
      // Check for foreign key constraint errors
      if (deleteError.code === 'P2003') {
        return NextResponse.json(
          { error: 'Cannot delete property because it has related records' },
          { status: 400 }
        );
      }
      
      throw deleteError; // Re-throw for general error handling
    }
  } catch (error) {
    console.error('Error deleting property:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
