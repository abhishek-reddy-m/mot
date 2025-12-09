import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseBookingDate, toDateString, isBefore, isSameDay, getDateRange } from '@/lib/date-utils';

// POST modify booking dates (check-in and/or check-out)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { newCheckIn, newCheckOut } = await request.json();

    if (!newCheckIn && !newCheckOut) {
      return NextResponse.json(
        { error: 'At least one date must be provided' },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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

    // Use the date utilities for consistent timezone-safe date handling
    const currentCheckInStr = toDateString(booking.checkIn);
    const currentCheckOutStr = toDateString(booking.checkOut);
    const currentCheckIn = parseBookingDate(currentCheckInStr);
    const currentCheckOut = parseBookingDate(currentCheckOutStr);
    const now = new Date();

    // Check 24-hour policy for CURRENT check-in date
    // If within 24 hours of current check-in (before 3 PM the day before), only check-out modifications allowed
    const currentCancellationDeadline = new Date(currentCheckIn);
    currentCancellationDeadline.setUTCHours(15, 0, 0, 0); // 3 PM on check-in day
    currentCancellationDeadline.setUTCDate(currentCancellationDeadline.getUTCDate() - 1); // Day before

    const withinCheckInWindow = now >= currentCancellationDeadline;

    // If trying to modify check-in while within 24-hour window, block it
    if (newCheckIn && withinCheckInWindow && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot modify check-in date within 24 hours of check-in (after 3 PM the day before). You can still modify the check-out date.' },
        { status: 400 }
      );
    }

    // Determine final dates using timezone-safe parsing
    const finalCheckInStr = newCheckIn || currentCheckInStr;
    const finalCheckOutStr = newCheckOut || currentCheckOutStr;
    const finalCheckIn = parseBookingDate(finalCheckInStr);
    const finalCheckOut = parseBookingDate(finalCheckOutStr);
    
    console.log('Parsing dates:', {
      newCheckIn,
      newCheckOut, 
      finalCheckIn: toDateString(finalCheckIn),
      finalCheckOut: toDateString(finalCheckOut)
    });

    // Validate dates
    if (finalCheckIn >= finalCheckOut) {
      return NextResponse.json(
        { error: 'Check-in date must be before check-out date' },
        { status: 400 }
      );
    }

    // Compare dates only (not times) - get today at start of day UTC
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    
    // finalCheckIn is already set to noon UTC, so compare with today at midnight
    if (finalCheckIn < todayStart) {
      return NextResponse.json(
        { error: 'Check-in date cannot be in the past' },
        { status: 400 }
      );
    }

    // Check if booking has already started (only block if check-in is modifying, allow checkout extension)
    if (now >= currentCheckIn && newCheckIn) {
      return NextResponse.json(
        { error: 'Cannot modify check-in date for a booking that has already started. You can still extend your checkout.' },
        { status: 400 }
      );
    }

    // Check 24-hour policy for NEW check-in date (if changing to a new date)
    if (newCheckIn) {
      const newCancellationDeadline = new Date(finalCheckIn);
      newCancellationDeadline.setUTCHours(15, 0, 0, 0);
      newCancellationDeadline.setUTCDate(newCancellationDeadline.getUTCDate() - 1);

      if (now >= newCancellationDeadline && session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Cannot change check-in to a date within 24 hours (before 3 PM the day before)' },
          { status: 400 }
        );
      }
    }

    const { getAvailableRooms, updateRoomAvailability } = await import('@/lib/room-availability');

    // Work with date strings for consistent comparison
    const oldCheckInStr = currentCheckInStr;
    const oldCheckOutStr = currentCheckOutStr;
    const newCheckInNormStr = finalCheckInStr;
    const newCheckOutNormStr = finalCheckOutStr;
    
    // Also need Date objects for availability functions
    const oldCheckIn = currentCheckIn;
    const oldCheckOut = currentCheckOut;
    const newCheckInNorm = finalCheckIn;
    const newCheckOutNorm = finalCheckOut;
    
    console.log('Date normalization:', {
      oldCheckIn: oldCheckInStr,
      oldCheckOut: oldCheckOutStr,
      newCheckIn: newCheckInNormStr,
      newCheckOut: newCheckOutNormStr
    });

    // Determine what date ranges need to be checked/updated
    // We need to handle 5 scenarios:
    // 1. Only extending checkout (check-in same, checkout later)
    // 2. Only shortening checkout (check-in same, checkout earlier)
    // 3. Only changing check-in earlier (need to check/book earlier dates)
    // 4. Only changing check-in later (need to free earlier dates)
    // 5. Changing both dates

    const checkInChanged = newCheckIn && !isSameDay(oldCheckInStr, newCheckInNormStr);
    const checkOutChanged = newCheckOut && !isSameDay(oldCheckOutStr, newCheckOutNormStr);

    // Track dates to free and dates to book
    let datesToFree: { start: Date; end: Date } | null = null;
    let datesToBook: { start: Date; end: Date } | null = null;

    if (checkInChanged && !checkOutChanged) {
      // Only check-in is changing
      if (isBefore(newCheckInNormStr, oldCheckInStr)) {
        // Moving check-in earlier - need to book new earlier dates
        datesToBook = { start: parseBookingDate(newCheckInNormStr), end: parseBookingDate(oldCheckInStr) };
        console.log(`Moving check-in earlier: need to book from ${newCheckInNormStr} to ${oldCheckInStr}`);
      } else {
        // Moving check-in later - need to free earlier dates
        datesToFree = { start: parseBookingDate(oldCheckInStr), end: parseBookingDate(newCheckInNormStr) };
        console.log(`Moving check-in later: need to free from ${oldCheckInStr} to ${newCheckInNormStr}`);
      }
    } else if (!checkInChanged && checkOutChanged) {
      // Only check-out is changing
      if (isBefore(oldCheckOutStr, newCheckOutNormStr)) {
        // Extending checkout - need to book new later dates
        datesToBook = { start: parseBookingDate(oldCheckOutStr), end: parseBookingDate(newCheckOutNormStr) };
      } else {
        // Shortening checkout - need to free later dates
        datesToFree = { start: parseBookingDate(newCheckOutNormStr), end: parseBookingDate(oldCheckOutStr) };
      }
    } else if (checkInChanged && checkOutChanged) {
      // Both dates changing - handle the full replacement
      // Free old dates first, then book new dates
      await updateRoomAvailability(
        booking.roomTypeId,
        oldCheckIn,
        oldCheckOut,
        booking.rooms,
        true // Cancel old dates
      );

      // Check availability for entire new range
      const { availableRooms, availabilityByDate } = await getAvailableRooms(
        booking.roomTypeId,
        newCheckInNorm,
        newCheckOutNorm
      );

      if (availableRooms < booking.rooms) {
        // Rollback - re-book the old dates
        await updateRoomAvailability(
          booking.roomTypeId,
          oldCheckIn,
          oldCheckOut,
          booking.rooms,
          false
        );

        const unavailableDates = Object.entries(availabilityByDate)
          .filter(([_, available]) => available < booking.rooms)
          .map(([date]) => new Date(date).toLocaleDateString());

        return NextResponse.json(
          { 
            error: `Not enough rooms available for the new dates. Unavailable on: ${unavailableDates.join(', ')}`,
            availableRooms,
            requestedRooms: booking.rooms
          },
          { status: 400 }
        );
      }

      // Book the new dates
      await updateRoomAvailability(
        booking.roomTypeId,
        newCheckInNorm,
        newCheckOutNorm,
        booking.rooms,
        false
      );
    }

    // Handle single-direction changes (check-in only or check-out only)
    if (datesToBook) {
      // Check availability for the new dates
      const { availableRooms, availabilityByDate } = await getAvailableRooms(
        booking.roomTypeId,
        datesToBook.start,
        datesToBook.end
      );

      console.log(`Checking availability for dates ${datesToBook.start.toISOString()} to ${datesToBook.end.toISOString()}: ${availableRooms} available, need ${booking.rooms}`);
      console.log('Availability by date:', availabilityByDate);

      if (availableRooms < booking.rooms) {
        const unavailableDates = Object.entries(availabilityByDate)
          .filter(([_, available]) => available < booking.rooms)
          .map(([date]) => {
            // Parse the date string directly without timezone conversion
            const [year, month, day] = date.split('-');
            return `${parseInt(month)}/${parseInt(day)}/${year}`;
          });

        return NextResponse.json(
          { 
            error: `Not enough rooms available for the new dates. Unavailable on: ${unavailableDates.join(', ')}`,
            availableRooms,
            requestedRooms: booking.rooms
          },
          { status: 400 }
        );
      }

      // Book the new dates
      await updateRoomAvailability(
        booking.roomTypeId,
        datesToBook.start,
        datesToBook.end,
        booking.rooms,
        false
      );
    }

    if (datesToFree) {
      // Free the dates no longer needed
      await updateRoomAvailability(
        booking.roomTypeId,
        datesToFree.start,
        datesToFree.end,
        booking.rooms,
        true
      );
    }

    // Calculate new total price using date range
    const nightsArray = getDateRange(finalCheckInStr, finalCheckOutStr);
    const nightsDiff = nightsArray.length;
    const newTotalPrice = Number(booking.roomType.basePrice) * nightsDiff * booking.rooms;

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        checkIn: finalCheckIn,
        checkOut: finalCheckOut,
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

    // Calculate new cancellation info
    const newCancellationDeadline = new Date(finalCheckIn);
    newCancellationDeadline.setUTCHours(15, 0, 0, 0);
    newCancellationDeadline.setUTCDate(newCancellationDeadline.getUTCDate() - 1);

    const canCancel = now < newCancellationDeadline && (updatedBooking.status === 'CONFIRMED' || updatedBooking.status === 'PENDING');
    const canModifyCheckIn = now < newCancellationDeadline && (updatedBooking.status === 'CONFIRMED' || updatedBooking.status === 'PENDING');
    const canModifyCheckOut = now < finalCheckIn && (updatedBooking.status === 'CONFIRMED' || updatedBooking.status === 'PENDING');
    const canModify = canModifyCheckIn || canModifyCheckOut;

    return NextResponse.json({
      ...updatedBooking,
      checkIn: updatedBooking.checkIn.toISOString(),
      checkOut: updatedBooking.checkOut.toISOString(),
      totalPrice: Number(updatedBooking.totalPrice),
      canCancel,
      canModify,
      canModifyCheckIn,
      canModifyCheckOut,
      cancellationDeadline: newCancellationDeadline.toISOString(),
    });
  } catch (error) {
    console.error('Error modifying booking dates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
