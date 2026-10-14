/**
 * Server-side execution of the guest voice agent's tools. Every answer is
 * read from live data with the same services the booking site uses.
 */
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { HOTEL_TIMEZONE, diffDays, formatDay, hotelToday, isISODate, toISODate } from '../dates';
import { DomainError, badRequest } from '../errors';
import { propertyAvailability } from '../services/inventory';
import { policyFor } from '../services/guest';

const isoDate = z.string().refine(isISODate, 'must be YYYY-MM-DD');

export async function propertyFacts(propertyId: string) {
  const p = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: { roomTypes: { where: { isActive: true }, orderBy: { basePrice: 'asc' } }, voiceAgent: true },
  });
  const faqs = Array.isArray(p.voiceAgent?.faqs) ? (p.voiceAgent!.faqs as { q?: string; a?: string }[]).filter((f) => f?.q && f?.a) : [];
  return {
    name: p.name,
    type: p.type,
    tagline: p.tagline,
    description: p.description,
    address: `${p.address}, ${p.city}, ${p.state} ${p.zipCode}`,
    phone: p.phone,
    email: p.email,
    amenities: p.amenities,
    check_in: 'from 3:00 PM',
    check_out: 'by 11:00 AM',
    cancellation: 'Free cancellation and date changes until 3:00 PM (hotel time) the day before arrival.',
    room_types: p.roomTypes.map((rt) => ({ id: rt.id, name: rt.name, sleeps: rt.capacity, from_price_per_night: Number(rt.basePrice), amenities: rt.amenities, description: rt.description })),
    faqs,
  };
}

/** Where a guest conversation is happening: the booking page, or the hotel's phone line (with the caller ID, if any). */
export type GuestChannel = { kind: 'WEB' } | { kind: 'PHONE'; callerNumber: string | null };

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

export async function runGuestTool(propertyId: string, name: string, rawArgs: unknown, channel: GuestChannel = { kind: 'WEB' }): Promise<unknown> {
  const phone = channel.kind === 'PHONE';
  switch (name) {
    case 'get_property_info':
      return propertyFacts(propertyId);

    case 'check_availability': {
      const a = z.object({ check_in: isoDate, check_out: isoDate, guests: z.number().int().min(1).max(16), rooms: z.number().int().min(1).max(9) }).parse(rawArgs);
      const today = hotelToday();
      if (a.check_in < today) return { error: `Check-in can’t be in the past — today is ${formatDay(today, 'weekday')}.` };
      if (a.check_out <= a.check_in) return { error: 'Check-out must be after check-in.' };
      if (diffDays(a.check_in, a.check_out) > 30) return { error: 'Online stays are limited to 30 nights; offer to take a message for longer stays.' };
      const types = await propertyAvailability({ propertyId, checkIn: a.check_in, checkOut: a.check_out, guests: a.guests, rooms: a.rooms });
      const nights = diffDays(a.check_in, a.check_out);
      return {
        stay: `${formatDay(a.check_in, 'weekday')} to ${formatDay(a.check_out, 'weekday')}, ${nights} night${nights > 1 ? 's' : ''}, ${a.guests} guest${a.guests > 1 ? 's' : ''}${a.rooms > 1 ? `, ${a.rooms} rooms` : ''}`,
        options: types.map((t) => ({
          room_type_id: t.id,
          name: t.name,
          sleeps: t.capacity,
          fits_party: t.capacity * a.rooms >= a.guests,
          available: t.available >= a.rooms,
          rooms_left: t.available,
          average_per_night: t.quote?.averageNightly ?? null,
          total: t.quote?.total ?? null,
        })),
      };
    }

    case 'start_booking': {
      if (phone) return { error: 'There’s no screen on a phone call — use request_booking instead.' };
      const a = z.object({ room_type_id: z.string().min(1), check_in: isoDate, check_out: isoDate, guests: z.number().int().min(1).max(16), rooms: z.number().int().min(1).max(9) }).parse(rawArgs);
      const rt = await prisma.roomType.findFirst({ where: { id: a.room_type_id, propertyId, isActive: true }, select: { id: true, name: true } });
      if (!rt) return { error: 'That room type isn’t available here — check availability again.' };
      const q = new URLSearchParams({ roomTypeId: rt.id, checkIn: a.check_in, checkOut: a.check_out, guests: String(a.guests), rooms: String(a.rooms) });
      return { opened: true, room: rt.name, url: `/properties/${propertyId}/book?${q}`, say: `I’ve opened the checkout for the ${rt.name} on your screen.` };
    }

    case 'find_booking': {
      const a = z.object({ confirmation_code: z.string().min(4).max(20), last_name: z.string().min(1).max(60) }).parse(rawArgs);
      const code = a.confirmation_code.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const b = await prisma.booking.findFirst({
        where: { propertyId, code, user: { lastName: { equals: a.last_name.trim(), mode: 'insensitive' } } },
        include: { roomType: { select: { name: true } } },
      });
      // Same answer for a wrong code or a wrong name: don't confirm either alone.
      if (!b) return { found: false, say: 'I couldn’t find a booking with that code and last name.' };
      const checkIn = toISODate(b.checkIn);
      const policy = policyFor(checkIn);
      return {
        found: true,
        status: b.status,
        room: b.roomType.name,
        check_in: formatDay(checkIn, 'weekday'),
        check_out: formatDay(toISODate(b.checkOut), 'weekday'),
        guests: b.guests,
        free_changes_until: policy.passed ? null : policy.deadlineLabel,
        manage: 'The guest can change dates or cancel from the link in their confirmation, or by signing in at the booking site.',
      };
    }

    case 'request_booking': {
      if (!phone) return { error: 'Use start_booking to open the checkout on the guest’s screen.' };
      const a = z
        .object({
          room_type_id: z.string().min(1),
          check_in: isoDate,
          check_out: isoDate,
          guests: z.number().int().min(1).max(16),
          rooms: z.number().int().min(1).max(9),
          name: z.string().trim().min(1).max(120),
          email: optionalText(200),
          phone: optionalText(40),
          notes: optionalText(500),
        })
        .parse(rawArgs);
      const callback = a.phone || channel.callerNumber;
      if (!callback && !a.email) return { error: 'Ask for an email or a callback number so the team can confirm the booking.' };
      const today = hotelToday();
      if (a.check_in < today) return { error: `Check-in can’t be in the past — today is ${formatDay(today, 'weekday')}.` };
      if (a.check_out <= a.check_in) return { error: 'Check-out must be after check-in.' };
      if (diffDays(a.check_in, a.check_out) > 30) return { error: 'Stays over 30 nights go through the team — take a message instead.' };
      const rt = await prisma.roomType.findFirst({ where: { id: a.room_type_id, propertyId, isActive: true }, select: { id: true, name: true } });
      if (!rt) return { error: 'That room type isn’t available here — check availability again.' };
      const option = (await propertyAvailability({ propertyId, checkIn: a.check_in, checkOut: a.check_out, guests: a.guests, rooms: a.rooms })).find((t) => t.id === rt.id);
      if (!option || option.available < a.rooms) return { error: `The ${rt.name} is no longer free for those dates — check availability again.` };
      const nights = diffDays(a.check_in, a.check_out);
      const total = option.quote?.total ?? null;
      const message = [
        `Phone booking request: ${rt.name}, ${formatDay(a.check_in, 'weekday')} to ${formatDay(a.check_out, 'weekday')} (${nights} night${nights > 1 ? 's' : ''}), ${a.guests} guest${a.guests > 1 ? 's' : ''}${a.rooms > 1 ? `, ${a.rooms} rooms` : ''}.`,
        total !== null ? `Quoted total: $${total}.` : '',
        a.notes ? `Notes: ${a.notes}` : '',
        'Confirm with the guest and send a secure payment link.',
      ]
        .filter(Boolean)
        .join(' ');
      const r = await prisma.guestRequest.create({ data: { propertyId, name: a.name, phone: callback || null, email: a.email || null, message, source: 'PHONE' } });
      return {
        saved: true,
        reference: r.id.slice(-6).toUpperCase(),
        quoted_total: total,
        say: `I’ve sent your request to the team — they’ll confirm and send ${a.email ? 'a secure payment link by email' : 'you a secure payment link'}. It isn’t booked until then.`,
      };
    }

    case 'leave_message': {
      const a = z.object({ name: z.string().trim().min(1).max(120), phone: optionalText(40), email: optionalText(200), message: z.string().trim().min(1).max(1000) }).parse(rawArgs);
      // On the phone, the caller ID is the callback number unless they gave another.
      const callback = a.phone || (phone ? channel.callerNumber : null);
      if (!callback && !a.email) return { error: 'Ask for a phone number or email so the team can reply.' };
      const r = await prisma.guestRequest.create({ data: { propertyId, name: a.name, phone: callback || null, email: a.email || null, message: a.message, ...(phone ? { source: 'PHONE' } : {}) } });
      return { saved: true, reference: r.id.slice(-6).toUpperCase(), say: 'I’ve passed that to the team — they’ll get back to you.' };
    }

    default:
      throw badRequest(`Unknown tool ${name}.`);
  }
}

export const guestContext = () => ({ today: hotelToday(), timezone: HOTEL_TIMEZONE });

/**
 * Run a tool and always return something the model can use: validation
 * problems go back so it can correct itself, domain errors are written for
 * people, and anything else stays in the logs.
 */
export async function guestToolOutput(propertyId: string, name: string, args: unknown, channel?: GuestChannel): Promise<unknown> {
  try {
    return await runGuestTool(propertyId, name, args, channel);
  } catch (e) {
    if (!(e instanceof z.ZodError) && !(e instanceof DomainError)) console.error('voice tool failed', name, e);
    return {
      error:
        e instanceof z.ZodError
          ? `Invalid arguments: ${e.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`
          : e instanceof DomainError
            ? e.message
            : 'That lookup failed — offer to take a message for the team instead.',
    };
  }
}
