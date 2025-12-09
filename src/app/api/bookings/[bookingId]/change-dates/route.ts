import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST change check-in date
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

    const { newCheckIn } = await request.json();

    if (!newCheckIn) {
      return NextResponse.json(
        { error: 'New check-in date is required' },
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

    const newCheckInDate = new Date(newCheckIn);
    const currentCheckIn = new Date(booking.checkIn);
    const currentCheckOut = new Date(booking.checkOut);
    const now = new Date();

    // Validate new check-in date
    if (newCheckInDate >= currentCheckOut) {
      return NextResponse.json(
        { error: 'Check-in date must be before check-out date' },
        { status: 400 }
      );
    }

    if (newCheckInDate < now) {
      return NextResponse.json(
        { error: 'Check-in date cannot be in the past' },
        { status: 400 }
      );
    }

    // Check 24-hour policy for the NEW check-in date
    const newCancellationDeadline = new Date(newCheckInDate);
    newCancellationDeadline.setHours(15, 0, 0, 0); // 3 PM on new check-in day
    newCancellationDeadline.setDate(newCancellationDeadline.getDate() - 1); // 24 hours before

    if (now >= newCancellationDeadline && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot change check-in date within 24 hours of the new check-in time (before 3 PM the day before)' },
        { status: 400 }
      );
    }

    // Calculate the date ranges to check/update
    const oldCheckIn = new Date(currentCheckIn);
    const newCheckInNormalized = new Date(newCheckInDate);
    
    // Normalize to start of day for comparison
    oldCheckIn.setHours(0, 0, 0, 0);
    newCheckInNormalized.setHours(0, 0, 0, 0);

    const { getAvailableRooms, updateRoomAvailability } = await import('@/lib/room-availability');

    // If moving check-in earlier, we need to check and book additional nights
    if (newCheckInNormalized < oldCheckIn) {
      const { availableRooms, availabilityByDate } = await getAvailableRooms(
        booking.roomTypeId,
        newCheckInNormalized,
        oldCheckIn
      );

      console.log(`Moving check-in earlier: checking availability from ${newCheckInNormalized.toISOString()} to ${oldCheckIn.toISOString()}`);
      console.log(`Available rooms: ${availableRooms}, need: ${booking.rooms}`);

      if (availableRooms < booking.rooms) {
        const unavailableDates = Object.entries(availabilityByDate)
          .filter(([_, available]) => available < booking.rooms)
          .map(([date]) => new Date(date).toLocaleDateString());

        return NextResponse.json(
          { 
            error: `Not enough rooms available for the new check-in date. Unavailable on: ${unavailableDates.join(', ')}`,
            availableRooms,
            requestedRooms: booking.rooms
          },
          { status: 400 }
        );
      }

      // Book the additional nights
      await updateRoomAvailability(
        booking.roomTypeId,
        newCheckInNormalized,
        oldCheckIn,
        booking.rooms,
        false // Booking new nights
      );
    } 
    // If moving check-in later, we need to free up the abandoned nights
    else if (newCheckInNormalized > oldCheckIn) {
      console.log(`Moving check-in later: freeing up from ${oldCheckIn.toISOString()} to ${newCheckInNormalized.toISOString()}`);
      
      await updateRoomAvailability(
        booking.roomTypeId,
        oldCheckIn,
        newCheckInNormalized,
        booking.rooms,
        true // Cancelling these nights
      );
    }

    // Calculate new total price based on new number of nights
    const nightsDiff = Math.ceil((currentCheckOut.getTime() - newCheckInNormalized.getTime()) / (1000 * 60 * 60 * 24));
    const newTotalPrice = Number(booking.roomType.basePrice) * nightsDiff * booking.rooms;

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: params.bookingId },
      data: {
        checkIn: newCheckInDate,
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

    // Calculate cancellation info with new check-in date
    const cancellationDeadline = new Date(newCheckInDate);
    cancellationDeadline.setHours(15, 0, 0, 0);
    cancellationDeadline.setDate(cancellationDeadline.getDate() - 1);

    const canCancel = now < cancellationDeadline;
    const canModify = now < newCheckInDate;

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
    console.error('Error changing check-in date:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
