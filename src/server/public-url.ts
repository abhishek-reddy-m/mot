/**
 * This deployment's public origin, for links we hand out (booking links in
 * staff messages) and for callbacks (phone webhooks): STAYOS_PUBLIC_URL, else
 * NEXT_PUBLIC_SITE_URL, else the Vercel production domain (or this preview's
 * URL), else NEXTAUTH_URL. Null when none is known.
 */
export function publicSiteUrl(): string | null {
  const vercel = process.env.VERCEL_ENV === 'production' ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
  const base = process.env.STAYOS_PUBLIC_URL || process.env.NEXT_PUBLIC_SITE_URL || (vercel ? `https://${vercel}` : process.env.NEXTAUTH_URL) || '';
  return base ? base.replace(/\/$/, '') : null;
}
