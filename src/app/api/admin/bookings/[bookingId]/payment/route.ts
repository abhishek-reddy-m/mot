import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt, maskCardNumber, formatCardNumber } from '@/lib/encryption';

// GET decrypted payment details for a booking (admin only)
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
    
    // Get full booking record
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Decrypt payment details
    let decryptedCardNumber = '';
    let decryptedCvv = '';
    let maskedCardNum = '';
    let formattedCardNum = '';
    
    // Access fields using bracket notation to avoid TS issues with newly added fields
    const cardNumberEncrypted = (booking as any).cardNumber;
    const cardCvvEncrypted = (booking as any).cardCvv;
    const cardLast4 = (booking as any).cardLast4;
    const cardBrand = (booking as any).cardBrand;
    const cardExpMonth = (booking as any).cardExpMonth;
    const cardExpYear = (booking as any).cardExpYear;
    const billingName = (booking as any).billingName;
    const billingZip = (booking as any).billingZip;
    
    if (cardNumberEncrypted) {
      decryptedCardNumber = decrypt(cardNumberEncrypted);
      maskedCardNum = maskCardNumber(decryptedCardNumber);
      formattedCardNum = formatCardNumber(decryptedCardNumber);
    }
    
    if (cardCvvEncrypted) {
      decryptedCvv = decrypt(cardCvvEncrypted);
    }

    return NextResponse.json({
      id: booking.id,
      cardNumber: formattedCardNum, // Full card number (formatted with spaces)
      maskedCardNumber: maskedCardNum, // Masked version for initial display
      cardLast4: cardLast4,
      cardBrand: cardBrand,
      cardExpMonth: cardExpMonth,
      cardExpYear: cardExpYear,
      cardCvv: decryptedCvv,
      billingName: billingName,
      billingZip: billingZip,
    });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
