// Every product fact in the video, with the file in the Casa Blanca repo it
// comes from. Paths are relative to the repository root. Change copy here,
// not in the scenes.

/** src/components/Navigation.tsx — "Casa Blanca" (Dancing Script) over "HOTELS" (Montserrat). */
export const BRAND = 'Casa Blanca';
export const BRAND_SUFFIX = 'HOTELS';
export const HUD_NAME = 'CASA BLANCA HOTELS';

/** render.yaml — NEXTAUTH_URL / NEXT_PUBLIC_SITE_URL of the deployed site. */
export const CTA_URL = 'mot-cvjh.onrender.com';

/** Next.js responsive site; README: "Responsive mobile-friendly design". */
export const PLATFORMS = ['Web', 'Mobile web'];

export const CATEGORY = 'booking site';
export const HOOK_ASIDE = 'We know. There are dozens.';

/** prisma/seed.js — first seeded property and its suite. */
export const PROPERTY = {
  name: 'Oceanview Resort',
  address: '123 Coastal Highway, Malibu, CA 90265',
};
export const ROOM = {
  name: 'Ocean Suite',
  capacity: 2,
  basePrice: 299.99,
  totalRooms: 10,
  description: 'Luxurious suite with direct ocean view, king bed, and private balcony.',
  amenities: ['Ocean View', 'King Bed', 'Private Balcony', 'Mini Bar', 'Free WiFi', 'Air Conditioning'],
};

/**
 * Weekend nights are Friday and Saturday (src/app/admin/rate-calendar/page.tsx,
 * isWeekendDay). scripts/seed-data.js prices weekends at base × 1.25, stored as
 * Decimal(10,2): 299.99 × 1.25 = 374.99.
 */
export const WEEKEND_RATE = 374.99;

/**
 * A Thu–Sun stay = three nights. src/lib/price-calculator.ts sums each night's
 * own rate and multiplies by rooms; nothing else is added.
 */
export const STAY_NIGHTS = [
  {day: 'THU', date: 'OCT 15', rate: ROOM.basePrice, weekend: false},
  {day: 'FRI', date: 'OCT 16', rate: WEEKEND_RATE, weekend: true},
  {day: 'SAT', date: 'OCT 17', rate: WEEKEND_RATE, weekend: true},
];
export const STAY_TOTAL = Math.round(STAY_NIGHTS.reduce((s, n) => s + n.rate, 0) * 100) / 100;

/**
 * Per-night availability as the room card shows it ("7/10 available",
 * src/app/properties/[propertyId]/page.tsx). Counts are illustrative; the
 * total of 10 rooms is the seeded Ocean Suite inventory. src/app/api/bookings/route.ts
 * rejects a booking when any night has fewer rooms left than requested.
 */
export const AVAIL_STEPS = [
  {day: 'THU', date: 'OCT 15', left: 7},
  {day: 'FRI', date: 'OCT 16', left: 4},
  {day: 'SAT', date: 'OCT 17', left: 1},
  {day: 'SUN', date: 'OCT 18', left: 0},
];

/**
 * src/app/bookings/[bookingId]/page.tsx — "You can cancel or modify your booking
 * up to 24 hours before 3 PM on your check-in date."
 */
export const CHANGE_BEFORE = {checkIn: '10/15/2026', checkOut: '10/18/2026'};
export const CHANGE_AFTER = {checkIn: '10/22/2026', checkOut: '10/25/2026'};

/** prisma/schema.prisma RoomStatus + src/app/housekeeping/page.tsx actions. */
export const HOUSEKEEPING_ROOMS = [
  {number: '101', type: 'Ocean Suite', floor: '1'},
  {number: '102', type: 'Ocean Suite', floor: '1'},
  {number: '201', type: 'Garden Room', floor: '2'},
  {number: '202', type: 'Garden Room', floor: '2'},
];

/** Lowest seeded basePrice: Garden Room, prisma/seed.js. */
export const FROM_PRICE = 199.99;
/** Broken by hand so "fees." never lands alone on a line. */
export const PRICE_LINES = [`Rooms from $${FROM_PRICE}/night.`, 'No booking fees.'];

export const fmtMoney = (n: number) =>
  '$' + n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
