// Custom domain helpers that are safe to use in middleware (edge runtime)

// Labels of letters, digits and hyphens (not at either end), ending in a real-looking TLD
const HOSTNAME_PATTERN = /^(?=.{1,253}$)(?:(?!-)[a-z0-9-]{1,63}(?<!-)\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

/**
 * Turns what an owner types ("https://Book.MyMotel.com/") into a bare hostname
 * ("book.mymotel.com"). Returns null if it isn't a valid domain.
 */
export function normalizeDomain(input: string): string | null {
  const hostname = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');

  return HOSTNAME_PATTERN.test(hostname) ? hostname : null;
}

/** "mymotel.com" <-> "www.mymotel.com". Render serves both and redirects one to the other. */
export function toggleWww(domain: string): string {
  return domain.startsWith('www.') ? domain.slice(4) : `www.${domain}`;
}

/** Origin of the main booking site, e.g. "https://mot-cvjh.onrender.com". */
export function getAppOrigin(): string | null {
  const url = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  if (!url) return null;

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Whether a hostname is the main booking site rather than a property's own domain. */
export function isAppHost(hostname: string): boolean {
  if (hostname.endsWith('.onrender.com')) return true;

  const appHosts = [process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXTAUTH_URL].map(url => {
    try {
      return url ? new URL(url).hostname : null;
    } catch {
      return null;
    }
  });
  const extraHosts = (process.env.APP_HOSTNAMES || '').split(',').map(host => host.trim().toLowerCase());

  return [...appHosts, ...extraHosts].includes(hostname);
}

// Default property addresses on the platform's own domain, e.g. "oceanview-resort.hotelone.site"

const SUBDOMAIN_PATTERN = /^(?!xn--)[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'api', 'admin', 'dashboard', 'login', 'auth', 'account', 'book', 'booking', 'bookings',
  'mail', 'email', 'smtp', 'imap', 'ftp', 'ns1', 'ns2', 'cdn', 'static', 'assets', 'media',
  'help', 'support', 'status', 'docs', 'blog', 'dev', 'staging', 'test', 'demo',
]);

/** Domain whose subdomains are properties' default booking pages, e.g. "hotelone.site". */
export function getPropertyDomainBase(): string | null {
  return process.env.PROPERTY_DOMAIN_BASE?.trim().toLowerCase() || null;
}

/** "oceanview-resort.hotelone.site" -> "oceanview-resort"; null for any other host. */
export function getPropertySubdomain(hostname: string): string | null {
  const base = getPropertyDomainBase();
  if (!base || !hostname.endsWith(`.${base}`)) return null;

  const subdomain = hostname.slice(0, -(base.length + 1));
  return subdomain.includes('.') ? null : subdomain;
}

/** The platform domain or anything under it, which a property can't claim as its own domain. */
export function isPlatformDomain(hostname: string): boolean {
  const base = getPropertyDomainBase();
  return base !== null && (hostname === base || hostname.endsWith(`.${base}`));
}

export function isValidSubdomain(subdomain: string): boolean {
  return SUBDOMAIN_PATTERN.test(subdomain) && !RESERVED_SUBDOMAINS.has(subdomain);
}

/** "Oceanview Résort & Spa" -> "oceanview-resort-spa" */
export function slugifySubdomain(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 50)
    .replace(/-+$/, '');
}
