import crypto from 'crypto';
import type { BookingSource, OtaChannel, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getDateRange, parseBookingDate, toDateString } from '@/lib/date-utils';
import { updateRoomAvailability } from '@/lib/room-availability';
import { getAdapter } from './adapters';
import { ConnectionWithMappings, computeChannelDays, loadConnection, roundPrice } from './ari';
import { addDays, hotelToday, isDateString } from './dates';
import { errorMessage, logSync, scheduleInventorySync } from './sync';
import { CHANNEL_LABELS, ChannelApiError, OtaReservation, ReservationConfirmation } from './types';

const BOOKING_SOURCE: Record<OtaChannel, BookingSource> = {
  EXPEDIA: 'EXPEDIA',
  BOOKING_COM: 'BOOKING_COM',
};

export interface ImportResult {
  externalId: string;
  outcome: 'created' | 'updated' | 'cancelled' | 'skipped' | 'failed';
  bookingId?: string;
  message: string;
}

/**
 * OTA guests get a PMS customer record so the front desk sees their details.
 * Accounts have no password, so they can't be used to sign in with credentials.
 */
async function findOrCreateGuest(channel: OtaChannel, reservation: OtaReservation): Promise<string> {
  const email = (
    reservation.guest.email ||
    `${channel.toLowerCase()}-${reservation.reservationGroupId}@ota-guest.invalid`
  ).toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return existing.id;

  const user = await prisma.user.create({
    data: {
      email,
      password: '',
      firstName: reservation.guest.firstName.slice(0, 100),
      lastName: reservation.guest.lastName.slice(0, 100),
      phone: reservation.guest.phone,
      role: 'CUSTOMER',
    },
    select: { id: true },
  });
  return user.id;
}

function bookingNotes(channel: OtaChannel, reservation: OtaReservation): string {
  return [
    `${CHANNEL_LABELS[channel]} reservation ${reservation.reservationGroupId}`,
    reservation.paymentModel ? `Payment: ${reservation.paymentModel}` : null,
    reservation.specialRequests ? `Guest requests: ${reservation.specialRequests}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

async function freeRooms(roomTypeId: string, checkIn: string, checkOut: string, excludeBookingId?: string) {
  const roomType = await prisma.roomType.findUnique({ where: { id: roomTypeId }, select: { totalRooms: true } });
  const bookings = await prisma.booking.findMany({
    where: {
      roomTypeId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      checkIn: { lt: parseBookingDate(checkOut) },
      checkOut: { gt: parseBookingDate(checkIn) },
    },
    select: { checkIn: true, checkOut: true, rooms: true },
  });
  let maxBooked = 0;
  for (const night of getDateRange(checkIn, checkOut)) {
    const booked = bookings
      .filter((b) => toDateString(b.checkIn) <= night && toDateString(b.checkOut) > night)
      .reduce((sum, b) => sum + (b.rooms || 1), 0);
    maxBooked = Math.max(maxBooked, booked);
  }
  return Math.max(0, (roomType?.totalRooms ?? 0) - maxBooked);
}

async function cancelGroup(connection: ConnectionWithMappings, reservation: OtaReservation): Promise<ImportResult[]> {
  const records = await prisma.channelReservation.findMany({
    where: {
      connectionId: connection.id,
      OR: [
        { externalId: reservation.reservationGroupId },
        { externalId: { startsWith: `${reservation.reservationGroupId}-` } },
      ],
    },
    include: { booking: true },
  });
  if (records.length === 0) {
    return [{ externalId: reservation.externalId, outcome: 'skipped', message: 'Cancellation for unknown reservation' }];
  }

  const results: ImportResult[] = [];
  for (const record of records) {
    const booking = record.booking;
    if (booking && booking.status !== 'CANCELLED') {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          statusHistory: {
            create: { status: 'CANCELLED', notes: `Cancelled on ${CHANNEL_LABELS[connection.channel]}` },
          },
        },
      });
      await updateRoomAvailability(booking.roomTypeId, booking.checkIn, booking.checkOut, booking.rooms, true);
      scheduleInventorySync(booking.roomTypeId, booking.checkIn, booking.checkOut);
    }
    await prisma.channelReservation.update({
      where: { id: record.id },
      data: { status: 'CANCELLED', rawPayload: reservation.raw as Prisma.InputJsonValue },
    });
    results.push({
      externalId: record.externalId,
      outcome: 'cancelled',
      bookingId: booking?.id,
      message: `Cancelled booking ${booking?.id ?? '(none)'}`,
    });
  }
  return results;
}

/** Applies one OTA reservation message (new, modified or cancelled) to the PMS */
export async function importReservation(
  connection: ConnectionWithMappings,
  reservation: OtaReservation
): Promise<ImportResult[]> {
  if (reservation.action === 'CANCEL') {
    return cancelGroup(connection, reservation);
  }

  const mapping = connection.roomMappings.find((m) => m.otaRoomTypeId === reservation.otaRoomTypeId);
  if (!mapping) {
    return [
      {
        externalId: reservation.externalId,
        outcome: 'failed',
        message: `OTA room type ${reservation.otaRoomTypeId ?? '(missing)'} is not mapped to a PMS room type`,
      },
    ];
  }
  if (!isDateString(reservation.checkIn) || !isDateString(reservation.checkOut) || reservation.checkIn >= reservation.checkOut) {
    return [{ externalId: reservation.externalId, outcome: 'failed', message: 'Reservation has invalid stay dates' }];
  }

  const checkIn = reservation.checkIn;
  const checkOut = reservation.checkOut;
  const rooms = Math.max(1, reservation.rooms);
  const guests = Math.max(1, reservation.adults + reservation.children);
  const existing = await prisma.channelReservation.findUnique({
    where: { connectionId_externalId: { connectionId: connection.id, externalId: reservation.externalId } },
    include: { booking: true },
  });

  let totalPrice = reservation.totalAmount;
  if (totalPrice === null) {
    const days = await computeChannelDays(connection, checkIn, addDays(checkOut, -1), [mapping.roomTypeId]);
    totalPrice = roundPrice(days.reduce((sum, day) => sum + day.channelRate, 0) * rooms);
  }

  // OTA reservations are guaranteed on the OTA side - record them even when it overbooks
  const available = await freeRooms(mapping.roomTypeId, checkIn, checkOut, existing?.booking?.id);
  const overbooked = available < rooms;
  const notes = bookingNotes(connection.channel, reservation);

  if (existing?.booking) {
    const booking = existing.booking;
    const wasActive = !['CANCELLED', 'NO_SHOW'].includes(booking.status);
    if (wasActive) {
      await updateRoomAvailability(booking.roomTypeId, booking.checkIn, booking.checkOut, booking.rooms, true);
    }
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        roomTypeId: mapping.roomTypeId,
        checkIn: parseBookingDate(checkIn),
        checkOut: parseBookingDate(checkOut),
        rooms,
        guests,
        totalPrice,
        notes,
        status: wasActive ? booking.status : 'CONFIRMED',
        statusHistory: {
          create: {
            status: wasActive ? booking.status : 'CONFIRMED',
            notes: `Modified on ${CHANNEL_LABELS[connection.channel]}${overbooked ? ' (OVERBOOKED)' : ''}`,
          },
        },
      },
    });
    await updateRoomAvailability(mapping.roomTypeId, updated.checkIn, updated.checkOut, rooms, false);
    await prisma.channelReservation.update({
      where: { id: existing.id },
      data: {
        status: 'MODIFIED',
        guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
        totalAmount: totalPrice,
        currency: reservation.currency,
        rawPayload: reservation.raw as Prisma.InputJsonValue,
      },
    });
    scheduleInventorySync(booking.roomTypeId, booking.checkIn, booking.checkOut);
    scheduleInventorySync(mapping.roomTypeId, checkIn, checkOut);
    return [
      {
        externalId: reservation.externalId,
        outcome: 'updated',
        bookingId: booking.id,
        message: `Updated booking ${booking.id}${overbooked ? ' - WARNING: overbooked' : ''}`,
      },
    ];
  }

  const userId = await findOrCreateGuest(connection.channel, reservation);
  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        userId,
        propertyId: connection.propertyId,
        roomTypeId: mapping.roomTypeId,
        checkIn: parseBookingDate(checkIn),
        checkOut: parseBookingDate(checkOut),
        guests,
        rooms,
        totalPrice,
        status: 'CONFIRMED',
        source: BOOKING_SOURCE[connection.channel],
        notes,
        statusHistory: {
          create: {
            status: 'CONFIRMED',
            notes: `Received from ${CHANNEL_LABELS[connection.channel]}${overbooked ? ' (OVERBOOKED)' : ''}`,
          },
        },
      },
    });
    await tx.channelReservation.upsert({
      where: { connectionId_externalId: { connectionId: connection.id, externalId: reservation.externalId } },
      create: {
        connectionId: connection.id,
        externalId: reservation.externalId,
        bookingId: created.id,
        status: 'BOOKED',
        guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
        totalAmount: totalPrice,
        currency: reservation.currency,
        rawPayload: reservation.raw as Prisma.InputJsonValue,
      },
      update: { bookingId: created.id, status: 'BOOKED' },
    });
    return created;
  });

  await updateRoomAvailability(mapping.roomTypeId, booking.checkIn, booking.checkOut, rooms, false);
  scheduleInventorySync(mapping.roomTypeId, checkIn, checkOut);

  return [
    {
      externalId: reservation.externalId,
      outcome: 'created',
      bookingId: booking.id,
      message: `Created booking ${booking.id}${overbooked ? ' - WARNING: overbooked' : ''}`,
    },
  ];
}

/**
 * Imports a batch, then cancels the parts of a split reservation that a
 * modification no longer contains (e.g. one of two room types was dropped).
 */
async function importBatch(connection: ConnectionWithMappings, reservations: OtaReservation[]) {
  const results: ImportResult[] = [];
  for (const reservation of reservations) {
    try {
      results.push(...(await importReservation(connection, reservation)));
    } catch (error) {
      results.push({ externalId: reservation.externalId, outcome: 'failed', message: errorMessage(error) });
    }
  }

  const failedIds = new Set(results.filter((r) => r.outcome === 'failed').map((r) => r.externalId));
  const modifiedGroups = new Map<string, Set<string>>();
  const groupsWithFailures = new Set<string>();
  for (const reservation of reservations) {
    if (reservation.action !== 'MODIFY') continue;
    if (failedIds.has(reservation.externalId)) groupsWithFailures.add(reservation.reservationGroupId);
    const ids = modifiedGroups.get(reservation.reservationGroupId) ?? new Set<string>();
    ids.add(reservation.externalId);
    modifiedGroups.set(reservation.reservationGroupId, ids);
  }
  for (const [groupId, keptIds] of modifiedGroups) {
    // Don't cancel anything when part of the modification couldn't be applied
    if (groupsWithFailures.has(groupId)) continue;
    const stale = await prisma.channelReservation.findMany({
      where: {
        connectionId: connection.id,
        OR: [{ externalId: groupId }, { externalId: { startsWith: `${groupId}-` } }],
        externalId: { notIn: Array.from(keptIds) },
        status: { not: 'CANCELLED' },
      },
    });
    for (const record of stale) {
      results.push(
        ...(await cancelGroup(connection, {
          ...reservations.find((r) => r.reservationGroupId === groupId)!,
          action: 'CANCEL',
          reservationGroupId: record.externalId,
          externalId: record.externalId,
        }))
      );
    }
  }
  return results;
}

/** Pulls pending reservations from the OTA, imports them and confirms them back */
export async function pullReservations(connectionId: string): Promise<ImportResult[]> {
  const connection = await loadConnection(connectionId);
  if (!connection) throw new ChannelApiError('Channel connection not found');
  if (!connection.importReservations) return [];

  try {
    const adapter = await getAdapter(connection);
    const reservations = await adapter.pullReservations();
    const results = await importBatch(connection, reservations);

    const confirmations = new Map<string, ReservationConfirmation>();
    for (const reservation of reservations) {
      const result = results.find((r) => r.externalId === reservation.externalId);
      if (!result || result.outcome === 'failed') continue;
      confirmations.set(`${reservation.reservationGroupId}|${reservation.action}`, {
        reservationGroupId: reservation.reservationGroupId,
        action: reservation.action,
        pmsConfirmationNumber: result.bookingId ?? reservation.reservationGroupId,
      });
    }
    await adapter.confirmReservations(Array.from(confirmations.values()));

    await prisma.channelConnection.update({
      where: { id: connectionId },
      data: { lastReservationPullAt: new Date() },
    });
    const failed = results.filter((r) => r.outcome === 'failed');
    await logSync(
      connectionId,
      'RESERVATION_PULL',
      failed.length > 0 ? 'FAILED' : 'SUCCESS',
      `Received ${reservations.length} reservation message(s)` +
        (failed.length > 0 ? `, ${failed.length} failed: ${failed.map((f) => f.message).join('; ')}` : ''),
      { results }
    );
    return results;
  } catch (error) {
    await logSync(connectionId, 'RESERVATION_PULL', 'FAILED', errorMessage(error));
    throw error;
  }
}

const SAMPLE_GUESTS = [
  ['Maria', 'Garcia'],
  ['James', 'Chen'],
  ['Aisha', 'Patel'],
  ['Lucas', 'Müller'],
  ['Sophie', 'Martin'],
  ['Daniel', 'Okafor'],
];

/** Sandbox only: fabricates an OTA booking and runs it through the import pipeline */
export async function simulateReservation(connectionId: string): Promise<ImportResult[]> {
  const connection = await loadConnection(connectionId);
  if (!connection) throw new ChannelApiError('Channel connection not found');
  if (connection.mode !== 'SANDBOX') {
    throw new ChannelApiError('Simulated bookings are only available in sandbox mode');
  }
  if (connection.roomMappings.length === 0) {
    throw new ChannelApiError('Map at least one room type first');
  }

  const mapping = connection.roomMappings[crypto.randomInt(connection.roomMappings.length)];
  const checkIn = addDays(hotelToday(), crypto.randomInt(3, 30));
  const checkOut = addDays(checkIn, crypto.randomInt(1, 5));
  const days = await computeChannelDays(connection, checkIn, addDays(checkOut, -1), [mapping.roomTypeId]);
  const [firstName, lastName] = SAMPLE_GUESTS[crypto.randomInt(SAMPLE_GUESTS.length)];
  const reservationNumber =
    connection.channel === 'EXPEDIA'
      ? String(crypto.randomInt(10000000, 99999999))
      : String(crypto.randomInt(1000000000, 2147483647));

  const reservation: OtaReservation = {
    externalId: reservationNumber,
    reservationGroupId: reservationNumber,
    action: 'BOOK',
    otaRoomTypeId: mapping.otaRoomTypeId,
    otaRatePlanId: mapping.otaRatePlanId,
    checkIn,
    checkOut,
    rooms: 1,
    adults: 2,
    children: 0,
    totalAmount: roundPrice(days.reduce((sum, day) => sum + day.channelRate, 0)),
    currency: connection.currency,
    guest: {
      firstName,
      lastName: `${lastName} (Sandbox)`,
      email: null,
      phone: '+1 555 0100',
    },
    specialRequests: 'Late arrival (sandbox test booking)',
    paymentModel: connection.channel === 'EXPEDIA' ? 'Expedia Collect' : 'Booking.com',
    raw: { simulated: true },
  };

  const results = await importReservation(connection, reservation);
  await logSync(connectionId, 'RESERVATION_PULL', 'SUCCESS', `Simulated sandbox booking ${reservationNumber}`, {
    results,
  });
  return results;
}
