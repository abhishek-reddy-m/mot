import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const session = await auth();
    
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
    
    // Check cancellation timeframe - 24 hours before 3 PM on check-in day
    // Admins can bypass this restriction
    if (!isAdmin) {
      const checkInDate = new Date(booking.checkIn);
      const cancellationDeadline = new Date(checkInDate);
      cancellationDeadline.setHours(15, 0, 0, 0); // Set to 3 PM
      cancellationDeadline.setDate(cancellationDeadline.getDate() - 1); // Previous day
      
      const now = new Date();
      
      if (now >= cancellationDeadline) {
        const formattedDeadline = cancellationDeadline.toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short'
        });
        return NextResponse.json(
          { error: `Cancellation deadline has passed. Bookings must be cancelled before ${formattedDeadline}` },
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
