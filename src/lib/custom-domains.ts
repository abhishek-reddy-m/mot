import { promises as dns } from 'dns';
import { getAppOrigin } from '@/lib/domain-utils';

// Render's load balancer IP for root domains: https://render.com/docs/configure-other-dns
const DEFAULT_APEX_A_RECORD = '216.24.57.1';
const RENDER_API_URL = 'https://api.render.com/v1';

export type DnsRecord = {
  type: 'CNAME' | 'A';
  name: string;
  value: string;
  note?: string;
};

export type DnsCheck = {
  pointsToApp: boolean;
  cnames: string[];
  ips: string[];
  hasIpv6: boolean;
};

/** Hostname a property's subdomain should CNAME to, e.g. "mot-cvjh.onrender.com". */
function getCnameTarget(): string | null {
  if (process.env.CUSTOM_DOMAIN_CNAME_TARGET) return process.env.CUSTOM_DOMAIN_CNAME_TARGET.toLowerCase();
  const origin = getAppOrigin();
  return origin ? new URL(origin).hostname : null;
}

function getApexARecord(): string {
  return process.env.CUSTOM_DOMAIN_A_RECORD || DEFAULT_APEX_A_RECORD;
}

/** DNS records the owner adds at their domain provider. */
export function getDnsInstructions(domain: string): DnsRecord[] {
  const target = getCnameTarget();
  // A guess: without a public suffix list, "mymotel.co.uk" looks like a subdomain
  const labels = domain.split('.');
  const isRoot = labels.length === 2;

  if (!isRoot) {
    return target ? [{ type: 'CNAME', name: labels.slice(0, -2).join('.'), value: target }] : [];
  }

  const records: DnsRecord[] = [{ type: 'A', name: '@', value: getApexARecord() }];
  if (target) {
    records.push({ type: 'CNAME', name: 'www', value: target, note: `Sends www.${domain} to the same page` });
  }
  return records;
}

async function lookup(resolve: () => Promise<string[]>): Promise<string[]> {
  try {
    return await resolve();
  } catch {
    // ENOTFOUND / ENODATA just mean there is no such record yet
    return [];
  }
}

/** Checks whether the domain's DNS already points at this app. */
export async function checkDomainDns(domain: string): Promise<DnsCheck> {
  const target = getCnameTarget();

  const [cnames, ips, ipv6, targetIps] = await Promise.all([
    lookup(() => dns.resolveCname(domain)),
    lookup(() => dns.resolve4(domain)),
    lookup(() => dns.resolve6(domain)),
    target ? lookup(() => dns.resolve4(target)) : Promise.resolve([]),
  ]);

  const expectedIps = new Set([getApexARecord(), ...targetIps]);
  const cnamesToApp = target !== null && cnames.some(cname => cname.toLowerCase().replace(/\.$/, '') === target);

  return {
    pointsToApp: cnamesToApp || ips.some(ip => expectedIps.has(ip)),
    cnames,
    ips,
    hasIpv6: ipv6.length > 0,
  };
}

// Render only routes a domain to the service, and issues its TLS certificate, once the domain
// is added to the service. With RENDER_API_KEY and RENDER_SERVICE_ID set, that happens here;
// otherwise someone adds it by hand in the Render dashboard.

function getRenderConfig() {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;
  return apiKey && serviceId ? { apiKey, serviceId } : null;
}

export function isHostingManaged(): boolean {
  return getRenderConfig() !== null;
}

async function renderRequest(path: string, method: string, body?: unknown): Promise<Response> {
  const config = getRenderConfig();
  if (!config) throw new Error('Render API is not configured');

  return fetch(`${RENDER_API_URL}/services/${config.serviceId}/custom-domains${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
}

async function renderError(response: Response): Promise<Error> {
  const data = await response.json().catch(() => null);
  return new Error(data?.message || `Render API returned ${response.status}`);
}

/** Adds the domain to the Render service. Render also adds the www/root counterpart as a redirect. */
export async function addDomainToHosting(domain: string): Promise<void> {
  if (!getRenderConfig()) return;

  const response = await renderRequest('', 'POST', { name: domain });
  // 409: already added to this service
  if (!response.ok && response.status !== 409) {
    throw await renderError(response);
  }
}

/**
 * Asks Render to re-check the domain's DNS. Returns whether Render has verified it,
 * or null when hosting isn't managed from here.
 */
export async function verifyDomainWithHosting(domain: string): Promise<boolean | null> {
  if (!getRenderConfig()) return null;

  const name = encodeURIComponent(domain);
  const verifyResponse = await renderRequest(`/${name}/verify`, 'POST');
  if (verifyResponse.status === 404) {
    // Removed from Render by hand; add it back so verification can start
    await addDomainToHosting(domain);
    return false;
  }
  if (!verifyResponse.ok) throw await renderError(verifyResponse);

  const response = await renderRequest(`/${name}`, 'GET');
  if (!response.ok) throw await renderError(response);

  const customDomain = await response.json();
  return customDomain.verificationStatus === 'verified';
}

export async function removeDomainFromHosting(domain: string): Promise<void> {
  if (!getRenderConfig()) return;

  try {
    const response = await renderRequest(`/${encodeURIComponent(domain)}`, 'DELETE');
    if (!response.ok && response.status !== 404) {
      console.error(`Failed to remove ${domain} from Render:`, (await renderError(response)).message);
    }
  } catch (error) {
    console.error(`Failed to remove ${domain} from Render:`, error);
  }
}
