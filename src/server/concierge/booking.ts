/**
 * Booking for agents: a pre-filled checkout link (the guest pays and books
 * themselves), a request the hotel team confirms, a direct pay-at-hotel
 * booking for trusted API keys, and looking up an existing booking.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isDemoEmail } from '@/config/product';
import { diffDays, toISODate } from '../dates';
import { DomainError, badRequest, forbidden } from '../errors';
import { isEmailConfigured, sendBookingConfirmation } from '../email';
import { confirmationEmailAllowed, confirmPayAtProperty, createBooking as createSiteBooking } from '../services/bookings';
import { policyFor } from '../services/guest';
import { CURRENCY } from './facts';
import { findListedHotel } from './hotel';
import { conciergeSchemas, type BookingLinkInput, type CreateBookingInput, type FindBookingInput, type RequestBookingInput } from './schemas';
import { bookableStay, lookupBooking, submitBookingRequest, type BookingRequestSaved } from './shared';
import { bookingPageUrl, checkoutPath, siteUrl } from './urls';

// ---------------------------------------------------------------------------
// Checkout link
// ---------------------------------------------------------------------------

/** What `bookingLink` returns. */
export interface BookingLinkResult {
  /** Absolute URL of the pre-filled checkout; the guest signs in (or registers) and pays there. */
  url: string;
  summary: {
    hotel: { id: string; name: string };
    roomType: { id: string; name: string; sleeps: number };
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    rooms: number;
    /** Per room, USD. */
    averageNightly: number;
    /** Whole stay, all rooms, USD. */
    total: number;
    currency: typeof CURRENCY;
    /** Rooms of this type still free for every night. */
    roomsLeft: number;
  };
  expiresNote: string;
}

/**
 * A link to the hotel's own checkout with the room, dates and party (and
 * optionally the guest's name, email and phone) pre-filled — the same page
 * the guest voice tool `start_booking` opens. Checks the room type belongs to
 * the listed hotel and the stay is bookable right now; DomainError 400 (rules,
 * e.g. sold out or too many guests) or 404 (hotel) otherwise.
 */
export async function bookingLink(input: BookingLinkInput): Promise<BookingLinkResult> {
  const a = conciergeSchemas.bookingLink.parse(input);
  const hotel = await findListedHotel(a.propertyId);
  const stay = await bookableStay(hotel.id, a, 'Stays are limited to 30 nights online.');
  if ('error' in stay) throw badRequest(stay.error);
  const path = checkoutPath(hotel.id, { roomTypeId: stay.roomType.id, checkIn: a.checkIn, checkOut: a.checkOut, guests: a.guests, rooms: a.rooms }, a.guest);
  return {
    url: siteUrl(path),
    summary: {
      hotel,
      roomType: { id: stay.roomType.id, name: stay.roomType.name, sleeps: stay.roomType.capacity },
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      nights: stay.nights,
      guests: a.guests,
      rooms: a.rooms,
      averageNightly: stay.quote.averageNightly,
      total: stay.quote.total,
      currency: CURRENCY,
      roomsLeft: stay.quote.available,
    },
    expiresNote: 'The link doesn’t hold the room: availability and the price are confirmed when the guest completes checkout.',
  };
}

// ---------------------------------------------------------------------------
// Booking request (the hotel team confirms)
// ---------------------------------------------------------------------------

/** What `requestBooking` returns: the phone line's `request_booking` result. */
export type RequestBookingResult = BookingRequestSaved;

/** Requests from assistants per hotel per hour, so one integration can't flood a team's inbox. */
const AGENT_REQUESTS_PER_HOTEL_HOUR = () => Number(process.env.CONCIERGE_MAX_REQUESTS_PER_HOTEL_HOUR || 20);

/**
 * Sends a booking request to the hotel team — the phone line's
 * `request_booking`: the stay is validated and quoted, and the team confirms
 * with the guest and sends them the pre-filled checkout link; it isn't booked
 * until then. Needs an email or phone. `source` (AGENT, default, or VOICE) is
 * stored on the request. Requests through here are capped per hotel per hour
 * (CONCIERGE_MAX_REQUESTS_PER_HOTEL_HOUR, default 20; 429). Rule failures
 * throw DomainError 400 with the phone tool's message.
 */
export async function requestBooking(input: RequestBookingInput): Promise<RequestBookingResult> {
  const a = conciergeSchemas.requestBooking.parse(input);
  const hotel = await findListedHotel(a.propertyId);
  const recent = await prisma.guestRequest.count({ where: { propertyId: hotel.id, source: { in: ['AGENT', 'VOICE'] }, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (recent >= AGENT_REQUESTS_PER_HOTEL_HOUR()) throw new DomainError(429, 'RATE_LIMITED', `${hotel.name} has a lot of requests right now — try again later or send the guest a booking link instead.`);
  const r = await submitBookingRequest(hotel.id, { ...a, email: a.email ?? null, phone: a.phone ?? null, notes: a.notes ?? null });
  if ('error' in r) throw badRequest(r.error);
  return r;
}

// ---------------------------------------------------------------------------
// Direct booking (trusted API keys)
// ---------------------------------------------------------------------------

/** What `createBooking` returns. */
export interface CreateBookingResult {
  bookingId: string;
  /** Confirmation code the guest quotes (also used by findBooking). */
  code: string;
  status: 'CONFIRMED';
  /** Whole stay, all rooms, USD — priced by the server from the rate calendar. */
  total: number;
  currency: typeof CURRENCY;
  paymentStatus: 'PAY_AT_PROPERTY';
  hotel: { id: string; name: string };
  roomType: { id: string; name: string };
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  rooms: number;
  /** The guest's booking page (they sign in with this email to see it). */
  bookingUrl: string;
  /** A confirmation email was handed to the mailer (false when email isn't configured or the hourly cap was hit). */
  confirmationEmailSent: boolean;
}

/**
 * The guest account a direct booking belongs to. Bookings need a user, so an
 * unknown email gets a CUSTOMER account with no password (like Google
 * sign-ups): nobody is signed in, and the account can't be used with a
 * password until one is set. Existing guest accounts are reused as they are
 * (name and phone unchanged). Demo logins, staff and inactive accounts are
 * refused with the same message, so this can't probe who works where.
 */
async function guestUserFor(guest: { name: string; email: string; phone?: string | null }): Promise<{ id: string; email: string; firstName: string; lastName: string }> {
  const refused = forbidden('That email can’t be used for this booking — use the guest’s own email address.');
  if (isDemoEmail(guest.email)) throw refused;
  const select = { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true } as const;
  const find = () => prisma.user.findFirst({ where: { email: { equals: guest.email, mode: 'insensitive' } }, select });
  let user = await find();
  if (!user) {
    const [firstName, ...rest] = guest.name.trim().split(/\s+/);
    try {
      user = await prisma.user.create({
        data: { email: guest.email, password: '', firstName, lastName: rest.join(' '), phone: guest.phone || null, role: 'CUSTOMER' },
        select,
      });
    } catch (e) {
      // Two bookings for a new email at once: use the account the other one made.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      user = await find();
    }
  }
  if (!user || user.role !== 'CUSTOMER' || !user.isActive) throw refused;
  return user;
}

/**
 * A confirmed, pay-at-hotel booking for trusted integrations (API keys with
 * the "book" scope — the caller checks that). Goes through the website's
 * booking service (serializable transaction, live availability, server-side
 * price = the quote) and is confirmed instantly like pay-at-property bookings
 * on the site; the guest gets the usual confirmation email when email is
 * configured. See `guestUserFor` for how the guest account is found or made.
 * DomainError 400/404/409 (sold out) / 403 (email refused).
 */
export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const a = conciergeSchemas.createBooking.parse(input);
  const hotel = await findListedHotel(a.propertyId);
  // Check the stay before making a guest account; the booking service re-checks inside its transaction.
  const stay = await bookableStay(hotel.id, a, 'Stays are limited to 30 nights online.');
  if ('error' in stay) throw badRequest(stay.error);
  const user = await guestUserFor(a.guest);
  const booking = await createSiteBooking({
    userId: user.id,
    propertyId: hotel.id,
    roomTypeId: a.roomTypeId,
    checkIn: a.checkIn,
    checkOut: a.checkOut,
    guests: a.guests,
    rooms: a.rooms,
    notes: a.notes,
    paymentStatus: 'PAY_AT_PROPERTY',
    createdVia: `Booked by ${a.source} — pay at property`,
  });
  await confirmPayAtProperty(booking.id);

  const total = Number(booking.totalPrice);
  const sendEmail = isEmailConfigured() && (await confirmationEmailAllowed(user.id));
  if (sendEmail) {
    await sendBookingConfirmation({
      to: user.email,
      guestName: `${user.firstName} ${user.lastName}`.trim() || user.email,
      propertyName: booking.property.name,
      roomTypeName: booking.roomType.name,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      guests: a.guests,
      rooms: a.rooms,
      totalPrice: total.toFixed(2),
      bookingId: booking.code ?? booking.id,
      paymentStatus: 'PAY_AT_PROPERTY',
    });
  }

  return {
    bookingId: booking.id,
    code: booking.code ?? booking.id,
    status: 'CONFIRMED',
    total,
    currency: CURRENCY,
    paymentStatus: 'PAY_AT_PROPERTY',
    hotel: { id: hotel.id, name: booking.property.name },
    roomType: { id: booking.roomTypeId, name: booking.roomType.name },
    checkIn: a.checkIn,
    checkOut: a.checkOut,
    nights: diffDays(a.checkIn, a.checkOut),
    guests: a.guests,
    rooms: a.rooms,
    bookingUrl: bookingPageUrl(booking.id),
    confirmationEmailSent: sendEmail,
  };
}

// ---------------------------------------------------------------------------
// Find a booking
// ---------------------------------------------------------------------------

/** What `findBooking` returns. A wrong code and a wrong name get the same `found: false`. */
export type FindBookingResult =
  | { found: false; message: string }
  | {
      found: true;
      code: string;
      status: string;
      hotel: { id: string; name: string; phone: string };
      room: string;
      checkIn: string;
      checkOut: string;
      nights: number;
      guests: number;
      rooms: number;
      /** "3:00 PM on Thu, Oct 22" while free changes are still possible, else null. */
      freeChangesUntil: string | null;
      manage: string;
      /** The guest's booking page (they sign in to change or cancel). */
      bookingUrl: string;
    };

/**
 * Looks up a booking by confirmation code and last name across all hotels —
 * the guest voice tool `find_booking`'s rules (both must match; the answer
 * never says which one was wrong). Callers on public endpoints should rate
 * limit this (consumeRateLimit) to stop code guessing.
 */
export async function findBooking(input: FindBookingInput): Promise<FindBookingResult> {
  const a = conciergeSchemas.findBooking.parse(input);
  const b = await lookupBooking({ code: a.code, lastName: a.lastName });
  if (!b) return { found: false, message: 'No booking matches that confirmation code and last name.' };
  const checkIn = toISODate(b.checkIn);
  const checkOut = toISODate(b.checkOut);
  const policy = policyFor(checkIn);
  return {
    found: true,
    code: b.code ?? a.code,
    status: b.status,
    hotel: b.property,
    room: b.roomType.name,
    checkIn,
    checkOut,
    nights: diffDays(checkIn, checkOut),
    guests: b.guests,
    rooms: b.rooms,
    freeChangesUntil: policy.passed ? null : policy.deadlineLabel,
    manage: 'The guest can change dates or cancel from the link in their confirmation, or by signing in at the booking site.',
    bookingUrl: bookingPageUrl(b.id),
  };
}
