'use client';

import * as React from 'react';
import { AlertTriangle, Bot, Info, Siren, UserRound } from 'lucide-react';
import type { AgentBlock } from '@/lib/agent/blocks';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/primitives';
import { RoomGrid, RoomLegend } from '@/components/hotel/RoomGrid';
import { TaskStatusBadge } from '@/components/hotel/badges';
import { useAgentUI } from '../AgentUI';

export function RoomsBlock({ block }: { block: Extract<AgentBlock, { type: 'rooms' }> }) {
  const { send, compact } = useAgentUI();
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-xs">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{block.title}</p>
        {!compact && <RoomLegend />}
      </div>
      <RoomGrid
        rooms={block.rooms}
        highlight={block.highlight}
        dense={compact}
        onRoomClick={(r) => send(r.current ? `show reservation ${r.current.code}` : r.arriving ? `show reservation ${r.arriving.code}` : `rooms on floor ${r.floor ?? ''}`)}
      />
    </div>
  );
}

export function HousekeepingBlock({ block }: { block: Extract<AgentBlock, { type: 'housekeeping' }> }) {
  const { send, busy } = useAgentUI();
  const open = block.tasks.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
  const done = block.tasks.length - open.length;
  const byPerson = new Map<string, number>();
  for (const t of open) byPerson.set(t.assignee?.name ?? 'Unassigned', (byPerson.get(t.assignee?.name ?? 'Unassigned') ?? 0) + 1);
  return (
    <div className="rounded-2xl border bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <p className="text-sm font-medium">{block.title}</p>
          <p className="text-xs text-muted-foreground">
            {open.length} open · {done} done today
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[...byPerson.entries()].map(([name, n]) => (
            <span key={name} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs', name === 'Unassigned' && 'border-dashed text-warning')}>
              {name !== 'Unassigned' ? <Avatar name={name} size="sm" className="h-4 w-4 text-[8px]" /> : <UserRound className="h-3 w-3" />}
              {name.split(' ')[0]} · {n}
            </span>
          ))}
        </div>
      </div>
      <div className="divide-y">
        {block.tasks.slice(0, 10).map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="w-12 font-semibold tabular">{t.room.number}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {t.room.roomTypeName}
              {t.priority >= 3 && <span className="ml-2 rounded bg-warning-soft px-1.5 text-[11px] font-medium text-warning">Needed for arrival</span>}
            </span>
            <span className="hidden w-28 truncate text-xs text-muted-foreground sm:block">{t.assignee?.name ?? 'Unassigned'}</span>
            <TaskStatusBadge status={t.status} />
          </div>
        ))}
      </div>
      {open.some((t) => !t.assignee) && (
        <div className="border-t p-3">
          <Button size="sm" variant="soft" disabled={busy} onClick={() => send('auto-assign housekeeping')}>
            Auto-assign unassigned rooms
          </Button>
        </div>
      )}
    </div>
  );
}

const ALERT_ICON = { danger: Siren, warning: AlertTriangle, info: Info } as const;
const ALERT_STYLE = {
  danger: 'border-destructive/30 bg-destructive-soft/50 [&_svg]:text-destructive',
  warning: 'border-warning/30 bg-warning-soft/60 [&_svg]:text-warning',
  info: 'border-info/25 bg-info-soft/60 [&_svg]:text-info',
} as const;

export function AlertsBlock({ block }: { block: Extract<AgentBlock, { type: 'alerts' }> }) {
  const { send, busy } = useAgentUI();
  return (
    <div className="space-y-2">
      {block.items.map((a) => {
        const Icon = ALERT_ICON[a.tone];
        return (
          <div key={a.id} className={cn('flex items-start gap-3 rounded-xl border px-3.5 py-3', ALERT_STYLE[a.tone])}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{a.title}</p>
              {a.detail && <p className="mt-0.5 text-xs text-muted-foreground">{a.detail}</p>}
            </div>
            {a.command && (
              <Button size="sm" variant="outline" className="shrink-0 bg-surface" disabled={busy} onClick={() => send(a.command!)}>
                Handle
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ActivityBlock({ block }: { block: Extract<AgentBlock, { type: 'activity' }> }) {
  return (
    <div className="rounded-2xl border bg-card shadow-xs">
      <ol className="divide-y">
        {block.items.map((a) => (
          <li key={a.id} className="flex items-start gap-3 px-4 py-2.5">
            <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', a.source === 'agent' ? 'bg-agent-soft text-agent' : 'bg-muted text-muted-foreground')}>
              {a.source === 'agent' ? <Bot className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{a.summary}</p>
              <p className="text-xs text-muted-foreground">
                {a.user.name} · {a.source === 'agent' ? 'via agent' : 'classic'} · {timeAgo(a.at)}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {block.items.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">No activity yet.</p>}
    </div>
  );
}
