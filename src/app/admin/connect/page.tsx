'use client';

import * as React from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Cable,
  CheckCircle2,
  CircleAlert,
  Cloud,
  Copy,
  Download,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Unplug,
  Wand2,
} from 'lucide-react';
import { api, fetcher } from '@/lib/fetcher';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/frontdesk/dialogs';
import { useConsole, usePropertyUrl } from '@/components/console/ConsoleProvider';
import { WelcomeBanner } from '@/components/console/WelcomeBanner';

interface Connection {
  id: string;
  system: string;
  mode: 'DESKTOP' | 'CLOUD';
  status: 'PENDING' | 'CONNECTED' | 'ERROR' | 'PAUSED';
  loginUrl: string | null;
  hasCredentials: boolean;
  deviceName: string | null;
  devicePaired: boolean;
  lastSeenAt: string | null;
  online: boolean;
  lastError: string | null;
  pairing: { code: string; expiresAt: string } | null;
}
interface Task {
  id: string;
  kind: string;
  instruction: string;
  status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED' | 'NEEDS_HELP' | 'CANCELLED';
  summary: string | null;
  error: string | null;
  createdAt: string;
}
interface BridgeData {
  connection: Connection | null;
  tasks: Task[];
  systems: string[];
  operator: { ready: boolean; model: string };
  vaultReady: boolean;
  cloudWorker: boolean;
}

const STATUS_TONE: Record<Task['status'], string> = {
  QUEUED: 'bg-muted text-muted-foreground',
  RUNNING: 'bg-agent-soft text-agent',
  DONE: 'bg-success-soft text-success',
  FAILED: 'bg-destructive-soft text-destructive',
  NEEDS_HELP: 'bg-warning-soft text-warning',
  CANCELLED: 'bg-muted text-muted-foreground',
};

function Setup({ data, initial, onDone }: { data: BridgeData; initial?: Connection | null; onDone: () => void }) {
  const { propertyId, can } = useConsole();
  const { mutate } = useSWRConfig();
  const [system, setSystem] = React.useState(initial?.system ?? '');
  const [other, setOther] = React.useState('');
  const [mode, setMode] = React.useState<'DESKTOP' | 'CLOUD'>(initial?.mode ?? 'DESKTOP');
  const [loginUrl, setLoginUrl] = React.useState(initial?.loginUrl ?? '');
  const [busy, setBusy] = React.useState(false);
  const chosen = system === 'Other' ? other.trim() : system;

  async function save() {
    setBusy(true);
    try {
      await api('/api/admin/bridge', { method: 'PUT', json: { propertyId, system: chosen, mode, loginUrl: loginUrl.trim() || null } });
      await mutate('/api/admin/context');
      toast.success(`${chosen} added — finish connecting below`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!can('bridge.manage')) return <EmptyState icon={Cable} title="Not connected yet" description="Ask the owner to connect your PMS so the agent can work in it." />;

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <p className="text-sm font-semibold">1 · Which system do you use today?</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {data.systems.map((s) => (
            <button
              key={s}
              onClick={() => setSystem(s)}
              className={cn('rounded-xl border px-3 py-3 text-left text-sm font-medium transition-all', system === s ? 'border-primary bg-primary-soft/60 ring-1 ring-primary' : 'hover:bg-accent')}
            >
              {s}
            </button>
          ))}
        </div>
        {system === 'Other' && <Input className="mt-3" value={other} onChange={(e) => setOther(e.target.value)} placeholder="Your PMS name" aria-label="PMS name" />}
        <Field label="Sign-in address (optional)" htmlFor="pms-url" className="mt-4" hint="Where you log in to it, e.g. https://hotels.cloudbeds.com — the operator starts there.">
          <Input id="pms-url" type="url" value={loginUrl} onChange={(e) => setLoginUrl(e.target.value)} placeholder="https://" />
        </Field>
      </Card>

      <Card className="p-5 sm:p-6">
        <p className="text-sm font-semibold">2 · How should StayOS reach it?</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(
            [
              { m: 'DESKTOP', icon: Laptop, title: 'From a front-desk computer', text: 'Run the small StayOS Connector on a computer at the hotel. It uses a browser that’s already signed in — your logins never leave the building.', tag: 'Most private' },
              { m: 'CLOUD', icon: Cloud, title: 'In the StayOS cloud browser', text: 'Nothing to install. We sign in with a login you store here, sealed with AES-256 and never shown to the AI or to anyone.', tag: 'Nothing to install' },
            ] as const
          ).map((o) => (
            <button
              key={o.m}
              onClick={() => setMode(o.m)}
              aria-pressed={mode === o.m}
              className={cn('flex flex-col rounded-2xl border p-5 text-left transition-all', mode === o.m ? 'border-primary bg-primary-soft/40 ring-1 ring-primary' : 'hover:bg-accent')}
            >
              <div className="flex items-center justify-between">
                <o.icon className={cn('h-5 w-5', mode === o.m ? 'text-primary' : 'text-muted-foreground')} />
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{o.tag}</span>
              </div>
              <p className="mt-3 font-semibold">{o.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{o.text}</p>
            </button>
          ))}
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        {initial && (
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button onClick={save} loading={busy} disabled={!chosen}>
          {initial ? 'Save' : 'Continue'} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function DesktopPanel({ c, onChange }: { c: Connection; onChange: () => void }) {
  const { propertyId, can } = useConsole();
  const [busy, setBusy] = React.useState(false);
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const left = c.pairing ? Math.max(0, Math.round((new Date(c.pairing.expiresAt).getTime() - now) / 1000)) : 0;
  const command = c.pairing ? `node stayos-connector.mjs pair ${c.pairing.code} --server ${origin}` : '';

  async function newCode() {
    setBusy(true);
    try {
      await api('/api/admin/bridge/pairing', { method: 'POST', json: { propertyId } });
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function revoke() {
    try {
      await api(`/api/admin/bridge/pairing?propertyId=${propertyId}`, { method: 'DELETE' });
      toast.success('Connector disconnected');
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Laptop className="h-4 w-4 text-muted-foreground" /> Desktop connector
      </p>
      {c.devicePaired ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center">
          <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', c.online ? 'bg-success' : 'bg-muted-foreground/40')} />
          <div className="flex-1 text-sm">
            <p className="font-medium">{c.deviceName ?? 'Paired computer'}</p>
            <p className="text-xs text-muted-foreground">{c.online ? 'Online — ready for work' : c.lastSeenAt ? `Last seen ${timeAgo(c.lastSeenAt)} — start it with “node stayos-connector.mjs run”` : 'Waiting for it to start'}</p>
          </div>
          {can('bridge.manage') && (
            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive-soft" onClick={revoke}>
              <Unplug className="h-4 w-4" /> Disconnect
            </Button>
          )}
        </div>
      ) : (
        <ol className="mt-4 space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">1</span>
            <div className="flex-1">
              <p>Download the connector on the front-desk computer (needs Node.js 20+).</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href="/downloads/stayos-connector.mjs" download>
                    <Download className="h-4 w-4" /> stayos-connector.mjs
                  </a>
                </Button>
                <code className="rounded-lg bg-muted px-2 py-1.5 font-mono text-xs">npm i playwright &amp;&amp; npx playwright install chromium</code>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">2</span>
            <div className="min-w-0 flex-1">
              <p>Pair it with a one-time code.</p>
              {c.pairing && left > 0 ? (
                <div className="mt-2 rounded-xl border bg-surface-sunken/60 p-4">
                  <p className="font-mono text-3xl font-semibold tracking-[0.3em]">{c.pairing.code}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expires in {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-2 py-1.5 font-mono text-xs">{command}</code>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(command);
                          toast.success('Copied');
                        } catch {
                          /* select manually */
                        }
                      }}
                      aria-label="Copy command"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" className="mt-2" onClick={newCode} loading={busy} disabled={!can('bridge.manage')}>
                  <KeyRound className="h-4 w-4" /> Create pairing code
                </Button>
              )}
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">3</span>
            <p className="flex-1">
              Run <code className="rounded bg-muted px-1 font-mono text-xs">node stayos-connector.mjs run</code>, sign in to {c.system} in the window that opens, and leave it running.
            </p>
          </li>
        </ol>
      )}
    </Card>
  );
}

function CloudPanel({ c, data, onChange }: { c: Connection; data: BridgeData; onChange: () => void }) {
  const { propertyId, can } = useConsole();
  const [form, setForm] = React.useState({ username: '', password: '', totpSecret: '' });
  const [editing, setEditing] = React.useState(!c.hasCredentials);
  const [busy, setBusy] = React.useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/admin/bridge/credentials', { method: 'PUT', json: { propertyId, ...form, totpSecret: form.totpSecret.trim() || null } });
      setForm({ username: '', password: '', totpSecret: '' });
      setEditing(false);
      toast.success('Login sealed and stored');
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    try {
      await api(`/api/admin/bridge/credentials?propertyId=${propertyId}`, { method: 'DELETE' });
      setEditing(true);
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  return (
    <Card className="p-5 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Cloud className="h-4 w-4 text-muted-foreground" /> Cloud browser login
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Create a dedicated {c.system} user for StayOS if you can — you can see and revoke its access from {c.system} at any time.</p>
      {!editing && c.hasCredentials ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center">
          <Lock className="h-5 w-5 shrink-0 text-success" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Login stored · sealed</p>
            <p className="text-xs text-muted-foreground">Encrypted with AES-256-GCM. Never shown again, never sent to the AI.</p>
          </div>
          {can('bridge.manage') && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Replace
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive-soft" onClick={remove}>
                Remove
              </Button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={save} className="mt-4 space-y-4">
          <fieldset disabled={!can('bridge.manage') || !data.vaultReady} className="grid gap-4 sm:grid-cols-2">
            <Field label="Username" htmlFor="pms-user">
              <Input id="pms-user" autoComplete="off" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </Field>
            <Field label="Password" htmlFor="pms-pass">
              <Input id="pms-pass" type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Authenticator secret (optional)" htmlFor="pms-totp" className="sm:col-span-2" hint="If your PMS uses 2-step codes, paste the setup key so the cloud browser can generate them.">
              <Input id="pms-totp" autoComplete="off" value={form.totpSecret} onChange={(e) => setForm({ ...form, totpSecret: e.target.value })} className="font-mono" />
            </Field>
          </fieldset>
          {!data.vaultReady && <p className="text-xs text-warning">Secure storage isn’t configured on this server (STAYOS_VAULT_KEY), so logins can’t be saved yet.</p>}
          <div className="flex justify-end gap-2">
            {c.hasCredentials && (
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
            <Button type="submit" loading={busy} disabled={!form.username || !form.password || !data.vaultReady}>
              <ShieldCheck className="h-4 w-4" /> Seal and save
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function TaskList({ tasks, onChange }: { tasks: Task[]; onChange: () => void }) {
  const act = async (id: string, action: 'cancel' | 'retry') => {
    try {
      await api(`/api/admin/bridge/tasks/${id}`, { method: 'PATCH', json: { action } });
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  if (!tasks.length) return <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Nothing sent yet. Ask the agent — or use the box above.</p>;
  return (
    <ul className="divide-y rounded-2xl border bg-card">
      {tasks.map((t) => (
        <li key={t.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <p className="text-sm">{t.instruction}</p>
            {t.summary && <p className="mt-1 text-sm text-muted-foreground">{t.summary}</p>}
            {t.error && <p className="mt-1 text-sm text-destructive">{t.error}</p>}
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t.kind === 'LOOKUP' ? 'Look-up' : 'Change'} · {timeAgo(t.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', STATUS_TONE[t.status])}>
              {(t.status === 'RUNNING' || t.status === 'QUEUED') && <Loader2 className="h-3 w-3 animate-spin" />}
              {t.status === 'DONE' && <CheckCircle2 className="h-3 w-3" />}
              {(t.status === 'FAILED' || t.status === 'NEEDS_HELP') && <CircleAlert className="h-3 w-3" />}
              {t.status.replace('_', ' ').toLowerCase()}
            </span>
            {t.status === 'QUEUED' && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => act(t.id, 'cancel')}>
                Cancel
              </Button>
            )}
            {(t.status === 'FAILED' || t.status === 'NEEDS_HELP') && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => act(t.id, 'retry')}>
                <RotateCcw className="h-3 w-3" /> Retry
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ConnectPage() {
  const { propertyId, property, can, askAgent } = useConsole();
  const { mutate: globalMutate } = useSWRConfig();
  const url = usePropertyUrl('/api/admin/bridge');
  const { data, mutate } = useSWR<BridgeData>(url, fetcher, {
    refreshInterval: (d) => (d?.tasks.some((t) => t.status === 'QUEUED' || t.status === 'RUNNING') || d?.connection?.pairing ? 3000 : 15000),
  });
  const [editing, setEditing] = React.useState(false);
  const [instruction, setInstruction] = React.useState('');
  const [sending, setSending] = React.useState<null | 'LOOKUP' | 'FREEFORM'>(null);
  const [confirm, setConfirm] = React.useState<null | 'disconnect' | 'migrate' | 'change'>(null);
  const c = data?.connection;

  async function send(kind: 'LOOKUP' | 'FREEFORM') {
    setSending(kind);
    try {
      await api('/api/admin/bridge/tasks', { method: 'POST', json: { propertyId, instruction, kind } });
      setInstruction('');
      setConfirm(null);
      await mutate();
      toast.success(kind === 'LOOKUP' ? 'Look-up sent' : 'Change sent to the operator');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(null);
    }
  }
  async function pause(paused: boolean) {
    try {
      await api('/api/admin/bridge', { method: 'PATCH', json: { propertyId, paused } });
      await mutate();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function disconnect() {
    try {
      await api(`/api/admin/bridge?propertyId=${propertyId}`, { method: 'DELETE' });
      setConfirm(null);
      await mutate();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function migrate() {
    try {
      await api('/api/admin/setup-path', { method: 'PUT', json: { propertyId, setupPath: 'FULL' } });
      await globalMutate('/api/admin/context');
      toast.success('Welcome to StayOS — your front desk now runs here');
      window.location.href = '/admin/dashboard?welcome=1';
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const ready = c && c.status !== 'PAUSED' && (c.mode === 'CLOUD' ? c.hasCredentials && data?.cloudWorker : c.devicePaired);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Your PMS"
        description={c ? `StayOS works ${c.system} for ${property?.name ?? 'your hotel'} — nothing to migrate.` : 'Keep the system you know. Connect it once and the agent looks things up and makes changes there for you.'}
        actions={
          c && can('bridge.manage') && !editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => pause(c.status !== 'PAUSED')}>
                {c.status === 'PAUSED' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {c.status === 'PAUSED' ? 'Resume' : 'Pause'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                Change
              </Button>
            </>
          ) : undefined
        }
      />

      <WelcomeBanner title="Welcome to StayOS — one step left">
        Finish connecting {c?.system ?? 'your system'} below. Then open the Agent and ask “who’s arriving today?” — it will check {c?.system ?? 'your PMS'} for you.
      </WelcomeBanner>

      {!data ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : !c || editing ? (
        <Setup data={data} initial={editing ? c : null} onDone={() => { setEditing(false); void mutate(); }} />
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Cable className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold tracking-tight">{c.system}</p>
                <p className="text-sm text-muted-foreground">
                  {c.mode === 'CLOUD' ? 'StayOS cloud browser' : 'Desktop connector'}
                  {c.loginUrl ? ` · ${c.loginUrl.replace(/^https?:\/\//, '')}` : ''}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                  c.status === 'PAUSED' ? 'bg-muted text-muted-foreground' : ready ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', c.status === 'PAUSED' ? 'bg-muted-foreground' : ready ? 'bg-success' : 'bg-warning')} />
                {c.status === 'PAUSED' ? 'Paused' : ready ? 'Ready' : c.mode === 'CLOUD' && c.hasCredentials ? 'Waiting for cloud worker' : 'Finish setup'}
              </span>
            </Card>
          </motion.div>

          {c.lastError && (
            <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" /> Last problem: {c.lastError}
            </p>
          )}

          {c.mode === 'DESKTOP' ? <DesktopPanel c={c} onChange={() => void mutate()} /> : <CloudPanel c={c} data={data} onChange={() => void mutate()} />}

          {c.mode === 'CLOUD' && !data.cloudWorker && (
            <p className="flex items-start gap-2 rounded-xl border px-4 py-3 text-sm text-muted-foreground">
              <Cloud className="mt-0.5 h-4 w-4 shrink-0" /> The StayOS cloud worker isn’t running for this server yet (it needs <code className="rounded bg-muted px-1 font-mono text-xs">BRIDGE_WORKER_SECRET</code>). Tasks wait in the queue until it starts — or switch to the desktop connector.
            </p>
          )}
          {!data.operator.ready && (
            <p className="flex items-start gap-2 rounded-xl border px-4 py-3 text-sm text-muted-foreground">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0" /> The operator runs on the StayOS server and needs <code className="rounded bg-muted px-1 font-mono text-xs">OPENAI_API_KEY</code> there. Tasks queue up until it’s set.
            </p>
          )}

          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Send something to {c.system}</p>
              {can('agent.use') && (
                <Button variant="ghost" size="sm" className="text-agent hover:bg-agent-soft" onClick={() => askAgent(`who is arriving today?`)}>
                  <Sparkles className="h-4 w-4" /> Or ask the agent
                </Button>
              )}
            </div>
            <Textarea className="mt-3" rows={2} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="e.g. Find the reservation for Jordan Smith arriving Friday and tell me the room and balance" />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => send('LOOKUP')} loading={sending === 'LOOKUP'} disabled={instruction.trim().length < 4}>
                <Search className="h-4 w-4" /> Look it up
              </Button>
              <Button onClick={() => setConfirm('change')} disabled={instruction.trim().length < 4}>
                <Wand2 className="h-4 w-4" /> Make this change
              </Button>
            </div>
          </Card>

          <div>
            <p className="mb-3 text-sm font-semibold">Recent work</p>
            <TaskList tasks={data.tasks} onChange={() => void mutate()} />
          </div>

          {can('property.write') && (
            <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="flex-1">
                <p className="text-sm font-semibold">Ready to run everything on StayOS?</p>
                <p className="mt-1 text-sm text-muted-foreground">Switch when it suits you — we’ll help move your rooms, rates and upcoming reservations. Your bridge keeps working until you do.</p>
              </div>
              <Button variant="outline" onClick={() => setConfirm('migrate')}>
                Move to StayOS <ArrowRight className="h-4 w-4" />
              </Button>
            </Card>
          )}

          {can('bridge.manage') && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive-soft" onClick={() => setConfirm('disconnect')}>
                <Unplug className="h-4 w-4" /> Disconnect {c.system}
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === 'change' ? `Make this change in ${c?.system}?` : confirm === 'migrate' ? 'Run this property on StayOS?' : `Disconnect ${c?.system}?`}
        description={
          confirm === 'change'
            ? `“${instruction.trim()}” — the operator changes only this and reports exactly what it did.`
            : confirm === 'migrate'
              ? 'Front desk, housekeeping, reservations and rates switch to StayOS screens. Add your rooms and upcoming stays (we can help) before you stop using your old system.'
              : 'Waiting tasks are cancelled and the stored login or paired computer stops working immediately.'
        }
        confirmLabel={confirm === 'change' ? 'Send change' : confirm === 'migrate' ? 'Switch to StayOS' : 'Disconnect'}
        destructive={confirm === 'disconnect'}
        loading={confirm === 'change' && sending === 'FREEFORM'}
        onConfirm={() => (confirm === 'change' ? send('FREEFORM') : confirm === 'migrate' ? migrate() : disconnect())}
      />
    </div>
  );
}
