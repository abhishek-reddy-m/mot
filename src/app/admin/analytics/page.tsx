'use client';

import * as React from 'react';
import useSWR from 'swr';
import { BedDouble, ChartLine, CircleDollarSign, Gauge, Sparkles, TrendingUp } from 'lucide-react';
import type { OccupancyDay } from '@/lib/dto';
import { fetcher } from '@/lib/fetcher';
import { addDays, fmtDay, fmtRange, weekday } from '@/lib/format';
import { money } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, PageHeader, Skeleton, StatTile } from '@/components/ui/primitives';
import { SegmentedControl } from '@/components/ui/segmented';
import { OccupancyChart } from '@/components/hotel/OccupancyChart';
import { useConsole, usePropertyUrl } from '@/components/console/ConsoleProvider';

type Range = 'last30' | 'next30' | 'next90';
const RANGES: Record<Range, { label: string; from: (t: string) => string; to: (t: string) => string }> = {
  last30: { label: 'Last 30 days', from: (t) => addDays(t, -30), to: (t) => t },
  next30: { label: 'Next 30 days', from: (t) => t, to: (t) => addDays(t, 30) },
  next90: { label: 'Next 90 days', from: (t) => t, to: (t) => addDays(t, 90) },
};
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function summarize(days: OccupancyDay[]) {
  const sold = days.reduce((s, d) => s + d.roomsSold, 0);
  const capacity = days.reduce((s, d) => s + d.totalRooms, 0);
  const revenue = days.reduce((s, d) => s + d.revenue, 0);
  return {
    sold,
    revenue,
    occupancy: capacity ? Math.round((sold / capacity) * 100) : 0,
    adr: sold ? revenue / sold : 0,
    revpar: capacity ? revenue / capacity : 0,
  };
}

export default function AnalyticsPage() {
  const { ctx, askAgent, can } = useConsole();
  const today = ctx?.today;
  const [range, setRange] = React.useState<Range>('next30');
  const from = today ? RANGES[range].from(today) : undefined;
  const to = today ? RANGES[range].to(today) : undefined;
  const url = usePropertyUrl('/api/admin/occupancy', { from, to });
  const { data, isLoading } = useSWR<OccupancyDay[]>(today ? url : null, fetcher, { keepPreviousData: true });
  const days = data ?? [];
  const s = summarize(days);

  // Weekday pattern: average occupancy per day of week (Mon-first).
  const byWeekday = WEEKDAYS.map((label, i) => {
    const js = (i + 1) % 7; // weekday() is 0=Sun
    const list = days.filter((d) => weekday(d.date) === js);
    return { label, pct: list.length ? Math.round(list.reduce((a, d) => a + d.occupancyPct, 0) / list.length) : 0, n: list.length };
  });
  const peak = [...byWeekday].sort((a, b) => b.pct - a.pct)[0];
  const low = [...byWeekday].filter((d) => d.n).sort((a, b) => a.pct - b.pct)[0];
  const best = [...days].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Analytics"
        description={from && to ? `${fmtRange(from, to)} · occupancy, rate and revenue from live reservations` : 'Loading…'}
        actions={
          <SegmentedControl
            layoutId="analytics-range"
            aria-label="Date range"
            value={range}
            onChange={setRange}
            options={(Object.keys(RANGES) as Range[]).map((r) => ({ value: r, label: RANGES[r].label }))}
          />
        }
      />

      {isLoading && !data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : days.length === 0 || days[0].totalRooms === 0 ? (
        <EmptyState icon={ChartLine} title="No rooms to measure yet" description="Add room types with room counts and analytics will appear here." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Occupancy" value={`${s.occupancy}%`} hint={`${s.sold} room nights sold`} icon={BedDouble} tone="brand" />
            <StatTile label="Average daily rate" value={money(s.adr)} hint="Revenue ÷ rooms sold" icon={CircleDollarSign} tone="success" />
            <StatTile label="RevPAR" value={money(s.revpar)} hint="Revenue per available room" icon={Gauge} tone="info" />
            <StatTile label="Room revenue" value={money(s.revenue, { cents: false })} hint={range === 'last30' ? 'Earned' : 'On the books'} icon={TrendingUp} tone="agent" />
          </div>

          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Nightly occupancy</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-success" /> 85%+
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-primary" /> 50–84%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-primary/40" /> under 50%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-agent-soft" /> weekend
                </span>
              </div>
            </div>
            <OccupancyChart days={days} height={220} className="mt-4" />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5 sm:p-6">
              <p className="text-sm font-medium">By day of week</p>
              <p className="text-xs text-muted-foreground">
                {peak && low && peak.pct !== low.pct ? `${peak.label} is strongest (${peak.pct}%), ${low.label} softest (${low.pct}%).` : 'Demand is even across the week.'}
              </p>
              <div className="mt-5 space-y-2.5">
                {byWeekday.map((d) => (
                  <div key={d.label} className="flex items-center gap-3 text-sm">
                    <span className="w-9 text-muted-foreground">{d.label}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full transition-[width] duration-700', d.label === 'Fri' || d.label === 'Sat' ? 'bg-agent' : 'bg-primary')}
                        style={{ width: `${d.pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-medium tabular">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <p className="text-sm font-medium">Top revenue nights</p>
              <p className="text-xs text-muted-foreground">Where demand is strongest — candidates for higher rates.</p>
              <ul className="mt-4 divide-y">
                {best.map((d) => (
                  <li key={d.date} className="flex items-center justify-between py-2.5 text-sm">
                    <span>{fmtDay(d.date, 'weekday')}</span>
                    <span className="flex items-center gap-4 text-muted-foreground tabular">
                      <span>{d.occupancyPct}%</span>
                      <span>ADR {money(d.adr, { cents: false })}</span>
                      <span className="w-20 text-right font-medium text-foreground">{money(d.revenue, { cents: false })}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {can('agent.use') && range !== 'last30' && (
                <Button variant="outline" size="sm" className="mt-4 border-agent/30 text-agent hover:bg-agent-soft" onClick={() => askAgent('weekend forecast for the next 3 weekends')}>
                  <Sparkles className="h-4 w-4" /> Get rate recommendations
                </Button>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
