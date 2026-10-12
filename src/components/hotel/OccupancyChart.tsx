'use client';

import * as React from 'react';
import type { OccupancyDay } from '@/lib/dto';
import { fmtDay, weekday } from '@/lib/format';
import { money } from '@/lib/status';
import { cn } from '@/lib/utils';

/**
 * Nightly occupancy bars. Weekend nights are tinted; hovering (or focusing)
 * a bar shows the exact numbers. Pure CSS — fast and theme-aware.
 */
export function OccupancyChart({ days, height = 160, className }: { days: OccupancyDay[]; height?: number; className?: string }) {
  const [active, setActive] = React.useState<number | null>(null);
  if (!days.length) return null;
  const shown = active !== null ? days[active] : null;
  // Keep labels legible for long ranges: label roughly 14 nights across.
  const every = Math.max(1, Math.ceil(days.length / 14));
  const gap = days.length > 45 ? 'gap-px' : 'gap-[3px]';
  return (
    <div className={cn('w-full', className)}>
      <div className="mb-2 flex h-5 items-center gap-3 text-xs text-muted-foreground">
        {shown ? (
          <>
            <span className="font-medium text-foreground">{fmtDay(shown.date, 'weekday')}</span>
            <span className="tabular">
              {shown.occupancyPct}% · {shown.roomsSold}/{shown.totalRooms} rooms
            </span>
            <span className="tabular">ADR {money(shown.adr, { cents: false })}</span>
          </>
        ) : (
          <span>Hover a night for details</span>
        )}
      </div>
      <div className="relative" style={{ height }}>
        {[25, 50, 75].map((g) => (
          <div key={g} className="absolute inset-x-0 border-t border-dashed border-border/70" style={{ bottom: `${g}%` }}>
            <span className="absolute -top-2 right-0 bg-card pl-1 text-[10px] text-muted-foreground/70">{g}%</span>
          </div>
        ))}
        <div className={cn('absolute inset-0 flex items-end pr-7', gap)}>
          {days.map((d, i) => {
            const wknd = weekday(d.date) === 5 || weekday(d.date) === 6;
            const tone = d.occupancyPct >= 85 ? 'bg-success' : d.occupancyPct >= 50 ? 'bg-primary' : d.occupancyPct >= 25 ? 'bg-primary/60' : 'bg-primary/30';
            return (
              <button
                key={d.date}
                type="button"
                aria-label={`${fmtDay(d.date, 'weekday')}: ${d.occupancyPct}% occupied`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className={cn('group relative flex h-full flex-1 items-end rounded-t-md focus-visible:outline-none', wknd && 'bg-agent-soft/50')}
              >
                <span
                  className={cn('w-full rounded-t-md transition-all duration-500', tone, active === i && 'opacity-80 ring-2 ring-ring')}
                  style={{ height: `${Math.max(d.occupancyPct, 2)}%` }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className={cn('mt-1.5 flex h-4 pr-7', gap)}>
        {days.map((d, i) => (
          <span key={d.date} className="relative flex-1 text-[10px] text-muted-foreground tabular">
            {i % every === 0 && <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{fmtDay(d.date, 'numeric')}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
