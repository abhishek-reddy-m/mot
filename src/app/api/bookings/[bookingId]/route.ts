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
    
    // Get the current booking
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
        { error: 'Unauthorized to modify this booking' },
        { status: 403 }
      );
    }
    
    // Check if booking can be modified
    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot modify a cancelled booking' },
        { status: 400 }
      );
    }
    
    if (['CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'Cannot modify a booking that has already been processed' },
        { status: 400 }
      );
    }
    
    // Check modification timeframe - customers can only modify 24 hours before check-in
    // Admins can bypass this restriction
    if (!isAdmin) {
      const checkInDate = new Date(booking.checkIn);
      const now = new Date();
      const timeDiff = checkInDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        return NextResponse.json(
          { error: 'Bookings can only be modified at least 24 hours before check-in' },
          { status: 400 }
        );
      }
    }
    
    // Get request body for modification details
    const body = await request.json();
    const { 
      checkIn,
      checkOut,
      guests,
      rooms,
      totalPrice,
      notes
    } = body;
    
    // Calculate how many rooms are being added or removed
    const roomDifference = rooms - booking.rooms;
    
    // Use a transaction to update booking and adjust room inventory
    const updatedBooking = await prisma.$transaction(async (prisma) => {
      // 1. Update room inventory if number of rooms has changed
      if (roomDifference !== 0) {
        await prisma.roomType.update({
          where: { id: booking.roomTypeId },
          data: {
            // If roomDifference is negative, we're decreasing the number of rooms (making more available)
            // If roomDifference is positive, we're increasing the number of rooms (making fewer available)
            availableRooms: {
              decrement: roomDifference
            }
          }
        });
      }
      
      // 2. Update the booking
      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          checkIn: checkIn ? new Date(checkIn) : undefined,
          checkOut: checkOut ? new Date(checkOut) : undefined,
          guests: guests !== undefined ? guests : undefined,
          rooms: rooms !== undefined ? rooms : undefined,
          totalPrice: totalPrice !== undefined ? totalPrice : undefined,
          notes: notes !== undefined ? notes : undefined,
          statusHistory: {
            create: {
              status: booking.status, // Keep same status, just add a history entry
              notes: `Booking modified: ${notes || 'No additional notes'}`
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
      
      return updated;
    });
    
    return NextResponse.json({
      message: 'Booking updated successfully',
      booking: updatedBooking
    });
    
  } catch (error) {
    console.error('Error modifying booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
