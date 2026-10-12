/**
 * Agentic-mode tool layer.
 *
 * These tools are the single implementation behind BOTH:
 *  1. the deterministic intent parser (src/lib/agent/intents.ts) — live today,
 *     no LLM key required;
 *  2. a future LLM tool-calling router (src/lib/agent/router.ts) — plugs in
 *     behind the OPENAI_API_KEY / AGENT_LLM_ENABLED feature flag when keys exist.
 *
 * The tool surface mirrors the agent API contracts in
 * ~/workspace/motel-saas/docs/agent-api-contracts.md
 * (getAvailability, getReservation, listArrivals/listDepartures, getRates,
 * getProperty). Write tools (createBookingHold, cancelBooking, modifyBooking)
 * are intentionally NOT exposed to the deterministic parser — they stay
 * LLM-gated in the contract (agent:write scope) and are stubbed in router.ts.
 *
 * Every tool reads real DB data and is always scoped to one propertyId.
 */

import { prisma } from '@/lib/prisma';
import { getAvailableRooms } from '@/lib/room-availability';

export interface AgentContext {
  propertyId: string;
  userId: string;
}

export interface AgentLink {
  label: string;
  href: string;
}

export interface ToolResult {
  ok: boolean;
  summary: string;
  data?: unknown;
  links?: AgentLink[];
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN'] as const;

export async function toolGetProperty(ctx: AgentContext): Promise<ToolResult> {
  const property = await prisma.property.findUnique({
    where: { id: ctx.propertyId },
    include: { roomTypes: { where: { isActive: true }, select: { id: true, name: true, capacity: true, basePrice: true, totalRooms: true } } },
  });
  if (!property) return { ok: false, summary: 'Property not found.' };
  return {
    ok: true,
    summary: `${property.name} — ${property.address}, ${property.city}, ${property.state} ${property.zipCode}. Phone: ${property.phone}. ${property.roomTypes.length} room type(s).`,
    data: {
      name: property.name,
      address: `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`,
      phone: property.phone,
      roomTypes: property.roomTypes.map((r) => ({ name: r.name, capacity: r.capacity, basePrice: Number(r.basePrice), totalRooms: r.totalRooms })),
    },
    links: [{ label: 'View booking site', href: `/properties/${property.id}` }],
  };
}

export async function toolListArrivals(ctx: AgentContext, date: Date): Promise<ToolResult> {
  const from = startOfDay(date);
  const to = addDays(from, 1);
  const bookings = await prisma.booking.findMany({
    where: {
      propertyId: ctx.propertyId,
      checkIn: { gte: from, lt: to },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    include: { user: { select: { firstName: true, lastName: true } }, roomType: { select: { name: true } } },
    orderBy: { checkIn: 'asc' },
  });
  if (bookings.length === 0) {
    return { ok: true, summary: `No arrivals scheduled for ${fmtDate(date)}.`, data: { count: 0, date: fmtDate(date) } };
  }
  const lines = bookings.map(
    (b) => `• ${b.user.firstName} ${b.user.lastName} — ${b.roomType.name}, ${b.guests} guest(s), ${b.rooms} room(s)`
  );
  return {
    ok: true,
    summary: `${bookings.length} arrival(s) on ${fmtDate(date)}:\n${lines.join('\n')}`,
    data: { count: bookings.length, arrivals: bookings.map((b) => ({ id: b.id, guest: `${b.user.firstName} ${b.user.lastName}`, roomType: b.roomType.name })) },
    links: [{ label: 'Open front desk', href: '/front-desk' }],
  };
}

export async function toolListDepartures(ctx: AgentContext, date: Date): Promise<ToolResult> {
  const from = startOfDay(date);
  const to = addDays(from, 1);
  const bookings = await prisma.booking.findMany({
    where: {
      propertyId: ctx.propertyId,
      checkOut: { gte: from, lt: to },
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
    },
    include: { user: { select: { firstName: true, lastName: true } }, roomType: { select: { name: true } } },
    orderBy: { checkOut: 'asc' },
  });
  if (bookings.length === 0) {
    return { ok: true, summary: `No departures scheduled for ${fmtDate(date)}.`, data: { count: 0 } };
  }
  const lines = bookings.map(
    (b) => `• ${b.user.firstName} ${b.user.lastName} — ${b.roomType.name} (status: ${b.status})`
  );
  return {
    ok: true,
    summary: `${bookings.length} departure(s) on ${fmtDate(date)}:\n${lines.join('\n')}`,
    data: { count: bookings.length },
    links: [{ label: 'Open front desk', href: '/front-desk' }],
  };
}

export async function toolGetAvailability(
  ctx: AgentContext,
  checkIn: Date,
  checkOut: Date,
  guests = 2
): Promise<ToolResult> {
  const roomTypes = await prisma.roomType.findMany({
    where: { propertyId: ctx.propertyId, isActive: true, capacity: { gte: guests } },
    orderBy: { basePrice: 'asc' },
  });
  if (roomTypes.length === 0) {
    return { ok: false, summary: `No room types accommodate ${guests} guest(s).` };
  }
  const rows: string[] = [];
  let anyAvailable = false;
  for (const rt of roomTypes) {
    try {
      const { availableRooms } = await getAvailableRooms(rt.id, checkIn, checkOut);
      const price = Number(rt.basePrice);
      if (availableRooms > 0) {
        anyAvailable = true;
        rows.push(`• ${rt.name}: ${availableRooms} available, from ${fmtMoney(price)}/night`);
      } else {
        rows.push(`• ${rt.name}: sold out`);
      }
    } catch {
      rows.push(`• ${rt.name}: availability unknown`);
    }
  }
  const range = `${fmtDate(checkIn)} → ${fmtDate(checkOut)}`;
  return {
    ok: true,
    summary: anyAvailable
      ? `Availability for ${range} (${guests} guest(s)):\n${rows.join('\n')}`
      : `No availability for ${range} (${guests} guest(s)).\n${rows.join('\n')}`,
    data: { checkIn: checkIn.toISOString(), checkOut: checkOut.toISOString(), guests },
    links: [{ label: 'View rooms', href: '/properties' }],
  };
}

export async function toolGetReservation(ctx: AgentContext, id: string): Promise<ToolResult> {
  const booking = await prisma.booking.findFirst({
    where: { id, propertyId: ctx.propertyId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      roomType: { select: { name: true } },
      property: { select: { name: true } },
    },
  });
  if (!booking) {
    return { ok: false, summary: `I couldn't find a reservation with ID "${id}" at this property.` };
  }
  return {
    ok: true,
    summary:
      `Reservation ${booking.id}:\n` +
      `• Guest: ${booking.user.firstName} ${booking.user.lastName} (${booking.user.email})\n` +
      `• Room: ${booking.roomType.name}, ${booking.rooms} room(s), ${booking.guests} guest(s)\n` +
      `• Dates: ${fmtDate(new Date(booking.checkIn))} → ${fmtDate(new Date(booking.checkOut))}\n` +
      `• Total: ${fmtMoney(Number(booking.totalPrice))} — status ${booking.status}, payment ${booking.paymentStatus ?? 'UNPAID'}`,
    data: { id: booking.id, status: booking.status },
    links: [
      { label: 'Open in admin', href: `/admin/bookings/${booking.id}` },
      { label: 'Open front desk', href: '/front-desk' },
    ],
  };
}

export async function toolSearchReservations(ctx: AgentContext, name: string): Promise<ToolResult> {
  const q = name.trim();
  if (q.length < 2) return { ok: false, summary: 'Please give me a bit more of the guest name to search.' };
  const bookings = await prisma.booking.findMany({
    where: {
      propertyId: ctx.propertyId,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      user: {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
    },
    include: { user: { select: { firstName: true, lastName: true } }, roomType: { select: { name: true } } },
    orderBy: { checkIn: 'desc' },
    take: 10,
  });
  if (bookings.length === 0) {
    return { ok: true, summary: `No active reservations match "${q}".`, data: { count: 0 } };
  }
  const lines = bookings.map(
    (b) => `• ${b.user.firstName} ${b.user.lastName} — ${b.roomType.name}, ${fmtDate(new Date(b.checkIn))} → ${fmtDate(new Date(b.checkOut))} (${b.status}) [${b.id.slice(0, 8)}]`
  );
  return {
    ok: true,
    summary: `${bookings.length} match(es) for "${q}":\n${lines.join('\n')}`,
    data: { matches: bookings.map((b) => ({ id: b.id, guest: `${b.user.firstName} ${b.user.lastName}`, status: b.status })) },
    links: [{ label: 'Open front desk', href: '/front-desk' }],
  };
}

export async function toolGetOccupancy(ctx: AgentContext, from: Date, to: Date): Promise<ToolResult> {
  const roomTypes = await prisma.roomType.findMany({
    where: { propertyId: ctx.propertyId, isActive: true },
    select: { id: true, totalRooms: true },
  });
  const totalRooms = roomTypes.reduce((s, r) => s + r.totalRooms, 0);
  if (totalRooms === 0) {
    return { ok: false, summary: 'This property has no rooms configured yet.' };
  }
  const days: string[] = [];
  let bookedNights = 0;
  let dayCount = 0;
  for (let d = startOfDay(from); d < startOfDay(to); d = addDays(d, 1)) {
    const next = addDays(d, 1);
    const agg = await prisma.booking.aggregate({
      where: {
        propertyId: ctx.propertyId,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        checkIn: { lt: next },
        checkOut: { gt: d },
      },
      _sum: { rooms: true },
    });
    const booked = agg._sum.rooms ?? 0;
    const pct = Math.min(100, Math.round((booked / totalRooms) * 100));
    days.push(`${fmtDate(d)}: ${pct}% (${booked}/${totalRooms} rooms)`);
    bookedNights += booked;
    dayCount += 1;
  }
  const avg = dayCount > 0 ? Math.round((bookedNights / (totalRooms * dayCount)) * 100) : 0;
  return {
    ok: true,
    summary: `Occupancy ${fmtDate(from)} → ${fmtDate(addDays(to, -1))} (avg ${avg}%):\n${days.join('\n')}`,
    data: { averagePct: avg, totalRooms },
    links: [{ label: 'Open admin dashboard', href: '/admin/dashboard' }],
  };
}
