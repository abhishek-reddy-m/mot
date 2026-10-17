'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Globe, Loader2, RefreshCw, Trash2 } from 'lucide-react';

type DnsRecord = {
  type: 'CNAME' | 'A';
  name: string;
  value: string;
  note?: string;
};

type DnsCheck = {
  pointsToApp: boolean;
  cnames: string[];
  ips: string[];
  hasIpv6: boolean;
  hostingVerified: boolean | null;
};

type DomainStatus = {
  domain: string | null;
  verified: boolean;
  verifiedAt: string | null;
  dnsRecords: DnsRecord[];
  hostingManaged: boolean;
  check?: DnsCheck;
};

export default function CustomDomainCard({ propertyId }: { propertyId: string }) {
  const [status, setStatus] = useState<DomainStatus | null>(null);
  const [domainInput, setDomainInput] = useState('');
  const [busy, setBusy] = useState<'saving' | 'checking' | 'removing' | null>(null);
  const [error, setError] = useState('');
  const [bookingPageUrl, setBookingPageUrl] = useState(`/properties/${propertyId}`);

  const domainApi = `/api/admin/properties/${propertyId}/domain`;

  useEffect(() => {
    setBookingPageUrl(`${window.location.origin}/properties/${propertyId}`);

    const fetchStatus = async () => {
      try {
        const response = await fetch(domainApi);
        if (!response.ok) {
          throw new Error('Failed to load custom domain');
        }
        setStatus(await response.json());
      } catch (err) {
        console.error('Error fetching custom domain:', err);
        setError('Failed to load custom domain settings.');
      }
    };

    fetchStatus();
  }, [domainApi, propertyId]);

  const callDomainApi = async (method: 'PUT' | 'POST' | 'DELETE', body?: unknown) => {
    const response = await fetch(domainApi, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    setStatus(data);
  };

  const run = async (action: 'saving' | 'checking' | 'removing', request: () => Promise<void>) => {
    setBusy(action);
    setError('');
    try {
      await request();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const connectDomain = () =>
    run('saving', async () => {
      await callDomainApi('PUT', { domain: domainInput });
      setDomainInput('');
    });

  const checkDns = () => run('checking', () => callDomainApi('POST'));

  const removeDomain = () => {
    if (!confirm(`Disconnect ${status?.domain}? Guests visiting it will no longer see this booking page.`)) return;
    run('removing', () => callDomainApi('DELETE'));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Globe className="h-5 w-5 mr-2" />
          Booking Page Domain
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <span className="text-gray-600">Booking page:</span>{' '}
          <a href={bookingPageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
            {bookingPageUrl}
          </a>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {!status ? (
          !error && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
        ) : !status.domain ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Use your own domain</label>
            <div className="flex space-x-2">
              <Input
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => {
                  // The card sits inside the property form; don't submit that
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (domainInput.trim() && busy === null) connectDomain();
                }}
                placeholder="book.yourmotel.com"
                className="flex-1"
              />
              <Button type="button" onClick={connectDomain} disabled={!domainInput.trim() || busy !== null}>
                {busy === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
                Connect
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              If you own a domain, guests who visit it will land on this property&apos;s booking page.
              A subdomain like book.yourmotel.com keeps your existing website working.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{status.domain}</span>
                {status.verified ? (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Live
                  </span>
                ) : (
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Waiting for DNS
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {status.verified && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`https://${status.domain}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Visit
                    </a>
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={checkDns} disabled={busy !== null}>
                  {busy === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {status.verified ? 'Check again' : 'Check DNS'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={removeDomain} disabled={busy !== null}>
                  {busy === 'removing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Remove
                </Button>
              </div>
            </div>

            {status.check && <DnsCheckResult check={status.check} verified={status.verified} />}

            {!status.verified && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Add {status.dnsRecords.length === 1 ? 'this record' : 'these records'} where you manage your
                  domain&apos;s DNS (your domain registrar, or a DNS provider like Cloudflare), then click Check DNS.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border rounded-md">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="p-2 font-medium">Type</th>
                        <th className="p-2 font-medium">Name</th>
                        <th className="p-2 font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.dnsRecords.map((record) => (
                        <tr key={`${record.type}-${record.name}`} className="border-t">
                          <td className="p-2 font-mono">{record.type}</td>
                          <td className="p-2 font-mono">{record.name}</td>
                          <td className="p-2">
                            <span className="font-mono break-all">{record.value}</span>
                            {record.note && <div className="text-xs text-gray-500">{record.note}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500">
                  Delete any other A or AAAA records with the same name. If you use Cloudflare, set the record
                  to &quot;DNS only&quot; (grey cloud). DNS changes usually show up within minutes but can take up to 48 hours.
                </p>
              </div>
            )}

            {!status.hostingManaged && !status.verified && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md text-sm">
                The domain also has to be added to the web service in the Render dashboard
                (Settings &rarr; Custom Domains) before it can serve this page.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DnsCheckResult({ check, verified }: { check: DnsCheck; verified: boolean }) {
  if (verified) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md text-sm flex items-center">
        <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />
        Your domain is connected. Guests who visit it see this booking page.
      </div>
    );
  }

  const found = [...check.cnames.map((cname) => `CNAME ${cname}`), ...check.ips.map((ip) => `A ${ip}`)];

  return (
    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md text-sm space-y-1">
      {check.pointsToApp ? (
        <p>
          DNS looks right. The hosting provider is still verifying the domain and issuing its security
          certificate. Check again in a few minutes.
        </p>
      ) : (
        <p>
          The domain doesn&apos;t point here yet.{' '}
          {found.length > 0 ? `It currently points to: ${found.join(', ')}.` : 'No DNS records were found for it.'}
        </p>
      )}
      {check.hasIpv6 && (
        <p className="flex items-center">
          <AlertTriangle className="h-4 w-4 mr-1 shrink-0" />
          Remove the AAAA (IPv6) records for this domain. They can send guests somewhere else.
        </p>
      )}
    </div>
  );
}
