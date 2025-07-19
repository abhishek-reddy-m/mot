import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await auth();
    const bookingId = params.bookingId;
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the booking
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
    
    // Check if user is authorized (either admin or booking owner)
    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = booking.userId === session.user.id;
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Unauthorized to cancel this booking' },
        { status: 403 }
      );
    }
    
    // Check if booking can be cancelled
    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Booking is already cancelled' },
        { status: 400 }
      );
    }
    
    if (['CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel a booking that has already been processed' },
        { status: 400 }
      );
    }
    
    // Check cancellation timeframe - customers can only cancel 24 hours before check-in
    // Admins can bypass this restriction
    if (!isAdmin) {
      const checkInDate = new Date(booking.checkIn);
      const now = new Date();
      const timeDiff = checkInDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        return NextResponse.json(
          { error: 'Bookings can only be cancelled at least 24 hours before check-in' },
          { status: 400 }
        );
      }
    }
    
    // Get request body for optional cancellation reason
    const body = await request.json().catch(() => ({}));
    const cancellationReason = body.reason || 'Booking cancelled by user';
    
    // Import the room availability update function
    const { updateRoomAvailability } = await import('@/lib/room-availability');

    // Update the booking status
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        statusHistory: {
          create: {
            status: 'CANCELLED',
            notes: cancellationReason
          }
        }
      },
      include: {
        roomType: {
          select: { name: true }
        },
        property: {
          select: { name: true }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    // Update room availability records to reflect the cancellation
    await updateRoomAvailability(
      booking.roomTypeId,
      booking.checkIn,
      booking.checkOut,
      booking.rooms,
      true // This is a cancellation
    );
    
    return NextResponse.json({
      message: 'Booking cancelled successfully',
      booking: updatedBooking
    });
    
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
