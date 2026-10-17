# Channel Manager & Channel Agent

The PMS can distribute rooms on **Expedia** and **Booking.com**. It keeps rates, availability and
restrictions in sync, imports OTA reservations as PMS bookings, and publishes promotions.
The **Channel Agent** is an AI assistant (Claude) that makes the same changes from plain-English requests
such as "raise weekend rates on Booking.com by 10% for November".

Admin pages:

| Page | What it does |
| --- | --- |
| `/admin/channels` | Overview of every property x OTA connection, latest OTA reservations, sync activity |
| `/admin/channels/connect` | Onboarding wizard (channel & mode, credentials, room mapping, pricing, go live) |
| `/admin/channels/[id]` | Manage one connection: rate grid and bulk changes, promotions, reservations, activity log, settings |
| `/admin/channel-agent` | Chat with the Channel Agent |

## Onboarding a property

1. **Channel & mode**: pick the property, Expedia or Booking.com, and a mode:
   - **Sandbox** simulates the OTA locally. It needs only a property ID (any value), mirrors your PMS
     room types as OTA rooms, accepts rate pushes and promotions, and lets you inject test bookings
     with **Simulate booking**. Use it to try the whole flow.
   - **Live** talks to the real OTA API with connectivity-partner credentials.
2. **Connect**: enter the OTA property ID (and API credentials in live mode), then test the
   connection. Passwords are encrypted at rest with `ENCRYPTION_KEY` (falls back to `NEXTAUTH_SECRET`).
3. **Map rooms**: link each PMS room type to an OTA room and rate plan. Matches by name are suggested.
   You can set a per-room markup and a **max rooms** allocation (caps what the channel can sell per night).
4. **Pricing & sync**: default markup (e.g. 15% to cover commission), which data to sync, and how many
   days ahead to keep open (default 365).
5. **Go live**: activation pushes availability and rates for the whole window and pulls reservations.

## How prices and availability are calculated

For every mapped room type and night:

- **Price sent to the OTA** = the channel-specific price for that date if one is set, otherwise
  `PMS rate x (1 + markup)`. The PMS rate is the Rate Calendar value, falling back to the room type's base price.
- **Availability** = total rooms - rooms booked that night (bookings from every source), capped by
  the channel allocation.
- **Restrictions**: stop-sell (closed) and minimum stay, per channel and date.

Consecutive nights with identical values are collapsed into date ranges, so a year of flat pricing is a
single update.

Updates are pushed automatically when:

- a rate is saved in the Rate Calendar (`/api/admin/room-types/[id]/rates`)
- a booking is created (`/api/bookings`), cancelled, or its status changes in admin
- an OTA reservation is imported, modified or cancelled (other channels get the new availability)
- a channel price, restriction, markup or mapping changes

These pushes run in the background and never block or fail the PMS operation; failures are recorded in
the connection's activity log and shown on the Channel Manager page.

## Reservations

OTA reservations are **pulled** (Expedia Booking Retrieval / Booking.com `OTA_HotelResNotif` and
`OTA_HotelResModifyNotif`), turned into PMS bookings with `source` = `EXPEDIA` / `BOOKING_COM` and status
`CONFIRMED`, then confirmed back to the OTA with the PMS booking ID. Modifications update the booking;
cancellations cancel it and release the rooms. A reservation covering several room types is split into one
PMS booking per room type. OTA reservations are always recorded, even if they overbook (the OTA has already
confirmed them to the guest); the status history notes `OVERBOOKED` when that happens.

Guests get a PMS customer record (without a password) so the front desk sees their name and phone.
Card details are not imported.

Reservations are pulled on activation, on **Sync now**, and by the cron endpoint below.

## Promotions

Types: **Basic**, **Early booker** (book at least N days ahead), **Last minute** (book within N days),
**Multi-night** (minimum stay of 2 or more nights), each with a percentage discount, stay window and
optional booking window. Promotions can be paused and resumed. If the OTA rejects one, it is kept with
status `FAILED` and the OTA's error message, and can be retried.

## Channel Agent

The agent runs a Claude tool-use loop (`src/lib/channel-agent/`) with these tools:

| Tool | Changes data? |
| --- | --- |
| `list_channel_connections`, `get_channel_calendar`, `list_promotions`, `get_recent_activity` | no |
| `sync_channels` (re-push current state, pull reservations) | no pricing change |
| `update_rates` (channel-only or PMS-wide), `set_restrictions`, `set_channel_markup`, `create_promotion`, `update_promotion` | **yes** |

- Every change is previewed (old to new prices, affected room types and dates, warnings) and **waits for
  the admin's approval** by default. Untick "Ask me before applying changes" to let it apply changes directly.
- Every proposed change is recorded in `agent_action_logs` as executed, rejected or failed.
- The same guardrails apply as in the UI: no past dates, at most 366 days per change, prices $1-$10,000,
  increases up to 200%, decreases up to 90%, discounts 1-80%.
- The agent uses `claude-opus-5-5` at medium effort, with server-side refusal fallback
  (`fallbacks: "default"`). Each request makes a few model calls, so it has API costs.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | for the agent | Claude API key used by the Channel Agent |
| `CRON_SECRET` | for scheduled sync | Bearer token for `/api/channel-manager/cron` |
| `ENCRYPTION_KEY` | recommended | Encrypts OTA passwords (defaults to `NEXTAUTH_SECRET`) |
| `EXPEDIA_EQC_BASE_URL` | no | EQC endpoint base (default `https://services.expediapartnercentral.com`) |
| `EXPEDIA_API_BASE_URL` | no | Expedia promotions API base (same default) |
| `BOOKING_COM_SUPPLY_URL` | no | Default `https://supply-xml.booking.com` |
| `BOOKING_COM_SECURE_URL` | no | Default `https://secure-supply-xml.booking.com` (reservations) |

The URL overrides let you point a live connection at an OTA certification/test environment.

## Scheduled sync

Run this every 5 minutes (e.g. a Render cron job) to import reservations:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<your-host>/api/channel-manager/cron
```

Add `?full=1` (e.g. nightly) to also re-push the full availability/rate window as a reconciliation.

## Database

Apply the migration `prisma/migrations/20261017000000_add_channel_manager`:

```bash
npx prisma migrate deploy
```

## Going live with the OTAs

Expedia and Booking.com only give API access to **certified connectivity partners**. Before live mode can
be used, the business running this PMS has to:

1. Apply to the Expedia Group connectivity program and the Booking.com Connectivity Partner program.
2. Pass each OTA's certification. The adapters (`src/lib/channel-manager/adapters/`) build messages from the
   published EQC (AR, PARR, BR, BC) and Booking.com (B.XML `roomrates`/`promotions`, OTA
   `HotelAvailNotif`/`HotelRateAmountNotif`/`HotelResNotif`/`HotelResModifyNotif`) formats.
   Certification validates every message against the OTA's test properties, so expect to adjust details
   there. The promotions payloads are the most likely to need changes.
3. Have each hotel select this PMS as its connectivity provider in Expedia Partner Central / the
   Booking.com Extranet, then onboard it here in live mode.

Current limitations: one OTA rate plan per PMS room type, per-room (not per-occupancy) pricing, and no
import of guest card details.
