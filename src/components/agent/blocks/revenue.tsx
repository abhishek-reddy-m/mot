'use client';

import * as React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { AgentBlock } from '@/lib/agent/blocks';
import { fmtDay } from '@/lib/format';
import { money } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { OccupancyChart } from '@/components/hotel/OccupancyChart';
import { useAgentUI } from '../AgentUI';

export function AvailabilityBlock({ block }: { block: Extract<AgentBlock, { type: 'availability' }> }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <p className="text-sm font-medium">
          {fmtDay(block.checkIn, 'weekday')} → {fmtDay(block.checkOut, 'weekday')}
        </p>
        <span className="text-xs text-muted-foreground">
          {block.guests} guest{block.guests > 1 ? 's' : ''}
        </span>
      </div>
      <div className="divide-y">
        {block.items.map((r) => {
          const pct = r.total ? r.available / r.total : 0;
          return (
            <div key={r.id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">Sleeps {r.capacity}</p>
              </div>
              <div className="hidden w-32 sm:block">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn('h-full rounded-full', r.available === 0 ? 'bg-destructive' : pct < 0.25 ? 'bg-warning' : 'bg-success')} style={{ width: `${Math.max(pct * 100, 4)}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground tabular">
                  {r.available} of {r.total} left
                </p>
              </div>
              <div className="w-28 text-right">
                {r.available > 0 ? (
                  <>
                    <p className="font-semibold tabular">{money(r.totalPrice, { cents: false })}</p>
                    <p className="text-[11px] text-muted-foreground tabular">{money(r.averageNightly, { cents: false })}/night</p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-destructive">Sold out</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OccupancyBlock({ block }: { block: Extract<AgentBlock, { type: 'occupancy' }> }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-xs">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm font-medium">{block.title}</p>
        <div className="flex gap-5 text-right">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Avg occupancy</p>
            <p className="text-lg font-semibold tabular">{block.averagePct}%</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Revenue</p>
            <p className="text-lg font-semibold tabular">{money(block.revenue, { cents: false })}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">ADR</p>
            <p className="text-lg font-semibold tabular">{money(block.adr, { cents: false })}</p>
          </div>
        </div>
      </div>
      <OccupancyChart days={block.days} height={130} />
    </div>
  );
}

const TONE: Record<string, string> = {
  success: 'border-success/30 bg-success-soft/40',
  info: 'border-info/25 bg-info-soft/40',
  warning: 'border-warning/30 bg-warning-soft/50',
  danger: 'border-destructive/30 bg-destructive-soft/40',
  neutral: 'border-border bg-card',
};

export function ForecastBlock({ block }: { block: Extract<AgentBlock, { type: 'forecast' }> }) {
  const { send, busy } = useAgentUI();
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{block.title}</p>
      <div className="grid gap-2 md:grid-cols-3">
        {block.periods.map((p) => {
          const Icon = p.tone === 'success' ? TrendingUp : p.tone === 'warning' ? TrendingDown : Minus;
          return (
            <div key={p.from} className={cn('flex flex-col rounded-2xl border p-4', TONE[p.tone] ?? TONE.neutral)}>
              <p className="text-xs font-medium text-muted-foreground">{p.label}</p>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-3xl font-semibold tabular">{p.occupancyPct}%</span>
                <Icon className="mb-1.5 h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/70">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${p.occupancyPct}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground tabular">
                {p.roomsSold} sold · {p.roomsAvailable} left · ADR {money(p.adr, { cents: false })}
              </p>
              <p className="mt-2 flex-1 text-sm text-foreground/90">{p.recommendation}</p>
              {p.action && (
                <Button size="sm" variant="outline" className="mt-3 self-start bg-surface" disabled={busy} onClick={() => send(p.action!.command)}>
                  {p.action.label}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
