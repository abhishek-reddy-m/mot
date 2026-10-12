'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleDollarSign,
  ConciergeBell,
  PartyPopper,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  X,
} from 'lucide-react';
import type { BookingSummary, FrontDeskSummary, OccupancyDay, StaffProperty } from '@/lib/dto';
import { fetcher } from '@/lib/fetcher';
import { fmtDay, greeting, weekday } from '@/lib/format';
import { money } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, PageHeader, Skeleton, StatTile } from '@/components/ui/primitives';
import { BookingRow } from '@/components/hotel/BookingRow';
import { OccupancyChart } from '@/components/hotel/OccupancyChart';
import { useConsole, usePropertyUrl } from '@/components/console/ConsoleProvider';

interface DashboardData {
  property: (Pick<StaffProperty, 'id' | 'name' | 'city' | 'state' | 'primaryColor' | 'interfaceMode' | 'isDemo'> & { tagline: string | null }) | null;
  today: FrontDeskSummary;
  forecast: OccupancyDay[];
  revenue: { monthToDate: number; monthBookings: number; next30Days: number; next30Bookings: number };
  recent: BookingSummary[];
  checklist: { id: string; label: string; done: boolean; href: string }[];
}

const DISMISS_KEY = 'stayos.checklist.dismissed';

function Checklist({ items, welcome, propertyId }: { items: DashboardData['checklist']; welcome: boolean; propertyId: string }) {
  const [dismissed, setDismissed] = React.useState(true);
  React.useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(`${DISMISS_KEY}.${propertyId}`) === '1');
    } catch {
      setDismissed(false);
    }
  }, [propertyId]);
  const done = items.filter((i) => i.done).length;
  if ((dismissed && !welcome) || done === items.length) return null;
  const pct = Math.round((done / items.length) * 100);
  const next = items.find((i) => !i.done);
  const hide = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(`${DISMISS_KEY}.${propertyId}`, '1');
    } catch {
      /* preference won't persist */
    }
  };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="relative overflow-hidden p-0">
        <div className="bg-aurora absolute inset-x-0 top-0 h-1" />
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_1.4fr]">
          <div>
            {welcome ? (
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <PartyPopper className="h-4 w-4" /> Your hotel is live
              </p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">Getting set up</p>
            )}
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{welcome ? 'Welcome to StayOS — let’s finish the basics.' : `${done} of ${items.length} done`}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Each step takes a minute or two. You can also just tell the agent what you need — it works with whatever you’ve set up so far.
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {next && (
                <Button asChild size="sm">
                  <Link href={next.href}>
                    {next.label} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={hide}>
                Hide for now
              </Button>
            </div>
          </div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {items.map((i) => (
              <li key={i.id}>
                <Link
                  href={i.href}
                  className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent', i.done && 'text-muted-foreground')}
                >
                  {i.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />}
                  <span className={cn(i.done && 'line-through decoration-muted-foreground/40')}>{i.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <button onClick={hide} className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="Hide checklist">
          <X className="h-4 w-4" />
        </button>
      </Card>
    </motion.div>
  );
}

function ForecastCard({ days }: { days: OccupancyDay[] }) {
  const { askAgent, can } = useConsole();
  const avg = days.length ? Math.round(days.reduce((s, d) => s + d.occupancyPct, 0) / days.length) : 0;
  const revenue = days.reduce((s, d) => s + d.revenue, 0);
  const weekendDays = days.filter((d) => [5, 6].includes(weekday(d.date)));
  const weekendAvg = weekendDays.length ? Math.round(weekendDays.reduce((s, d) => s + d.occupancyPct, 0) / weekendDays.length) : 0;
  const soft = days.filter((d) => d.occupancyPct < 40).length;
  const insight =
    weekendAvg >= 80
      ? `Weekends are pacing at ${weekendAvg}% — there may be room to raise rates.`
      : soft >= 5
        ? `${soft} of the next ${days.length} nights are under 40% — a midweek offer could help.`
        : `Averaging ${avg}% over the next ${days.length} nights.`;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Next {days.length} nights</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {avg}% average occupancy · {money(revenue, { cents: false })} on the books
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/rate-calendar">
            Rates <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <OccupancyChart days={days} height={170} className="mt-4" />
      <div className="mt-4 flex flex-col gap-3 rounded-xl bg-agent-soft/60 p-3 sm:flex-row sm:items-center">
        <Sparkles className="h-4 w-4 shrink-0 text-agent" />
        <p className="flex-1 text-sm">{insight}</p>
        {can('agent.use') && (
          <Button size="sm" variant="outline" className="shrink-0 border-agent/30 text-agent hover:bg-agent-soft" onClick={() => askAgent('weekend forecast for the next 3 weekends')}>
            Ask for a plan
          </Button>
        )}
      </div>
    </Card>
  );
}

function TodayPanel({ today }: { today: FrontDeskSummary }) {
  const { askAgent, can } = useConsole();
  const s = today.stats;
  const rows = [
    { label: 'Arrivals', value: `${s.arrivalsDone}/${s.arrivalsDue}`, pct: s.arrivalsDue ? s.arrivalsDone / s.arrivalsDue : 1, icon: ArrowDownToLine },
    { label: 'Departures', value: `${s.departuresDone}/${s.departuresDue}`, pct: s.departuresDue ? s.departuresDone / s.departuresDue : 1, icon: ArrowUpFromLine },
    { label: 'Rooms ready', value: `${s.clean + s.inspected}/${s.totalRooms - s.outOfOrder}`, pct: s.totalRooms ? (s.clean + s.inspected) / Math.max(1, s.totalRooms - s.outOfOrder) : 0, icon: BedDouble },
  ];
  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Today at the desk</p>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/front-desk">
            Front desk <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <div className="mt-4 space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <r.icon className="h-4 w-4" /> {r.label}
              </span>
              <span className="font-medium tabular">{r.value}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.round(r.pct * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex-1 space-y-2">
        {today.alerts.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Nothing needs attention right now.
          </p>
        ) : (
          today.alerts.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm',
                a.tone === 'danger' ? 'border-destructive/25 bg-destructive-soft' : a.tone === 'warning' ? 'border-warning/25 bg-warning-soft' : 'bg-info-soft'
              )}
            >
              <TriangleAlert className={cn('h-4 w-4 shrink-0', a.tone === 'danger' ? 'text-destructive' : a.tone === 'warning' ? 'text-warning' : 'text-info')} />
              <span className="min-w-0 flex-1 truncate">{a.title}</span>
              {a.command && can('agent.use') && (
                <button onClick={() => askAgent(a.command!)} className="shrink-0 text-xs font-medium text-agent hover:underline">
                  Fix
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function Dashboard() {
  const { ctx, property, askAgent, can } = useConsole();
  const router = useRouter();
  const params = useSearchParams();
  const welcome = params.get('welcome') === '1';
  const url = usePropertyUrl('/api/admin/dashboard');
  const { data, error, isLoading } = useSWR<DashboardData>(url, fetcher, { refreshInterval: 60_000 });
  const firstName = ctx?.user.name.split(' ')[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow={ctx ? fmtDay(ctx.today, 'long') : ' '}
        title={firstName ? `${greeting()}, ${firstName}` : 'Overview'}
        description={property ? `Here’s how ${property.name} is doing.` : undefined}
        actions={
          can('agent.use') ? (
            <Button variant="outline" onClick={() => askAgent('give me the morning brief')} className="border-agent/30">
              <Sparkles className="h-4 w-4 text-agent" /> Morning brief
            </Button>
          ) : undefined
        }
      />

      {error ? (
        <EmptyState icon={TriangleAlert} title="Couldn’t load the overview" description={(error as Error).message} />
      ) : isLoading || !data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {property && <Checklist items={data.checklist} welcome={welcome} propertyId={property.id} />}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Occupancy tonight"
              value={`${data.today.stats.occupancyPct}%`}
              hint={`${data.today.stats.occupiedTonight} of ${data.today.stats.totalRooms} rooms · ${data.today.stats.availableTonight} left`}
              icon={BedDouble}
              tone="brand"
            />
            <StatTile
              label="In house"
              value={data.today.stats.inHouse}
              hint={`${data.today.stats.arrivalsDue - data.today.stats.arrivalsDone} still arriving today`}
              icon={ConciergeBell}
              tone="info"
            />
            <StatTile
              label="Booked this month"
              value={money(data.revenue.monthToDate, { cents: false })}
              hint={`${data.revenue.monthBookings} reservation${data.revenue.monthBookings === 1 ? '' : 's'} made`}
              icon={CircleDollarSign}
              tone="success"
            />
            <StatTile
              label="Arriving next 30 days"
              value={money(data.revenue.next30Days, { cents: false })}
              hint={`${data.revenue.next30Bookings} stays on the books`}
              icon={TrendingUp}
              tone="agent"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <ForecastCard days={data.forecast} />
            <TodayPanel today={data.today} />
          </div>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 pb-2 pt-5 sm:px-6">
              <div>
                <p className="text-sm font-medium">Latest reservations</p>
                <p className="text-xs text-muted-foreground">Newest first, across every channel</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/bookings">
                  All reservations <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {data.recent.length === 0 ? (
              <EmptyState
                className="py-10"
                icon={CalendarDays}
                title="No reservations yet"
                description="Share your booking page — new reservations show up here instantly."
                action={
                  property ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/properties/${property.id}`} target="_blank">
                        Open booking page
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="divide-y">
                {data.recent.map((b) => (
                  <BookingRow key={b.id} booking={b} today={data.today.date} onClick={() => router.push(`/admin/bookings/${b.id}`)} />
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  // useSearchParams needs a Suspense boundary so the shell can prerender.
  return (
    <React.Suspense>
      <Dashboard />
    </React.Suspense>
  );
}
