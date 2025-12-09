import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST change check-out date
export async function POST(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { newCheckOut } = await request.json();

    if (!newCheckOut) {
      return NextResponse.json(
        { error: 'New check-out date is required' },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.bookingId },
      include: {
        property: {
          select: {
            name: true,
            address: true,
            city: true,
          }
        },
        roomType: {
          select: {
            name: true,
            basePrice: true,
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

    // Check authorization
    if (booking.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if booking can be modified
    if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only confirmed or pending bookings can be modified' },
        { status: 400 }
      );
    }

    const newCheckOutDate = new Date(newCheckOut);
    const currentCheckIn = new Date(booking.checkIn);
    const currentCheckOut = new Date(booking.checkOut);
    const now = new Date();

    // Validate new check-out date
    if (newCheckOutDate <= currentCheckIn) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }

    // Check if booking has already started
    if (now >= currentCheckIn) {
      return NextResponse.json(
        { error: 'Cannot modify a booking that has already started' },
        { status: 400 }
      );
    }

    // Calculate the date ranges to check/update
    const oldCheckOut = new Date(currentCheckOut);
    const newCheckOutNormalized = new Date(newCheckOutDate);
    
    // Normalize to start of day for comparison
    oldCheckOut.setHours(0, 0, 0, 0);
    newCheckOutNormalized.setHours(0, 0, 0, 0);

    const { getAvailableRooms, updateRoomAvailability } = await import('@/lib/room-availability');

    // If extending check-out (staying longer), we need to check and book additional nights
    if (newCheckOutNormalized > oldCheckOut) {
      const { availableRooms, availabilityByDate } = await getAvailableRooms(
        booking.roomTypeId,
        oldCheckOut,
        newCheckOutNormalized
      );

      console.log(`Extending check-out: checking availability from ${oldCheckOut.toISOString()} to ${newCheckOutNormalized.toISOString()}`);
      console.log(`Available rooms: ${availableRooms}, need: ${booking.rooms}`);

      if (availableRooms < booking.rooms) {
        const unavailableDates = Object.entries(availabilityByDate)
          .filter(([_, available]) => available < booking.rooms)
          .map(([date]) => new Date(date).toLocaleDateString());

        return NextResponse.json(
          { 
            error: `Not enough rooms available for the extended dates. Unavailable on: ${unavailableDates.join(', ')}`,
            availableRooms,
            requestedRooms: booking.rooms
          },
          { status: 400 }
        );
      }

      // Book the additional nights
      await updateRoomAvailability(
        booking.roomTypeId,
        oldCheckOut,
        newCheckOutNormalized,
        booking.rooms,
        false // Booking new nights
      );
    } 
    // If shortening check-out (leaving earlier), we need to free up the abandoned nights
    else if (newCheckOutNormalized < oldCheckOut) {
      console.log(`Shortening check-out: freeing up from ${newCheckOutNormalized.toISOString()} to ${oldCheckOut.toISOString()}`);
      
      await updateRoomAvailability(
        booking.roomTypeId,
        newCheckOutNormalized,
        oldCheckOut,
        booking.rooms,
        true // Cancelling these nights
      );
    }

    // Calculate new total price based on new number of nights
    const nightsDiff = Math.ceil((newCheckOutNormalized.getTime() - currentCheckIn.getTime()) / (1000 * 60 * 60 * 24));
    const newTotalPrice = Number(booking.roomType.basePrice) * nightsDiff * booking.rooms;

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: params.bookingId },
      data: {
        checkOut: newCheckOutDate,
        totalPrice: newTotalPrice,
      },
      include: {
        property: {
          select: {
            name: true,
            address: true,
            city: true,
          }
        },
        roomType: {
          select: {
            name: true,
            basePrice: true,
          }
        }
      }
    });

    // Calculate cancellation info
    const cancellationDeadline = new Date(currentCheckIn);
    cancellationDeadline.setHours(15, 0, 0, 0);
    cancellationDeadline.setDate(cancellationDeadline.getDate() - 1);

    const canCancel = now < cancellationDeadline;
    const canModify = now < currentCheckIn;

    return NextResponse.json({
      ...updatedBooking,
      checkIn: updatedBooking.checkIn.toISOString(),
      checkOut: updatedBooking.checkOut.toISOString(),
      totalPrice: Number(updatedBooking.totalPrice),
      canCancel,
      canModify,
      cancellationDeadline: cancellationDeadline.toISOString(),
    });
  } catch (error) {
    console.error('Error changing check-out date:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
