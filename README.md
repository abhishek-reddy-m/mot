# StayOS

Direct booking, an agentic front desk and a voice front desk for independent hotels — with a path for every hotel:

| Path | For hotels that… | They get |
| --- | --- | --- |
| **Run on StayOS** (`FULL`) | want one system | White-label booking site, front desk, housekeeping, rates, analytics, the agent and voice |
| **Keep your PMS** (`BRIDGE`) | aren't ready to migrate (or never will) | The agent and voice working *their* PMS through the bridge — desktop connector or cloud browser |
| **Just voice** (`VOICE`) | want to stop missing calls first | A voice front desk with their real rooms and prices, plus a messages inbox |

Hotels move between paths without starting over (Console → *Your PMS* → *Move to StayOS*).

## What's inside

- **Guest journey** — directory with live "from" prices, white-label hotel pages (brand colour, photo mosaic, live room prices and scarcity), stepped checkout with inline sign-up, pay-at-hotel or Stripe, a booking page with free date changes / cancellation until 3 PM the day before, add-to-calendar, and *My trips*.
- **Staff console** (`/admin`) — two ways to work the same data:
  - **Classic**: dashboard with setup checklist and forecast, front desk (arrivals, departures, in-house, room board), housekeeping (supervisor board + phone-first *My rooms*), reservations, rate calendar (drag-select, set/adjust/reset), analytics, rooms, properties, team, activity log, settings.
  - **Agentic**: a natural-language workspace whose answers render as live UI blocks (booking lists, room options, rate grids, plans). Every change is a **signed plan** (HMAC, 10-minute expiry, single use) that a person confirms; every action is permission-checked and audited. ⌘K opens the agent from any Classic screen, and alerts hand off to it ("Fix").
- **Voice front desk** — GPT-Live (`gpt-live-1`) over WebRTC with Responses delegation. Guests talk from the hotel page; staff go hands-free in the agent workspace. Tool calls are executed by StayOS code, never by the model directly.
- **PMS bridge** — a computer-use operator that works the hotel's existing PMS in a browser, through the StayOS Connector on a hotel computer or our isolated cloud browser.

## Architecture

```
src/app            Next.js App Router pages + route handlers (thin)
src/server         Domain layer (server-only)
  authz.ts         roles → permissions, per-property tenancy scoping
  services/        bookings, inventory (availability + pricing), rates, rooms,
                   housekeeping, front desk, guest self-service, bridge, audit
  agent/           deterministic NLU → resolver → read tools / write planners,
                   signed plans, NDJSON streaming engine (llm.ts = optional plug-in)
  voice/           GPT-Live session creation, prompts, tool schemas, guest tools
  bridge/          computer-use operator step + TOTP
  vault.ts         AES-256-GCM sealing for stored PMS logins
src/components     console shell, agent UI + blocks, voice UI, guest UI, design system
public/downloads   stayos-connector.mjs (desktop connector / cloud worker)
connector/         connector docs
prisma/            schema, migrations, demo seed
```

Key rules the code enforces:

- **Availability is derived from bookings** for every night (no counters to drift); prices come from the rate calendar's exceptions over the base price, and the booking endpoint charges exactly the quote. Booking creation runs in a serializable transaction.
- **Dates are calendar days** (`YYYY-MM-DD`, stored at 12:00 UTC); the hotel's "today" uses `HOTEL_TIMEZONE`.
- **Nothing changes without a person**: agent writes → signed plan → confirm; voice writes → spoken yes → the same plan; bridge changes → confirmed plan → queued task; look-ups only are read-only by design.
- **Secrets stay server-side**: OpenAI keys never reach browsers or connectors; PMS passwords are sealed and typed by the worker when the model calls `fill_credential` — the model never sees them.

## Getting started

Requirements: Node 20+, PostgreSQL.

```bash
npm install
cp .env.example .env.local      # fill in DATABASE_URL and NEXTAUTH_SECRET at minimum
npx prisma migrate deploy
npm run db:seed                 # demo data (wipes the dev database)
npm run dev
```

Open http://localhost:3000 and use the one-click demo logins on `/login` (password `demo1234`):

| Login | Sees |
| --- | --- |
| `owner@stayos.demo` | Everything, plus **Harbor Motel** (a bridge-path hotel on Cloudbeds) |
| `manager@stayos.demo` | Operations, rates, team |
| `frontdesk@stayos.demo` | Front desk, reservations, the agent |
| `housekeeping@stayos.demo` | *My rooms* (phone-first) |
| `guest@stayos.demo` | Trips and the booking flow |

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | ✓ | PostgreSQL connection string (on Vercel, `POSTGRES_PRISMA_URL` / `POSTGRES_URL` also work) |
| `DIRECT_URL` | ✓ local | Unpooled connection for migrations (locally the same as `DATABASE_URL`; the Vercel build fills it from `DATABASE_URL_UNPOOLED` / `POSTGRES_URL_NON_POOLING` / `DATABASE_URL`) |
| `NEXTAUTH_SECRET` | ✓ | Session signing; also signs agent plans and voice sessions unless `AGENT_PLAN_SECRET` is set |
| `NEXTAUTH_URL` | prod | Public URL (Stripe return URLs) |
| `HOTEL_TIMEZONE` | | Hotel "today" (default `America/Los_Angeles`) |
| `AGENT_PLAN_SECRET` | | Separate secret for signed agent plans |
| `NEXT_PUBLIC_DEMO_MODE` | | `true` = public demo: one-click demo logins on `/login`; the shared demo logins and the demo hotels' public details (name, listing, voice script) can't be changed |
| `NEXT_PUBLIC_SITE_URL` | | Pins Stripe return URLs to one host (default: the host the guest booked on) |
| `OPENAI_API_KEY` | voice / bridge | Enables the voice front desk and the bridge operator |
| `OPENAI_LIVE_MODEL` | | Voice model (default `gpt-live-1`) |
| `OPENAI_VOICE_BACKEND_MODEL` | | Model the voice delegates reasoning/tools to (default `gpt-6-luna`) |
| `BRIDGE_OPERATOR_MODEL` | | Computer-use model (default `computer-use-preview`) |
| `BRIDGE_OPERATOR_TOOL` | | `computer` to use the GA computer tool instead of `computer_use_preview` |
| `STAYOS_VAULT_KEY` | prod bridge | 32-byte base64 key for sealing PMS logins (`openssl rand -base64 32`); dev derives one from `NEXTAUTH_SECRET` |
| `BRIDGE_WORKER_SECRET` | cloud bridge | Shared secret for the cloud worker (`stayos-connector.mjs worker`) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | | Online card payment (pay-at-hotel works without) |
| `RESEND_API_KEY` | | Confirmation emails |
| `BLOB_READ_WRITE_TOKEN` | | Photo uploads (Vercel Blob) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | | Google sign-in for guests |
| `ADMIN_SEED_PASSWORD`, `DEMO_PASSWORD`, `SEED_DEMO`, `ALLOW_SEED_WIPE` | | Seeding controls (production and Vercel builds never wipe unless `ALLOW_SEED_WIPE=true`; the demo is created once) |
| `SKIP_MIGRATIONS` | | `true` stops the Vercel build from running `prisma migrate deploy` |
| `VOICE_MAX_SESSIONS_PER_HOUR`, `BRIDGE_MAX_TASKS_PER_HOUR`, `ONBOARDING_MAX_PER_HOUR` | | Spend and abuse ceilings, enforced in the database so they hold across server instances (defaults 300 / 30 per hotel / 30) |

## The PMS bridge in one minute

1. Owner opens **Your PMS**, picks their system and how to reach it.
2. **Desktop**: download `stayos-connector.mjs`, pair with the one-time code, run it, sign in to the PMS in its window. **Cloud**: store a (preferably dedicated) PMS login — sealed, write-only — and run the worker.
3. Staff ask the agent ("who's arriving?", "check in Moreno into 14"). Look-ups queue straight away; changes need a confirmed plan. Results stream back into the conversation as live task cards.

See [`connector/README.md`](connector/README.md) for details and guardrails.

## Deploying

Vercel: connect the repo, add a Postgres database from *Storage*, set the secrets, redeploy — migrations and the optional demo seed run during the build. Step by step in [`DEPLOYMENT.md`](DEPLOYMENT.md); `/api/health` confirms the database is connected.

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm run db:seed` · `npx prisma migrate deploy`
