import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseBookingDate, toDateString, getDateRange } from '@/lib/date-utils';
import { isStripeConfigured, getStripe } from '@/lib/stripe';
import { sendBookingConfirmation } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be logged in to make a booking' },
        { status: 401 }
      );
    }

    // Make sure we have a valid user ID
    if (!session.user.id) {
      return NextResponse.json(
        { error: 'User identification error. Please try logging in again.' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();

    // Verify that the user actually exists in the database
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      return NextResponse.json(
        { error: 'User not found. Please try logging in again.' },
        { status: 404 }
      );
    }

    const {
      propertyId,
      roomTypeId,
      checkIn,
      checkOut,
      guests,
      rooms = 1,
      totalPrice,
      notes,
      // 'pay_at_property' (default) or 'stripe'
      paymentMethod = 'pay_at_property',
    } = body;

    // Validate required fields
    if (!propertyId || !roomTypeId || !checkIn || !checkOut || !guests) {
      return NextResponse.json(
        { error: 'Missing required booking details' },
        { status: 400 }
      );
    }

    // NOTE: raw card numbers / CVVs are never accepted or stored (PCI compliance).
    // Online card payment goes through Stripe Checkout; otherwise pay at property.
    if (paymentMethod === 'stripe' && !isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Online card payment is not enabled. Please choose "Pay at property".' },
        { status: 400 }
      );
    }

    // Handle date strings - could be ISO datetime or YYYY-MM-DD
    const cleanCheckIn = typeof checkIn === 'string' && checkIn.includes('T')
      ? checkIn.split('T')[0]
      : checkIn;
    const cleanCheckOut = typeof checkOut === 'string' && checkOut.includes('T')
      ? checkOut.trim()
      : toDateString(checkOut);

    // Validate date format first
    if (!cleanCheckIn || !cleanCheckOut) {
      return NextResponse.json(
        { error: 'Invalid date format. Please use YYYY-MM-DD format.' },
        { status: 400 }
      );
    }

    // Convert string dates to Date objects using timezone-safe parsing
    const checkInDate = parseBookingDate(cleanCheckIn);
    const checkOutDate = parseBookingDate(cleanCheckOut);

    // Double-check date validity after parsing
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date values. Please provide valid dates.' },
        { status: 400 }
      );
    }

    // Validate date logic
    if (checkInDate >= checkOutDate) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }

    // Get today's date at the start of day UTC for fair comparison
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (checkInDate < today) {
      return NextResponse.json(
        { error: 'Check-in date cannot be in the past' },
        { status: 400 }
      );
    }

    // Ensure booking period is reasonable (e.g., not more than 30 days)
    const daysDiff = (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 30) {
      return NextResponse.json(
        { error: 'Bookings cannot exceed 30 days' },
        { status: 400 }
      );
    }

    // Check if the room type exists and has enough available rooms
    const roomType = await prisma.roomType.findUnique({
      where: {
        id: roomTypeId,
        isActive: true,
      },
      include: { property: true },
    });

    if (!roomType) {
      return NextResponse.json(
        { error: 'Selected room type not found or not available' },
        { status: 404 }
      );
    }

    // Get all bookings that overlap with our date range
    const existingBookings = await prisma.booking.findMany({
      where: {
        roomTypeId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        AND: [
          { checkIn: { lt: checkOutDate } },
          { checkOut: { gt: checkInDate } }
        ]
      },
      select: {
        rooms: true,
        checkIn: true,
        checkOut: true
      }
    });

    // Get all dates in our booking range using the timezone-safe utility
    const bookingDates = getDateRange(checkInDate, checkOutDate);

    // Calculate max rooms booked on any single day in our date range
    let maxBookedRooms = 0;

    for (const dateStr of bookingDates) {
      const currentDate = parseBookingDate(dateStr);
      let bookedOnThisDate = 0;

      for (const booking of existingBookings) {
        const bookingStart = parseBookingDate(booking.checkIn);
        const bookingEnd = parseBookingDate(booking.checkOut);

        if (currentDate >= bookingStart && currentDate < bookingEnd) {
          bookedOnThisDate += booking.rooms || 1;
        }
      }

      maxBookedRooms = Math.max(maxBookedRooms, bookedOnThisDate);
    }

    // Calculate available rooms based on the day with most bookings
    const availableRooms = Math.max(0, roomType.totalRooms - maxBookedRooms);

    // Check if there are enough available rooms
    if (availableRooms < rooms) {
      return NextResponse.json(
        { error: `Not enough rooms available. Only ${availableRooms} rooms available.` },
        { status: 400 }
      );
    }

    const finalPrice = totalPrice || parseFloat(roomType.basePrice.toString()) * rooms;

    // Import the room availability update function
    const { updateRoomAvailability } = await import('@/lib/room-availability');

    // ---- Stripe path: create a PENDING booking, then a Checkout Session ----
    if (paymentMethod === 'stripe') {
      const stripe = getStripe();
      const booking = await prisma.$transaction(async (tx: any) => {
        const newBooking = await tx.booking.create({
          data: {
            userId,
            propertyId,
            roomTypeId,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests,
            rooms,
            totalPrice: finalPrice,
            status: 'PENDING',
            paymentStatus: 'AWAITING_PAYMENT',
            notes: notes || null,
            statusHistory: {
              create: { status: 'PENDING', notes: 'Booking created — awaiting Stripe payment' }
            }
          }
        });
        return newBooking;
      });

      const siteUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${roomType.property.name} — ${roomType.name}`,
                description: `${cleanCheckIn} → ${cleanCheckOut}, ${rooms} room(s), ${guests} guest(s)`,
              },
              unit_amount: Math.round(finalPrice * 100),
            },
            quantity: 1,
          },
        ],
        metadata: { bookingId: booking.id },
        success_url: `${siteUrl}/bookings/${booking.id}?payment=success`,
        cancel_url: `${siteUrl}/bookings/${booking.id}?payment=cancelled`,
      });

      await prisma.booking.update({
        where: { id: booking.id },
        data: { stripeCheckoutSessionId: checkoutSession.id },
      });

      return NextResponse.json({
        success: true,
        requiresPayment: true,
        checkoutUrl: checkoutSession.url,
        booking: { id: booking.id, status: booking.status },
      });
    }

    // ---- Pay-at-property path (default) ----
    const booking = await prisma.$transaction(async (tx: any) => {
      const newBooking = await tx.booking.create({
        data: {
          userId,
          propertyId,
          roomTypeId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guests,
          rooms,
          totalPrice: finalPrice,
          status: 'PENDING',
          paymentStatus: 'PAY_AT_PROPERTY',
          notes: notes || null,
          statusHistory: {
            create: { status: 'PENDING', notes: 'Booking created — pay at property' }
          }
        }
      });
      return newBooking;
    });

    // Update room availability records after transaction is complete
    await updateRoomAvailability(
      roomTypeId,
      checkInDate,
      checkOutDate,
      rooms,
      false // Not a cancellation
    );

    // Send confirmation email (skipped silently when Resend is not configured)
    const guestName = `${userExists.firstName} ${userExists.lastName}`.trim();
    await sendBookingConfirmation({
      to: userExists.email,
      guestName: guestName || userExists.email,
      propertyName: roomType.property.name,
      roomTypeName: roomType.name,
      checkIn: cleanCheckIn,
      checkOut: cleanCheckOut,
      guests,
      rooms,
      totalPrice: finalPrice.toString(),
      bookingId: booking.id,
      paymentStatus: 'PAY_AT_PROPERTY',
    });

    return NextResponse.json({
      success: true,
      requiresPayment: false,
      booking: {
        id: booking.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        status: booking.status,
        paymentStatus: 'PAY_AT_PROPERTY',
      }
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    // Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    // Build the query
    type BookingWhereClause = {
      userId?: string;
      status?: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
    };

    const whereClause: BookingWhereClause = {};

    // If not admin, only show the user's bookings
    if (!isAdmin) {
      whereClause.userId = userId;
    }

    // Filter by status if provided
    if (status) {
      const upperStatus = status.toUpperCase();
      if (['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(upperStatus)) {
        whereClause.status = upperStatus as "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
      }
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause as Record<string, unknown>,
      include: {
        property: {
          select: {
            name: true,
            city: true,
            state: true,
            photos: {
              where: { isMain: true },
              take: 1
            }
          }
        },
        roomType: {
          select: {
            name: true,
            capacity: true,
            photos: {
              orderBy: { isMain: 'desc' },
              take: 3
            }
          }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(bookings);

  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
