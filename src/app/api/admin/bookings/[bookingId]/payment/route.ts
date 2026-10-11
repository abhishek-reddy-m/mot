import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET payment metadata for a booking (admin only).
// Raw card data is never stored (PCI compliance), so only safe metadata
// (status, last4, brand, Stripe references) is returned — never PANs or CVVs.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;

    // Check authentication - must be admin
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        paymentStatus: true,
        cardLast4: true,
        cardBrand: true,
        billingName: true,
        billingZip: true,
        stripeCheckoutSessionId: true,
        stripePaymentIntentId: true,
        totalPrice: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
