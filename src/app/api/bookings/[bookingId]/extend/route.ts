import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST extend booking (add more nights)
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

    const { additionalNights } = await request.json();

    if (!additionalNights || additionalNights <= 0) {
      return NextResponse.json(
        { error: 'Invalid number of nights' },
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
        { error: 'Only confirmed or pending bookings can be extended' },
        { status: 400 }
      );
    }

    const checkInDate = new Date(booking.checkIn);
    const now = new Date();

    if (now >= checkInDate) {
      return NextResponse.json(
        { error: 'Cannot extend a booking that has already started' },
        { status: 400 }
      );
    }

    // Calculate new checkout date
    const currentCheckOut = new Date(booking.checkOut);
    const newCheckOut = new Date(currentCheckOut);
    newCheckOut.setDate(newCheckOut.getDate() + additionalNights);

    // Check room availability for the extended period (from current checkout to new checkout)
    const { getAvailableRooms } = await import('@/lib/room-availability');
    const { availableRooms, availabilityByDate } = await getAvailableRooms(
      booking.roomTypeId,
      currentCheckOut,
      newCheckOut
    );

    console.log(`Checking availability for extension: ${availableRooms} rooms available, need ${booking.rooms}`);
    console.log('Availability by date:', availabilityByDate);

    if (availableRooms < booking.rooms) {
      // Find which dates are not available
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

    const additionalPrice = Number(booking.roomType.basePrice) * additionalNights * booking.rooms;
    const newTotalPrice = Number(booking.totalPrice) + additionalPrice;

    // Update room availability for the extended period
    const { updateRoomAvailability } = await import('@/lib/room-availability');
    await updateRoomAvailability(
      booking.roomTypeId,
      currentCheckOut,
      newCheckOut,
      booking.rooms,
      false // This is a new booking (extension)
    );

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: params.bookingId },
      data: {
        checkOut: newCheckOut,
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
    const cancellationDeadline = new Date(checkInDate);
    cancellationDeadline.setHours(15, 0, 0, 0);
    cancellationDeadline.setDate(cancellationDeadline.getDate() - 1);

    const canCancel = now < cancellationDeadline;
    const canModify = now < checkInDate;

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
    console.error('Error extending booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
