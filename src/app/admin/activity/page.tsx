'use client';

import * as React from 'react';
import useSWR from 'swr';
import {
  ArrowRightLeft,
  BedDouble,
  CalendarCheck2,
  History,
  MessageSquareText,
  MousePointerClick,
  Search,
  ShieldCheck,
  Sparkles,
  SprayCan,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import type { ActivityEntry } from '@/lib/dto';
import { fetcher } from '@/lib/fetcher';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, EmptyState, PageHeader, Skeleton } from '@/components/ui/primitives';
import { SegmentedControl } from '@/components/ui/segmented';
import { usePropertyUrl } from '@/components/console/ConsoleProvider';

type Filter = 'all' | 'agent' | 'classic';

function iconFor(action: string): LucideIcon {
  if (action === 'COMMAND') return Sparkles;
  if (action === 'MODE_SWITCH') return ArrowRightLeft;
  if (action.startsWith('BOOKING_NOTE')) return MessageSquareText;
  if (action.startsWith('BOOKING')) return CalendarCheck2;
  if (action.startsWith('HOUSEKEEPING')) return SprayCan;
  if (action.startsWith('ROOM')) return BedDouble;
  if (action.startsWith('RATE')) return Tag;
  return History;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function ActivityPage() {
  const url = usePropertyUrl('/api/admin/activity', { limit: 200 });
  const { data, isLoading } = useSWR<ActivityEntry[]>(url, fetcher, { refreshInterval: 30_000 });
  const [filter, setFilter] = React.useState<Filter>('all');
  const [q, setQ] = React.useState('');

  const rows = (data ?? []).filter((a) => {
    if (filter !== 'all' && a.source !== filter) return false;
    const t = q.trim().toLowerCase();
    return !t || a.summary.toLowerCase().includes(t) || a.user.name.toLowerCase().includes(t);
  });

  const groups: { day: string; items: ActivityEntry[] }[] = [];
  for (const a of rows) {
    const day = dayLabel(a.at);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(a);
    else groups.push({ day, items: [a] });
  }

  const agentActions = (data ?? []).filter((a) => a.source === 'agent' && a.action !== 'COMMAND').length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Activity"
        description="Every change, by every person — and every action the agent took on someone’s behalf."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-xs">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <History className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="text-xl font-semibold tabular">{data?.length ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Recent events</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-xs">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-agent-soft text-agent">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="text-xl font-semibold tabular">{data ? agentActions : '—'}</p>
            <p className="text-xs text-muted-foreground">Changes made via the agent</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-xs">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-soft text-success">
            <ShieldCheck className="h-[18px] w-[18px]" />
          </span>
          <p className="text-xs text-muted-foreground">Agent changes always wait for a person to confirm, and are attributed to them.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by guest, room or person…" className="pl-9" aria-label="Search activity" />
        </div>
        <SegmentedControl
          layoutId="activity-filter"
          aria-label="Source"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'agent', label: 'Agent', icon: <Sparkles className="h-3.5 w-3.5" /> },
            { value: 'classic', label: 'Manual', icon: <MousePointerClick className="h-3.5 w-3.5" /> },
          ]}
        />
      </div>

      <Card className="overflow-clip p-0">
        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-none" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={History} title={q || filter !== 'all' ? 'No matching activity' : 'Nothing has happened yet'} description="Check-ins, room changes, rate updates and agent actions will appear here." />
        ) : (
          groups.map((g) => (
            <section key={g.day}>
              <p className="sticky top-14 z-10 border-b bg-surface-sunken/90 px-4 py-1.5 text-xs font-medium backdrop-blur">{g.day}</p>
              <ul className="divide-y">
                {g.items.map((a) => {
                  const Icon = iconFor(a.action);
                  const isCommand = a.action === 'COMMAND';
                  return (
                    <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                      <span
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          a.source === 'agent' ? 'bg-agent-soft text-agent' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm', isCommand && 'text-muted-foreground')}>{a.summary}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Avatar name={a.user.name} size="sm" className="h-4 w-4 text-[8px]" />
                          {a.user.name}
                          {a.source === 'agent' && !isCommand && <span className="text-agent">· via agent</span>}
                        </p>
                      </div>
                      <time className="shrink-0 text-xs text-muted-foreground" dateTime={a.at} title={new Date(a.at).toLocaleString()}>
                        {timeAgo(a.at)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </Card>
    </div>
  );
}
