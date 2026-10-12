/**
 * Human labels + visual tones for every status in the system, so a status
 * reads the same in tables, cards, the agent and emails. Client-safe.
 */
import type { BookingStatus, HousekeepingStatus, Occupancy, RoomStatus } from './dto';

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'agent';

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'info' },
  CHECKED_IN: { label: 'In house', tone: 'success' },
  CHECKED_OUT: { label: 'Checked out', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  NO_SHOW: { label: 'No-show', tone: 'danger' },
};

export const ROOM_STATUS: Record<RoomStatus, { label: string; tone: Tone }> = {
  CLEAN: { label: 'Clean', tone: 'success' },
  INSPECTED: { label: 'Inspected', tone: 'info' },
  DIRTY: { label: 'Dirty', tone: 'warning' },
  OUT_OF_ORDER: { label: 'Out of order', tone: 'danger' },
};

export const HOUSEKEEPING_STATUS: Record<HousekeepingStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'To do', tone: 'warning' },
  IN_PROGRESS: { label: 'Cleaning', tone: 'info' },
  COMPLETED: { label: 'Done', tone: 'success' },
  INSPECTED: { label: 'Inspected', tone: 'success' },
};

export const OCCUPANCY: Record<Occupancy, { label: string; tone: Tone }> = {
  VACANT: { label: 'Vacant', tone: 'neutral' },
  OCCUPIED: { label: 'Occupied', tone: 'brand' },
  ARRIVING: { label: 'Arriving', tone: 'info' },
  DEPARTING: { label: 'Departing', tone: 'warning' },
  TURNOVER: { label: 'Turnover', tone: 'agent' },
};

export const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  PAID: { label: 'Paid', tone: 'success' },
  UNPAID: { label: 'Pay at property', tone: 'neutral' },
  PAY_AT_PROPERTY: { label: 'Pay at property', tone: 'neutral' },
  AWAITING_PAYMENT: { label: 'Awaiting payment', tone: 'warning' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
  FAILED: { label: 'Payment failed', tone: 'danger' },
};

export function paymentLabel(status: string | null | undefined) {
  return PAYMENT_STATUS[status ?? 'UNPAID'] ?? { label: status ?? 'Unknown', tone: 'neutral' as Tone };
}

export function roleLabel(role: string): string {
  return (
    {
      ADMIN: 'Platform admin',
      OWNER: 'Owner',
      MANAGER: 'Manager',
      FRONT_DESK: 'Front desk',
      HOUSEKEEPER: 'Housekeeping',
      CUSTOMER: 'Guest',
    } as Record<string, string>
  )[role] ?? role;
}

export const money = (n: number, opts: { cents?: boolean } = {}) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: opts.cents === false ? 0 : 2,
    maximumFractionDigits: opts.cents === false ? 0 : 2,
  }).format(n);
