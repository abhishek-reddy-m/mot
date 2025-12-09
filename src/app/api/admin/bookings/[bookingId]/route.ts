import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET a specific booking by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    // Check authentication
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        property: true,
        roomType: true,
        statusHistory: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH to update booking status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    // Check authentication
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { status, notes } = await request.json();
    
    // Validate status
    const validStatuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Start a transaction to update booking status and related data
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the current booking
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { roomType: true }
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // 2. Update booking status
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status }
      });

      // 3. Create status history entry
      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          status,
          notes: notes || ''
        }
      });

      // 4. Handle room inventory updates based on status change
      if ((status === 'CANCELLED' || status === 'NO_SHOW') && booking.status !== 'CANCELLED' && booking.status !== 'NO_SHOW') {
        // If cancelling or marking no-show, decrease booked rooms (effectively making them available)
        const { updateRoomAvailability } = await import('@/lib/room-availability');
        await updateRoomAvailability(
          booking.roomTypeId,
          new Date(booking.checkIn),
          new Date(booking.checkOut),
          booking.rooms,
          true // isCancel = true
        );
        console.log(`${status} booking - freed ${booking.rooms} rooms for dates ${booking.checkIn} to ${booking.checkOut}`);
      } else if ((booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') && status !== 'CANCELLED' && status !== 'NO_SHOW') {
        // If un-cancelling, increase booked rooms (making them unavailable again)
        const { updateRoomAvailability } = await import('@/lib/room-availability');
        await updateRoomAvailability(
          booking.roomTypeId,
          new Date(booking.checkIn),
          new Date(booking.checkOut),
          booking.rooms,
          false // isCancel = false
        );
        console.log(`Un-cancelled booking - reserved ${booking.rooms} rooms for dates ${booking.checkIn} to ${booking.checkOut}`);
      }

      return updatedBooking;
    });

    return NextResponse.json({
      message: `Booking status updated to ${status}`,
      booking: result
    });

  } catch (error) {
    console.error('Error updating booking status:', error);
    return NextResponse.json(
      { error: 'Failed to update booking status' },
      { status: 500 }
    );
  }
}
