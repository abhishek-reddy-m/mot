'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSWRConfig } from 'swr';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { ArrowRight, Check, LayoutGrid, Monitor, Moon, ShieldCheck, Sparkles, Sun, type LucideIcon } from 'lucide-react';
import type { InterfaceMode } from '@/lib/dto';
import { api } from '@/lib/fetcher';
import { roleLabel } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/primitives';
import { useConsole } from '@/components/console/ConsoleProvider';

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t py-8 first:border-t-0 first:pt-0 md:grid-cols-[240px_1fr] md:gap-10">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}

function ModeCard({
  mode,
  selected,
  onSelect,
  disabled,
  loading,
}: {
  mode: InterfaceMode;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const agentic = mode === 'AGENTIC';
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled || loading}
      aria-pressed={selected}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-left transition-all',
        selected ? (agentic ? 'border-agent/50 ring-2 ring-agent/20' : 'border-primary/50 ring-2 ring-primary/20') : 'hover:-translate-y-0.5 hover:shadow-soft',
        (disabled || loading) && 'cursor-not-allowed opacity-70 hover:translate-y-0 hover:shadow-none'
      )}
    >
      {/* Miniature of the surface */}
      <div className={cn('relative h-28 border-b p-3', agentic ? 'bg-agent-soft/40' : 'bg-surface-sunken')}>
        {agentic ? (
          <div className="flex h-full flex-col justify-end gap-1.5">
            <div className="ml-auto h-2.5 w-2/5 rounded-full bg-agent/30" />
            <div className="h-9 w-4/5 rounded-lg border bg-card shadow-xs" />
            <div className="mt-1 h-5 w-full rounded-full border border-agent/30 bg-card" />
          </div>
        ) : (
          <div className="flex h-full gap-2">
            <div className="w-8 space-y-1.5 rounded-md bg-card p-1.5 shadow-xs">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-1.5 rounded bg-muted" />
              ))}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-6 rounded-md bg-card shadow-xs" />
                ))}
              </div>
              <div className="h-[52px] rounded-md bg-card shadow-xs" />
            </div>
          </div>
        )}
        {selected && (
          <span className={cn('absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full text-white', agentic ? 'bg-agent' : 'bg-primary')}>
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          {agentic ? <Sparkles className="h-4 w-4 text-agent" /> : <LayoutGrid className="h-4 w-4 text-primary" />}
          {agentic ? 'Agentic' : 'Classic'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {agentic
            ? 'Start in the agent workspace: ask in plain language, review a plan, confirm. Classic screens are one click away.'
            : 'Start on dashboards, lists and the room board. The agent is always one ⌘K away.'}
        </p>
      </div>
    </button>
  );
}

export default function SettingsPage() {
  const { ctx, property, can, preferredMode, setMode, hasModePreference, clearModePreference } = useConsole();
  const { mutate } = useSWRConfig();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = React.useState<InterfaceMode | null>(null);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  async function setDefault(mode: InterfaceMode) {
    if (!property || property.interfaceMode === mode) return;
    setSaving(mode);
    try {
      await api(`/api/properties/${property.id}/interface-mode`, { method: 'PATCH', json: { interfaceMode: mode } });
      await mutate('/api/admin/context');
      toast.success(`New sessions at ${property.name} start in ${mode === 'AGENTIC' ? 'Agentic' : 'Classic'} mode`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  const themes: { value: string; label: string; icon: LucideIcon }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6 lg:p-8">
      <PageHeader title="Settings" description={property ? `${property.name} · signed in as ${ctx?.user.name} (${roleLabel(ctx?.user.role ?? '')})` : undefined} />

      <Card className="p-5 sm:p-8">
        {can('agent.use') && (
          <Section title="Your workspace" description="Where the console opens for you. You can switch any time from the top bar.">
            <div className="grid gap-4 sm:grid-cols-2">
              {(['CLASSIC', 'AGENTIC'] as const).map((m) => (
                <ModeCard key={m} mode={m} selected={preferredMode === m} onSelect={() => setMode(m, { navigate: false })} />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {hasModePreference ? (
                <>
                  Your choice overrides the property default ({property?.interfaceMode === 'AGENTIC' ? 'Agentic' : 'Classic'}).{' '}
                  <button onClick={clearModePreference} className="font-medium text-primary hover:underline">
                    Follow the default instead
                  </button>
                </>
              ) : (
                'Following the property default.'
              )}
            </p>
          </Section>
        )}

        {can('mode.setDefault') && property && (
          <Section title="Default for your team" description={`Where new staff sessions at ${property.name} start. People can still pick their own.`}>
            <div className="inline-flex rounded-xl bg-muted p-1">
              {(['CLASSIC', 'AGENTIC'] as const).map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={property.interfaceMode === m ? 'outline' : 'ghost'}
                  className={cn('min-w-28', property.interfaceMode === m && 'bg-card shadow-soft')}
                  loading={saving === m}
                  onClick={() => setDefault(m)}
                >
                  {m === 'AGENTIC' ? <Sparkles className="h-4 w-4 text-agent" /> : <LayoutGrid className="h-4 w-4" />}
                  {m === 'AGENTIC' ? 'Agentic' : 'Classic'}
                </Button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Changes are recorded in the activity log.</p>
          </Section>
        )}

        <Section title="Appearance" description="Applies to the staff console on this device. Guest pages always use your brand’s light theme.">
          <div className="grid grid-cols-3 gap-3 sm:max-w-md">
            {themes.map((t) => {
              const active = mounted && (theme ?? 'light') === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border bg-card px-3 py-4 text-sm transition-all',
                    active ? 'border-primary/50 ring-2 ring-primary/15' : 'hover:bg-accent'
                  )}
                >
                  <t.icon className="h-5 w-5 text-muted-foreground" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </Section>

        {can('agent.use') && (
          <Section title="Agent" description="How the agent understands requests and what it may do.">
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border p-4">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-agent" />
                <div className="text-sm">
                  <p className="font-medium">{ctx?.agent.llmEnabled ? 'Language model connected' : 'Built-in command understanding'}</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {ctx?.agent.llmEnabled
                      ? 'Free-form requests the built-in parser can’t handle are interpreted by the connected model — it never touches data directly.'
                      : 'Runs entirely on your server: fast, private and deterministic. Every answer comes from live reservations, rooms and rates.'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <div className="text-sm">
                  <p className="font-medium">Changes always need your confirmation</p>
                  <p className="mt-0.5 text-muted-foreground">
                    The agent proposes a plan; nothing changes until someone with the right role confirms it. Plans expire after 10 minutes and run once.
                  </p>
                </div>
              </div>
            </div>
          </Section>
        )}

        {can('property.write') && property && (
          <Section title="Property" description="Name, address, photos, policies and your booking page’s brand colour.">
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/admin/properties/${property.id}`}>
                  Edit property details <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href={`/properties/${property.id}`} target="_blank">
                  View booking page
                </Link>
              </Button>
            </div>
          </Section>
        )}
      </Card>
    </div>
  );
}
