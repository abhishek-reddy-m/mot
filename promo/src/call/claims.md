# "Let me check": every claim, and the code behind it

Paths are relative to the repository root.

| Line in the ad | Backed by |
| --- | --- |
| Guests "see what's free, pick their dates, and book" | Search + property page with per-room-type availability for the chosen dates: `src/components/search-bar.tsx`, `src/app/properties/[propertyId]/page.tsx`, `src/app/api/properties/[propertyId]/availability/route.ts`; booking: `src/app/api/bookings/route.ts` |
| "No phone call" / booking at 11:48 PM | The site takes bookings directly; nothing in the flow needs staff. New bookings are created `PENDING` (`src/app/api/bookings/route.ts`), which is what the morning shot shows. |
| "Every night is counted, so no room gets sold twice" | `RoomAvailability` per room type per date (`prisma/schema.prisma`); the booking API finds the busiest night of the stay and rejects with "Not enough rooms available. Only N rooms available." (`src/app/api/bookings/route.ts`) |
| "Price every night on its own. Set all your Fridays and Saturdays at once." | `RoomTypeRate` per date; Rate Calendar with "Set Weekends (Fri-Sat)" bulk update and "Save Rates" (`src/app/admin/rate-calendar/page.tsx`); totals sum each night's rate (`src/lib/price-calculator.ts`) |
| "Housekeeping marks rooms clean from their phone. The front desk sees what's ready." | Housekeeping portal with Mark Clean / Mark Inspected (`src/app/housekeeping/page.tsx`, responsive web); front desk Clean/Dirty stat and room status tab (`src/app/admin/front-desk/page.tsx`) |
| "Arrivals, departures and occupancy, on one screen" | Front desk quick stats: Arrivals, Departures, In-House, Occupancy %, Out of Order, Clean/Dirty; arrivals list with Check In / No Show (`src/app/admin/front-desk/page.tsx`) |
| "Guests move or cancel their own booking, up to a day before check-in" | Modify Booking Dates and Cancel Booking on the guest booking page; "You can cancel or modify your booking up to 24 hours before 3 PM on your check-in date." (`src/app/bookings/[bookingId]/page.tsx`, `src/app/api/bookings/[bookingId]/route.ts`) |
| "Your whole team gets their own login, with only what they need" | Roles Owner, Manager, Front Desk, Housekeeper (plus Admin, Customer) with descriptions in `src/app/admin/users/page.tsx`; route access per role in `src/middleware.ts` |
| Live demo URL | `render.yaml` (`NEXTAUTH_URL`) |

Not claimed, because the code doesn't do it: notifications of new bookings
(no email/SMS/push), payments processing, channel managers / OTA sync.

Illustrative, not from data: guest names (Smith, Patel, Sam Rivera), the
ledger, hold time, and front-desk counts. Room names, prices ($299.99 base,
$374.99 weekend) and "10 rooms" come from `prisma/seed.js` and
`scripts/seed-data.js`.
