'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { AudioLines, Check, Inbox, KeyRound, Mail, Mic, MicOff, Phone, PhoneCall, PhoneOff, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { api, fetcher } from '@/lib/fetcher';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { EmptyState, PageHeader, Skeleton, StatTile } from '@/components/ui/primitives';
import { SegmentedControl } from '@/components/ui/segmented';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConsole, usePropertyUrl } from '@/components/console/ConsoleProvider';
import { useLiveVoice } from '@/components/voice/useLiveVoice';
import { VoiceOrb } from '@/components/voice/VoiceOrb';
import { WelcomeBanner } from '@/components/console/WelcomeBanner';

interface VoiceConfig {
  enabled: boolean;
  voice: string;
  greeting: string | null;
  instructions: string | null;
  faqs: { q: string; a: string }[];
  handoffPhone: string | null;
  guestWidget: boolean;
}
interface VoiceOverview {
  connected: boolean;
  provider: 'openai' | 'elevenlabs';
  model: string;
  voices: string[];
  config: VoiceConfig;
  stats: { guestCalls: number; staffSessions: number; toolCalls: number; recentMinutes: number; openRequests: number };
  recent: { id: string; audience: string; startedAt: string; endedAt: string | null; toolCalls: number }[];
}
interface GuestRequest {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string;
  status: 'NEW' | 'DONE';
  createdAt: string;
}

type Tab = 'overview' | 'settings' | 'requests';

interface ModelCheck {
  model: string;
  role: string;
  ok: boolean;
  reason: string | null;
}

/** Try the guest line from the console: same voice, prompts and tools guests get. */
function TestCall({ propertyId, connected }: { propertyId: string; connected: boolean }) {
  const voice = useLiveVoice({
    propertyId,
    audience: 'guest',
    onToolCall: async (call, { token }) => {
      const res = await fetch('/api/voice/tool', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, name: call.name, arguments: call.arguments }) });
      const body = await res.json().catch(() => ({}));
      return res.ok ? body.output : { error: body.error ?? 'Lookup failed' };
    },
  });
  const live = voice.state === 'live' || voice.state === 'connecting';
  const agentLine = [...voice.captions].reverse().find((c) => c.role === 'agent')?.text;
  const [check, setCheck] = React.useState<ModelCheck[] | null>(null);
  const [checking, setChecking] = React.useState(false);
  async function runCheck() {
    setChecking(true);
    try {
      const res = await api<{ key: boolean; models: ModelCheck[] }>('/api/admin/voice/check');
      setCheck(res.models);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setChecking(false);
    }
  }
  return (
    <Card className="relative overflow-hidden p-6">
      <div className="bg-aurora pointer-events-none absolute inset-0 opacity-[0.06]" />
      <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <VoiceOrb state={voice.state} level={voice.level} speaking={voice.agentSpeaking} working={voice.working} size={72} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Hear what your guests hear</p>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {voice.error ? <span className="text-destructive">{voice.error}</span> : live ? agentLine ?? 'Listening — ask about a room for next weekend.' : 'Start a test call with your voice front desk. It uses live availability and your settings.'}
          </p>
        </div>
        <div className="flex gap-2">
          {live ? (
            <>
              <Button variant="outline" size="icon" onClick={voice.toggleMute} aria-label={voice.muted ? 'Unmute' : 'Mute'}>
                {voice.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button variant="destructive" onClick={voice.stop}>
                <PhoneOff className="h-4 w-4" /> End
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => void runCheck()} disabled={!connected || checking}>
                <ShieldCheck className="h-4 w-4" /> {checking ? 'Checking…' : 'Check connection'}
              </Button>
              <Button variant="agent" onClick={() => void voice.start()} disabled={!connected}>
                <PhoneCall className="h-4 w-4" /> Test call
              </Button>
            </>
          )}
        </div>
      </div>
      {check && (
        <ul className="relative mt-5 space-y-2 border-t pt-4 text-sm">
          {check.map((m) => (
            <li key={m.model} className="flex items-start gap-2.5">
              <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', m.ok ? 'bg-success-soft text-success' : 'bg-destructive/10 text-destructive')}>
                {m.ok ? <Check className="h-3 w-3" /> : <span className="text-xs font-bold">!</span>}
              </span>
              <span className="min-w-0">
                <span className="font-medium">{m.role}</span> <code className="rounded bg-muted px-1 font-mono text-xs">{m.model}</code>
                <span className="block text-muted-foreground">{m.ok ? 'Available to your OpenAI key.' : m.reason}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Settings({ data, onSaved }: { data: VoiceOverview; onSaved: () => void }) {
  const { propertyId, can } = useConsole();
  const [cfg, setCfg] = React.useState<VoiceConfig>(data.config);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => setCfg(data.config), [data.config]);
  const editable = can('voice.manage');
  const dirty = JSON.stringify(cfg) !== JSON.stringify(data.config);
  const set = <K extends keyof VoiceConfig>(k: K, v: VoiceConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      await api('/api/admin/voice', {
        method: 'PUT',
        json: { propertyId, ...cfg, faqs: cfg.faqs.filter((f) => f.q.trim() && f.a.trim()) },
      });
      toast.success('Voice settings saved — new calls use them right away');
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <fieldset disabled={!editable} className="space-y-6">
      <Card className="divide-y p-0">
        {[
          { k: 'enabled' as const, title: 'Voice front desk', text: 'Answer guest questions by voice with live availability and prices.' },
          { k: 'guestWidget' as const, title: '“Talk to us” on your booking page', text: 'Guests can start a voice conversation right from your hotel page.' },
        ].map((row) => (
          <div key={row.k} className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-medium">{row.title}</p>
              <p className="text-xs text-muted-foreground">{row.text}</p>
            </div>
            <Switch checked={cfg[row.k]} onCheckedChange={(v) => set(row.k, v)} aria-label={row.title} />
          </div>
        ))}
      </Card>

      <Card className="space-y-5 p-5 sm:p-6">
        <p className="text-sm font-semibold">How it sounds</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.provider === 'elevenlabs' ? (
            <Field label="Voice" htmlFor="v-voice" hint="Set ELEVENLABS_VOICE_ID to any voice from your ElevenLabs library.">
              <p id="v-voice" className="rounded-xl border bg-surface-sunken/60 px-3 py-2 text-sm text-muted-foreground">
                An ElevenLabs voice
              </p>
            </Field>
          ) : (
            <Field label="Voice" htmlFor="v-voice">
              <Select value={cfg.voice} onValueChange={(v) => set('voice', v)}>
                <SelectTrigger id="v-voice">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.voices.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v[0].toUpperCase() + v.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Hand-off phone" htmlFor="v-phone" hint="Given out when a caller wants a person.">
            <Input id="v-phone" type="tel" value={cfg.handoffPhone ?? ''} onChange={(e) => set('handoffPhone', e.target.value)} placeholder="+1 831 555 0100" />
          </Field>
        </div>
        <Field label="Greeting" htmlFor="v-greet" hint="The first thing callers hear.">
          <Input id="v-greet" value={cfg.greeting ?? ''} onChange={(e) => set('greeting', e.target.value)} placeholder="Thanks for calling the Saltwater Inn — how can I help?" maxLength={300} />
        </Field>
        <Field label="House rules" htmlFor="v-rules" hint="Anything the voice should always do or never say. It still can’t invent prices or availability.">
          <Textarea id="v-rules" rows={4} value={cfg.instructions ?? ''} onChange={(e) => set('instructions', e.target.value)} placeholder={'Always mention free breakfast.\nPets: dogs under 30 lb, $25 per night.\nWe don’t do day-use rooms.'} maxLength={4000} />
        </Field>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Answers to common questions</p>
            <p className="text-xs text-muted-foreground">Parking, breakfast, pets, early check-in — the voice quotes these word for word.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => set('faqs', [...cfg.faqs, { q: '', a: '' }])} disabled={cfg.faqs.length >= 40}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {cfg.faqs.length === 0 && <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">No answers yet. Add your top three questions to start.</p>}
          {cfg.faqs.map((f, i) => (
            <div key={i} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_1.4fr_auto]">
              <Input value={f.q} onChange={(e) => set('faqs', cfg.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} placeholder="Is parking free?" aria-label={`Question ${i + 1}`} />
              <Input value={f.a} onChange={(e) => set('faqs', cfg.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} placeholder="Yes — free on-site parking for every guest." aria-label={`Answer ${i + 1}`} />
              <Button variant="ghost" size="icon" onClick={() => set('faqs', cfg.faqs.filter((_, j) => j !== i))} aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {editable && (
        <div className="flex justify-end gap-2">
          {dirty && (
            <Button variant="ghost" onClick={() => setCfg(data.config)}>
              Discard
            </Button>
          )}
          <Button onClick={save} loading={saving} disabled={!dirty}>
            Save settings
          </Button>
        </div>
      )}
    </fieldset>
  );
}

function Requests() {
  const url = usePropertyUrl('/api/admin/voice/requests');
  const { data, mutate, isLoading } = useSWR<GuestRequest[]>(url, fetcher, { refreshInterval: 30_000 });
  async function mark(r: GuestRequest, status: 'NEW' | 'DONE') {
    try {
      await api(`/api/admin/voice/requests/${r.id}`, { method: 'PATCH', json: { status } });
      await mutate();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  if (isLoading) return <Skeleton className="h-60 rounded-2xl" />;
  if (!data?.length) return <EmptyState icon={Inbox} title="No messages yet" description="When a caller needs something the voice can’t do, it takes a message and it lands here." />;
  return (
    <Card className="divide-y p-0">
      {data.map((r) => (
        <div key={r.id} className={cn('flex flex-col gap-3 p-4 sm:flex-row sm:items-start', r.status === 'DONE' && 'opacity-60')}>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {r.name} <span className="font-normal text-muted-foreground">· {timeAgo(r.createdAt)}</span>
            </p>
            <p className="mt-1 text-sm">{r.message}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {r.phone && (
                <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Phone className="h-3 w-3" /> {r.phone}
                </a>
              )}
              {r.email && (
                <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Mail className="h-3 w-3" /> {r.email}
                </a>
              )}
            </div>
          </div>
          {r.status === 'NEW' ? (
            <Button size="sm" variant="outline" onClick={() => mark(r, 'DONE')}>
              <Check className="h-4 w-4" /> Done
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => mark(r, 'NEW')}>
              Reopen
            </Button>
          )}
        </div>
      ))}
    </Card>
  );
}

export default function VoicePage() {
  const { propertyId, property } = useConsole();
  const url = usePropertyUrl('/api/admin/voice');
  const { data, mutate } = useSWR<VoiceOverview>(url, fetcher);
  const [tab, setTab] = React.useState<Tab>('overview');

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Voice front desk"
        description={property ? `The voice that answers for ${property.name} — on your booking page today, on your phone line next.` : undefined}
        actions={
          <SegmentedControl
            layoutId="voice-tab"
            aria-label="Voice sections"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'overview', label: 'Overview' },
              { value: 'settings', label: 'Settings' },
              { value: 'requests', label: `Messages${data?.stats.openRequests ? ` · ${data.stats.openRequests}` : ''}` },
            ]}
          />
        }
      />

      <WelcomeBanner title="Your voice front desk is set up">
        Add your top questions under Settings, check your rooms and prices under Rooms and Rates, then press Test call to hear it.
      </WelcomeBanner>

      {!data || !propertyId ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : (
        <>
          {!data.connected && (
            <Card className="flex flex-col gap-3 border-warning/30 bg-warning-soft/50 p-5 sm:flex-row sm:items-center">
              <KeyRound className="h-5 w-5 shrink-0 text-warning" />
              <div className="flex-1 text-sm">
                <p className="font-medium">Connect the voice model to go live</p>
                <p className="text-muted-foreground">
                  Add <code className="rounded bg-muted px-1 font-mono text-xs">ELEVENLABS_API_KEY</code> (or <code className="rounded bg-muted px-1 font-mono text-xs">OPENAI_API_KEY</code>) to the server environment; everything else on this page works now.
                </p>
              </div>
            </Card>
          )}

          {tab === 'overview' && (
            <div className="space-y-6">
              <TestCall propertyId={propertyId} connected={data.connected} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Guest conversations" value={data.stats.guestCalls} hint="Last 7 days" icon={AudioLines} tone="agent" />
                <StatTile label="Hands-free staff sessions" value={data.stats.staffSessions} hint="Last 7 days" icon={Mic} tone="brand" />
                <StatTile label="Lookups & actions" value={data.stats.toolCalls} hint="Answered from live data" icon={ShieldCheck} tone="success" />
                <StatTile label="Messages to handle" value={data.stats.openRequests} hint="Left with the voice" icon={Inbox} tone={data.stats.openRequests ? 'warning' : 'neutral'} onClick={() => setTab('requests')} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { icon: AudioLines, title: 'Booking page', text: !(data.config.guestWidget && data.config.enabled) ? 'Off — turn it on in Settings.' : data.connected ? 'Live — guests see “Talk to us”.' : 'Switched on — appears for guests once the voice model is connected.', ok: data.config.guestWidget && data.config.enabled && data.connected },
                  { icon: Mic, title: 'Staff hands-free', text: 'Press Talk in the Agent workspace. Changes still need your “yes”.', ok: data.connected, href: '/admin/agent' },
                  { icon: PhoneCall, title: 'Phone line', text: 'Point your hotel number at StayOS over SIP. Ask us to enable it for your property.', ok: false },
                ].map((c) => (
                  <Card key={c.title} className="p-5">
                    <div className="flex items-center justify-between">
                      <c.icon className="h-5 w-5 text-muted-foreground" />
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', c.ok ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground')}>{c.ok ? 'Ready' : c.title === 'Phone line' ? 'On request' : 'Not ready'}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold">{c.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{c.text}</p>
                    {c.href && (
                      <Link href={c.href} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                        Open the agent
                      </Link>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
          {tab === 'settings' && <Settings data={data} onSaved={() => void mutate()} />}
          {tab === 'requests' && <Requests />}
        </>
      )}
    </div>
  );
}
