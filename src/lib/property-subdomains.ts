import { prisma } from '@/lib/prisma';
import { getPropertyDomainBase, isValidSubdomain, slugifySubdomain } from '@/lib/domain-utils';
import {
  addDomainToHosting,
  isHostingManaged,
  removeDomainFromHosting,
  verifyDomainWithHosting,
} from '@/lib/custom-domains';

/** "oceanview-resort" -> "oceanview-resort.hotelone.site", once PROPERTY_DOMAIN_BASE is set. */
export function getDefaultDomain(subdomain: string | null): string | null {
  const base = getPropertyDomainBase();
  return base && subdomain ? `${subdomain}.${base}` : null;
}

/** An unused subdomain based on the property's name, e.g. "oceanview-resort" or "oceanview-resort-2". */
export async function findAvailableSubdomain(name: string): Promise<string> {
  let slug = slugifySubdomain(name);
  if (slug.length < 3) slug = slug ? `${slug}-hotel` : 'hotel';

  const candidates = [slug, ...Array.from({ length: 8 }, (_, i) => `${slug}-${i + 2}`)].filter(isValidSubdomain);
  const taken = await prisma.property.findMany({
    where: { subdomain: { in: candidates } },
    select: { subdomain: true },
  });
  const takenSubdomains = new Set(taken.map(property => property.subdomain));

  return candidates.find(candidate => !takenSubdomains.has(candidate))
    ?? `${slug}-${Math.random().toString(36).slice(2, 8)}`;
}

// Render can't take a *.hotelone.site wildcard while hotelone.site itself is hosted elsewhere,
// so each property's subdomain is added to the Render service on its own.

export async function hostPropertySubdomain(subdomain: string): Promise<void> {
  const domain = getDefaultDomain(subdomain);
  if (!domain || !isHostingManaged()) return;

  await addDomainToHosting(domain);
  await verifyDomainWithHosting(domain);
}

export async function unhostPropertySubdomain(subdomain: string): Promise<void> {
  const domain = getDefaultDomain(subdomain);
  if (domain) await removeDomainFromHosting(domain);
}

/** Gives every property a subdomain and makes sure each one is on the Render service. Runs at startup. */
export async function syncPropertySubdomains(): Promise<void> {
  if (!getPropertyDomainBase()) return;

  const withoutSubdomain = await prisma.property.findMany({
    where: { subdomain: null },
    select: { id: true, name: true },
  });
  for (const property of withoutSubdomain) {
    await prisma.property.update({
      where: { id: property.id },
      data: { subdomain: await findAvailableSubdomain(property.name) },
    });
  }

  if (!isHostingManaged()) return;

  const properties = await prisma.property.findMany({
    where: { subdomain: { not: null } },
    select: { subdomain: true },
  });
  for (const { subdomain } of properties) {
    try {
      await hostPropertySubdomain(subdomain!);
    } catch (error) {
      console.error(`Failed to add ${getDefaultDomain(subdomain)} to Render:`, error);
    }
  }
}
