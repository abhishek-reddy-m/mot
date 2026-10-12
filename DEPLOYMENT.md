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
   | `OPENAI_API_KEY` | enables the voice front desk and the PMS bridge operator |
   | `STRIPE_*`, `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `GOOGLE_CLIENT_*` | optional |

   Leave `NEXTAUTH_URL` unset: auth trusts the request host, which keeps preview URLs working. Set it (or `NEXT_PUBLIC_SITE_URL`) only to pin Stripe return URLs to a custom domain.
4. **Deploy** → *Deployments* → *Redeploy* (env and database changes only apply to new builds).
5. **Check** → `https://<your-domain>/api/health` should return `{"ok":true,"database":"up","seeded":true}`.

## Notes

- Migrations run on every build that has a database (`prisma migrate deploy` only applies pending ones). Set `SKIP_MIGRATIONS=true` to opt out, e.g. for preview branches sharing the production database.
- Deployment Protection (Vercel Authentication) protects preview and per-deployment URLs by default; the production domain stays public.
- The cloud PMS bridge worker (`node stayos-connector.mjs worker`) is a long-running process: run it on a small VM or container with `BRIDGE_WORKER_SECRET` set on both sides — not on Vercel Functions.
