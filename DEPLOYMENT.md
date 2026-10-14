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

Answer a hotel's phone with the voice front desk. Production only: preview deployments sit behind Vercel Authentication, which would refuse ElevenLabs' webhooks.

1. **Hotel in StayOS** → the hotel's own property (demo hotels can't take a real line in the public demo), with its rooms and rates set up — that's what the voice quotes.
2. **Turn it on** → Console → *Voice* → *Phone* → **Turn on phone line** (owner or platform admin). StayOS creates the hotel's phone agent in ElevenLabs, named `StayOS — <hotel> phone`.
3. **A number for the assistant** → most countries: buy a local number at Twilio. India: an Exotel number (Indian rules keep call audio in India). A hotel phone system with SIP: a SIP trunk.
4. **Point it at the agent** → ElevenLabs → *Agents* → *Phone numbers* → *Import number* (Twilio: Account SID + Auth Token; SIP trunk: the provider's details) → choose the agent `StayOS — <hotel> phone`.
5. **Keep the hotel's number** → forward calls to the new number: on a mobile, `**61*<number>*11*20#` (no answer after 20 s) and `**67*<number>#` (busy), `##002#` to undo; US landlines `*72<number>` (all calls). Or the phone system's "forward on no answer".
6. **Test** → call the hotel number and let it ring through; *Voice → Phone → Refresh* lists the connected number.

How it works: ElevenLabs calls `POST /api/voice/phone/start` when a call comes in (StayOS answers with the hotel's prompt, greeting and a signed session token, or a polite "not available" when the line is paused or busy), then `POST /api/voice/phone/tool` for each lookup. Both carry an `X-StayOS-Webhook` header derived from `NEXTAUTH_SECRET` (or `AGENT_PLAN_SECRET`) — rotating that secret means pressing *Refresh* on each line so the agents pick up the new value. Phone calls share the hotel's voice limits (6 per caller per 10 minutes, 120 per hotel per hour), end after 10 minutes or 45 seconds of silence, and phone bookings arrive in *Messages* for the team to confirm with a payment link. If a caller asks for a person, the agent transfers to the hotel's *Put callers through to* number — use a direct line that doesn't forward back to the assistant.

## Notes

- Migrations run on every build that has a database (`prisma migrate deploy` only applies pending ones). Set `SKIP_MIGRATIONS=true` to opt out, e.g. for preview branches sharing the production database.
- Serverless-safe by design: plan single-use, voice and bridge budgets, and sign-up limits live in Postgres, so they hold across every function instance. Photo uploads are downscaled in the browser and sent one per request (Vercel caps request bodies at 4.5 MB).
- Public demo (`NEXT_PUBLIC_DEMO_MODE=true`): the shared `@stayos.demo` logins can't be re-passworded, deactivated or deleted, demo hotels keep their public details, and every deploy re-checks the demo logins. Sign-up forms tell visitors not to enter real details.
- Deployment Protection (Vercel Authentication) protects preview and per-deployment URLs by default; the production domain stays public.
- The cloud PMS bridge worker (`node stayos-connector.mjs worker`) is a long-running process: run it on a small VM or container with `BRIDGE_WORKER_SECRET` set on both sides — not on Vercel Functions.
