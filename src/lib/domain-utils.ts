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
