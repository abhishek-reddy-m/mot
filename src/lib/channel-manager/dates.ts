import { addDays, getDateRange, parseBookingDate } from '@/lib/date-utils';

// All properties in this system are in Pacific time (see date-utils.ts)
export const HOTEL_TIMEZONE = 'America/Los_Angeles';

export const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: unknown): value is string {
  return typeof value === 'string' && DATE_PATTERN.test(value) && !isNaN(parseBookingDate(value).getTime());
}

/** Today's calendar date at the hotel (YYYY-MM-DD) */
export function hotelToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: HOTEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Every date from `from` to `to`, both inclusive */
export function eachDate(from: string, to: string): string[] {
  return getDateRange(from, addDays(to, 1));
}

export function weekdayOf(date: string): Weekday {
  return WEEKDAYS[parseBookingDate(date).getUTCDay()];
}

/** Value for a Prisma `@db.Date` column */
export function toDbDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export { addDays };
