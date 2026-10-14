# Deploying StayOS on Vercel

The repo deploys as-is: `vercel.json` runs `scripts/vercel-build.mjs`, which

1. maps whatever connection-string names the Postgres integration injected (Neon: `DATABASE_URL` + `DATABASE_URL_UNPOOLED`; Supabase: `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING`; Prisma Postgres: `DATABASE_URL` / `POSTGRES_URL`) onto the `DATABASE_URL` / `DIRECT_URL` Prisma reads;
2. with a database: runs `prisma migrate deploy`, then — when `SEED_DEMO=true` — creates the demo hotels once (the seed never wipes on Vercel and skips itself when the demo already exists);
3. without one: still builds, so the first deploy never blocks; `/api/health` reports `not_configured` until a database is connected;
4. `prisma generate` + `next build`.

## One-time setup

1. **Project** → create it from the GitHub repo (Settings → Git → Connect Git Repository). Framework, build and install commands come from `vercel.json`.
2. **Database** → project → *Storage* → *Create Database* → **Neon** (free tier is enough) → connect it to Production and Preview. That adds `DATABASE_URL` / `DATABASE_URL_UNPOOLED`.
3. **Environment variables** (Settings → Environment Variables):

   | Variable | Value |
   | --- | --- |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` (sensitive) |
   | `AGENT_PLAN_SECRET` | `openssl rand -base64 32` (sensitive) |
   | `STAYOS_VAULT_KEY` | `openssl rand -base64 32` (sensitive) — seals stored PMS logins; never rotate without re-entering them |
   | `NEXT_PUBLIC_DEMO_MODE` | `true` for a public demo (one-click logins on `/login`) |
   | `SEED_DEMO` | `true` to create the demo hotels on the first build with a database |
   | `HOTEL_TIMEZONE` | e.g. `America/Los_Angeles` |
   | `ELEVENLABS_API_KEY` | voice front desk on ElevenLabs (preferred when set); then Console → Voice → *Check connection* creates the agents |
   | `OPENAI_API_KEY` | voice on GPT-Live (when ElevenLabs isn't set) and the PMS bridge operator |
   | `STRIPE_*`, `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `GOOGLE_CLIENT_*` | optional |

   Leave `NEXTAUTH_URL` unset: auth trusts the request host, which keeps preview URLs working. Set `NEXT_PUBLIC_SITE_URL` only to pin Stripe return URLs to a custom domain.
4. **Deploy** → *Deployments* → *Redeploy* (env and database changes only apply to new builds).
5. **Check** → `https://<your-domain>/api/health` should return `{"ok":true,"database":"up","seeded":true}`.

## Phone line (ElevenLabs)

Answer a hotel's phone with the voice front desk. Production only: preview deployments sit behind Vercel Authentication, which would refuse ElevenLabs' webhooks (the console says so on previews).

1. **Hotel in StayOS** → the hotel's own property with its rooms and rates (that's what the voice quotes). In the public demo, demo hotels and the shared demo logins can't take a real line — sign up through *Get started*.
2. **Turn it on** → Console → *Voice* → *Phone* → **Turn on phone line** (owner or platform admin). StayOS creates the hotel's phone agent in ElevenLabs, named `StayOS — <hotel> phone · <ref>`; the Phone tab shows its agent ID.
3. **A number for the assistant** → most countries: a local Twilio number. India: an Indian provider such as Exotel — ask ElevenLabs about India data residency first. A hotel phone system with SIP: a SIP trunk.
4. **Point it at the agent** (whoever runs the ElevenLabs account — never give hotel owners access to it, it holds every hotel's agents and calls) → ElevenLabs → *Agents* → *Phone numbers* → *Import number* (Twilio: Account SID + Auth Token; SIP trunk: the provider's details) → choose the agent whose ID the hotel's Phone tab shows.
5. **Keep the hotel's number** → forward calls to the new number. Most mobiles: `**61*<number>*11*20#` (no answer after 20 s) and `**67*<number>#` (busy); `##61#` / `##67#` undo them. US landlines: `*72<number>` forwards everything, `*73` stops. Codes vary by carrier; phone systems have "forward on no answer".
6. **Test** → *Voice → Phone → Refresh* lists the number once it points at the agent; then call the hotel number and let it ring through.

How it works: ElevenLabs calls `POST /api/voice/phone/start` when a call comes in. StayOS answers with the hotel's prompt and greeting (which always says it's a virtual assistant) and a signed session token — or a polite "not available" when the line is paused, the voice is off in *Settings*, or limits are hit. Then ElevenLabs calls `POST /api/voice/phone/tool` for each lookup. Both carry an `X-StayOS-Webhook` header derived from `AGENT_PLAN_SECRET` (or `NEXTAUTH_SECRET` when that isn't set): after rotating it, press *Refresh* on each hotel's Phone tab so its agent picks up the new value. Rotating `ELEVENLABS_API_KEY` within the same ElevenLabs account keeps every line working; moving to another account needs each number re-pointed.

- **Limits** (in the database, across all instances): 6 calls per caller per 10 minutes (withheld numbers share 12 per hotel), `VOICE_PHONE_MAX_CALLS_PER_HOTEL_HOUR` (default 120) per hotel and `VOICE_PHONE_MAX_CALLS_PER_HOUR` (default 300) across hotels — separate from the booking page's budgets. ElevenLabs' own per-agent caps (`ELEVENLABS_MAX_CONCURRENT`, `ELEVENLABS_MAX_DAILY`) apply per hotel. Calls end after 10 minutes or 45 seconds of silence.
- **Bookings by phone** arrive in *Messages* with the quote and a **Copy booking link** button: the team confirms with the guest and sends the pre-filled link to finish booking online.
- **A person**: with *Put callers through to* set, the agent transfers callers who ask for one — use a direct line that doesn't forward back to the assistant. Without it, the agent takes a message.

## Notes

- Migrations run on every build that has a database (`prisma migrate deploy` only applies pending ones). Set `SKIP_MIGRATIONS=true` to opt out, e.g. for preview branches sharing the production database.
- Serverless-safe by design: plan single-use, voice and bridge budgets, and sign-up limits live in Postgres, so they hold across every function instance. Photo uploads are downscaled in the browser and sent one per request (Vercel caps request bodies at 4.5 MB).
- Public demo (`NEXT_PUBLIC_DEMO_MODE=true`): the shared `@stayos.demo` logins can't be re-passworded, deactivated or deleted, demo hotels keep their public details, and every deploy re-checks the demo logins. Sign-up forms tell visitors not to enter real details.
- Deployment Protection (Vercel Authentication) protects preview and per-deployment URLs by default; the production domain stays public.
- The cloud PMS bridge worker (`node stayos-connector.mjs worker`) is a long-running process: run it on a small VM or container with `BRIDGE_WORKER_SECRET` set on both sides — not on Vercel Functions.
