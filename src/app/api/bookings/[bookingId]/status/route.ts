import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// This handler will update booking status and manage inventory appropriately
export async function PUT(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Check if user is authenticated and is admin
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const bookingId = params.bookingId;
    const body = await request.json();
    
    // Validate required fields
    if (!body.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }
    
    const newStatus = body.status.toUpperCase();
    const notes = body.notes || `Status updated to ${newStatus}`;
    
    // Get current booking with room type
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        roomType: true
      }
    });
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Check if status is valid
    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }
    
    // Don't update if status is the same
    if (booking.status === newStatus) {
      return NextResponse.json(
        { message: 'Status is already set to ' + newStatus },
        { status: 200 }
      );
    }
    
    // Handle inventory changes based on status transition
    const updatedBooking = await prisma.$transaction(async (prisma: any) => {
      // Case 1: Any status -> CANCELLED - release inventory
      if (newStatus === 'CANCELLED' && booking.status !== 'CANCELLED') {
        await prisma.roomType.update({
          where: { id: booking.roomTypeId },
          data: {
            availableRooms: {
              increment: booking.rooms
            }
          }
        });
      }
      
      // Case 2: CANCELLED -> PENDING/CONFIRMED - reclaim inventory
      if (booking.status === 'CANCELLED' && ['PENDING', 'CONFIRMED'].includes(newStatus)) {
        // Check if enough rooms are available
        const roomType = await prisma.roomType.findUnique({
          where: { id: booking.roomTypeId }
        });
        
        if (!roomType || roomType.availableRooms < booking.rooms) {
          return NextResponse.json(
            { error: 'Not enough rooms available to reactivate this booking' },
            { status: 400 }
          );
        }
        
        // Update available rooms
        await prisma.roomType.update({
          where: { id: booking.roomTypeId },
          data: {
            availableRooms: {
              decrement: booking.rooms
            }
          }
        });
      }
      
      // Update booking status and add to history
      return await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: newStatus,
          statusHistory: {
            create: {
              status: newStatus,
              notes
            }
          }
        },
        include: {
          property: {
            select: { name: true }
          },
          roomType: {
            select: { name: true }
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });
    });
    
    return NextResponse.json({
      message: `Booking status updated to ${newStatus}`,
      booking: updatedBooking
    });
    
  } catch (error) {
    console.error('Error updating booking status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
