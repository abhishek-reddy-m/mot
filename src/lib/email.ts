import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM || 'Motel Booking <noreply@motelbooking.com>';

let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  console.warn('RESEND_API_KEY is not set — booking confirmation emails are disabled.');
}

const escapeHtml = (v: unknown) =>
  String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function isEmailConfigured(): boolean {
  return resend !== null;
}

interface BookingEmailData {
  to: string;
  guestName: string;
  propertyName: string;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalPrice: string;
  bookingId: string;
  paymentStatus: string;
}

/** Send a booking confirmation email. Silently skips (logs) when Resend is not configured. */
export async function sendBookingConfirmation(data: BookingEmailData): Promise<void> {
  if (!resend) {
    console.log(`[email] Skipping confirmation email to ${data.to} (RESEND_API_KEY not configured)`);
    return;
  }
  // Guest-entered values are escaped before going into HTML.
  const e = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, escapeHtml(v)])) as Record<keyof BookingEmailData, string>;
  try {
    await resend.emails.send({
      from: fromAddress,
      to: data.to,
      subject: `Booking confirmed — ${data.propertyName.replace(/[\r\n]/g, ' ')}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your booking is confirmed</h2>
          <p>Hi ${e.guestName},</p>
          <p>Thank you for booking with <strong>${e.propertyName}</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Booking ID</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${e.bookingId}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Room</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${e.roomTypeName}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Check-in</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${e.checkIn}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Check-out</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${e.checkOut}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Guests</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${e.guests}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Rooms</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${e.rooms}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Total</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">$${e.totalPrice}</td></tr>
            <tr><td style="padding: 8px;"><strong>Payment</strong></td><td style="padding: 8px;">${data.paymentStatus === 'PAID' ? 'Paid online' : 'Pay at property'}</td></tr>
          </table>
          <p>We look forward to hosting you!</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('[email] Failed to send booking confirmation:', error);
  }
}
