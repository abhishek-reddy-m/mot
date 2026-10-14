'use client';

import * as React from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Copy, KeyRound, Phone, PhoneCall, RefreshCw } from 'lucide-react';
import { api, fetcher } from '@/lib/fetcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/primitives';
import { useConsole, usePropertyUrl } from '@/components/console/ConsoleProvider';

interface PhoneOverview {
  ready: boolean;
  canManage: boolean;
  /** Why this hotel's line can't be changed here (public demo hotels). */
  locked: string | null;
  /** The hotel's master voice switch (Settings). */
  voiceOn: boolean;
  line: { enabled: boolean; transferNumber: string | null } | null;
  urlIssue: string | null;
  /** Live status was fetched (managers only). */
  checked: boolean;
  status: { agentId: string; agentName: string; numbers: { phoneNumber: string; label: string | null; provider: string }[] } | null;
  statusError: string | null;
}

const code = 'rounded bg-muted px-1 font-mono text-xs';

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 border-warning/30 bg-warning-soft/50 p-5 sm:flex-row sm:items-start">
      <KeyRound className="h-5 w-5 shrink-0 text-warning" />
      <div className="flex-1 text-sm">
        <p className="font-medium">{title}</p>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </Card>
  );
}

/**
 * The hotel's phone line: StayOS keeps a phone agent for this hotel in
 * ElevenLabs; numbers (Twilio, SIP trunk, Exotel) are pointed at it there,
 * and the hotel forwards its existing number to one of them.
 */
export function PhoneLine({ onChanged }: { onChanged?: () => void }) {
  const { propertyId, property } = useConsole();
  const url = usePropertyUrl('/api/admin/voice/phone', { check: 1 });
  const { data, mutate, isValidating } = useSWR<PhoneOverview>(url, fetcher, { revalidateOnFocus: false });
  const [enabled, setEnabled] = React.useState(true);
  const [transfer, setTransfer] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setEnabled(data?.line?.enabled ?? true);
    setTransfer(data?.line?.transferNumber ?? '');
  }, [data?.line?.enabled, data?.line?.transferNumber]);

  async function save(next: { enabled: boolean; transferNumber: string }) {
    setSaving(true);
    try {
      const res = await api<PhoneOverview>('/api/admin/voice/phone', { method: 'PUT', json: { propertyId, enabled: next.enabled, transferNumber: next.transferNumber.trim() || null } });
      await mutate(res, { revalidate: false });
      if (res.statusError) toast.error(res.statusError);
      else toast.success(next.enabled ? 'Phone line is on' : 'Phone line paused — calls get a short “not available” message');
      onChanged?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!data) return <Skeleton className="h-72 rounded-2xl" />;

  if (!data.ready) {
    return (
      <Notice title="Phone lines run on ElevenLabs Agents">
        Add <code className={code}>ELEVENLABS_API_KEY</code> to the server environment and redeploy. Then you can answer your hotel number with this voice.
      </Notice>
    );
  }

  if (!data.line) {
    return (
      <div className="space-y-6">
        {data.urlIssue && <Notice title="StayOS needs a public address for phone calls">{data.urlIssue}</Notice>}
        <Card className="relative overflow-hidden p-6">
          <div className="bg-aurora pointer-events-none absolute inset-0 opacity-[0.06]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-agent-soft text-agent">
              <PhoneCall className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Answer your hotel phone with this voice</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Same answers as your booking page — live availability, prices, bookings and messages for the team. Keep your number: forward the calls you can’t pick up.
              </p>
            </div>
            {data.canManage ? (
              <Button variant="agent" onClick={() => void save({ enabled: true, transferNumber: '' })} loading={saving} disabled={!!data.urlIssue}>
                <PhoneCall className="h-4 w-4" /> Turn on phone line
              </Button>
            ) : (
              <p className="max-w-xs text-sm text-muted-foreground">{data.locked ?? 'Ask the hotel owner to turn this on.'}</p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const numbers = data.status?.numbers ?? [];
  const agentName = data.status?.agentName ?? `StayOS — ${property?.name ?? 'your hotel'} phone`;
  const agentId = data.status?.agentId;
  const target = numbers[0]?.phoneNumber ?? '<new number>';
  const badge = !data.line.enabled || !data.voiceOn ? (
    <Badge variant="neutral">Paused</Badge>
  ) : data.statusError || data.urlIssue ? (
    <Badge variant="danger" dot>
      Needs attention
    </Badge>
  ) : !data.checked ? (
    <Badge variant="neutral">On</Badge>
  ) : !data.status ? (
    <Badge variant="neutral">Checking…</Badge>
  ) : numbers.length ? (
    <Badge variant="success" dot>
      Live
    </Badge>
  ) : (
    <Badge variant="warning" dot>
      Waiting for a number
    </Badge>
  );
  const dirty = enabled !== data.line.enabled || transfer.trim() !== (data.line.transferNumber ?? '');

  return (
    <div className="space-y-6">
      {data.urlIssue && <Notice title="StayOS needs a public address for phone calls">{data.urlIssue}</Notice>}

      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-sm font-semibold">Phone line</p>
              {badge}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Calls to these numbers are answered by your voice front desk.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void mutate()} disabled={isValidating}>
            <RefreshCw className={isValidating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh
          </Button>
        </div>

        {data.statusError && <p className="mt-4 text-sm text-destructive">{data.statusError}</p>}
        {!data.voiceOn && <p className="mt-4 text-sm text-muted-foreground">The voice front desk is switched off in Settings, so callers hear a short “not available” message.</p>}
        {!data.checked && !data.urlIssue && <p className="mt-4 text-sm text-muted-foreground">A manager or the owner can see which numbers ring this line.</p>}

        {data.status && (
          <>
            <ul className="mt-4 space-y-2">
              {numbers.length === 0 && <li className="rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground">No number rings this hotel yet — follow the steps below.</li>}
              {numbers.map((n) => (
                <li key={n.phoneNumber} className="flex items-center gap-3 rounded-xl border px-4 py-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium tabular-nums">{n.phoneNumber}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[n.label, n.provider === 'sip_trunk' ? 'SIP trunk' : n.provider[0].toUpperCase() + n.provider.slice(1)].filter(Boolean).join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Agent in ElevenLabs:</span>
              <span className="font-medium text-foreground">{agentName}</span>
              <code className={code}>{data.status.agentId}</code>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Copy agent ID"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(data.status!.agentId);
                    toast.success('Agent ID copied');
                  } catch {
                    toast.error('Couldn’t copy — select the ID instead');
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}
      </Card>

      {data.checked && data.line.enabled && (
        <Card className="p-5 sm:p-6">
          <p className="text-sm font-semibold">{numbers.length ? 'How calls reach the assistant' : 'Connect your number'}</p>
          <ol className="mt-4 space-y-4 text-sm">
            {[
              {
                title: 'Get a number for the assistant',
                body: (
                  <>
                    Most countries: a local number from Twilio (about $1.15 a month in the US). India: an Indian provider such as Exotel — ask ElevenLabs about India data residency first. A hotel phone system with SIP: your provider’s SIP trunk.
                  </>
                ),
              },
              {
                title: 'Point it at this hotel in ElevenLabs',
                body: (
                  <>
                    Whoever runs your StayOS ElevenLabs account imports the number under <strong>Agents → Phone numbers → Import number</strong> and picks the agent <strong>{agentName}</strong>
                    {agentId ? (
                      <>
                        {' '}
                        — check its ID is <code className={code}>{agentId}</code>
                      </>
                    ) : null}
                    . Already imported? Open the number and switch its agent. Hotel owners don’t need access to that account — send them the number and this ID.
                  </>
                ),
              },
              {
                title: 'Keep your hotel number — forward to it',
                body: (
                  <>
                    Dial from the hotel phone. Most mobiles: <code className={code}>{`**61*${target}*11*20#`}</code> forwards calls nobody answers in 20 seconds and <code className={code}>{`**67*${target}#`}</code> calls that come in while you’re busy (<code className={code}>##61#</code> and <code className={code}>##67#</code> undo them — your voicemail may need switching back on). US landlines: <code className={code}>*72</code> then the number forwards every call, <code className={code}>*73</code> stops it. Codes vary by carrier (Verizon uses its own) — your carrier or phone system can set “forward when unanswered” too.
                  </>
                ),
              },
              { title: 'Test it', body: <>Press Refresh — the number shows above once it points at this hotel’s agent. Then call your hotel number and let it ring through.</> },
            ].map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-0.5 text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">Calls cost about $0.08–0.10 a minute in ElevenLabs, plus your phone provider’s rate. Calls end after 10 minutes, or after 45 seconds of silence.</p>
        </Card>
      )}

      <fieldset disabled={!data.canManage} className="space-y-4">
        <Card className="divide-y p-0">
          <div className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-medium">Answer calls on this line</p>
              <p className="text-xs text-muted-foreground">Paused lines play a short “not available right now” message.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Answer calls on this line" />
          </div>
          <div className="p-5">
            <Field label="Put callers through to" htmlFor="p-transfer" hint="When a caller asks for a person. Use a direct line or mobile that doesn’t forward back to the assistant — otherwise calls loop.">
              <Input id="p-transfer" type="tel" value={transfer} onChange={(e) => setTransfer(e.target.value)} placeholder="+1 831 555 0100 — leave empty to take a message instead" maxLength={40} />
            </Field>
          </div>
        </Card>
        {data.canManage ? (
          <div className="flex justify-end gap-2">
            {dirty && (
              <Button
                variant="ghost"
                onClick={() => {
                  setEnabled(data.line!.enabled);
                  setTransfer(data.line!.transferNumber ?? '');
                }}
              >
                Discard
              </Button>
            )}
            <Button onClick={() => void save({ enabled, transferNumber: transfer })} loading={saving} disabled={!dirty}>
              Save phone line
            </Button>
          </div>
        ) : (
          <p className="text-right text-xs text-muted-foreground">{data.locked ?? 'Only the hotel owner can change the phone line.'}</p>
        )}
      </fieldset>
    </div>
  );
}
