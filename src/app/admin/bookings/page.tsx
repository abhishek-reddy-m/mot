'use client';

import * as React from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { CalendarDays, Search, Sparkles, X } from 'lucide-react';
import type { BookingSummary } from '@/lib/dto';
import { fetcher } from '@/lib/fetcher';
import { fmtDay, relativeDay } from '@/lib/format';
import { money } from '@/lib/status';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/primitives';
import { SegmentedControl } from '@/components/ui/segmented';
import { BookingRow } from '@/components/hotel/BookingRow';
import { useConsole, usePropertyUrl } from '@/components/console/ConsoleProvider';

type View = 'upcoming' | 'inhouse' | 'past' | 'cancelled' | 'all';

const VIEWS: Record<View, { label: string; status?: string; future?: boolean }> = {
  upcoming: { label: 'Upcoming', status: 'PENDING,CONFIRMED', future: true },
  inhouse: { label: 'In house', status: 'CHECKED_IN' },
  past: { label: 'Past', status: 'CHECKED_OUT' },
  cancelled: { label: 'Cancelled', status: 'CANCELLED,NO_SHOW' },
  all: { label: 'All' },
};

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function BookingsPage() {
  const router = useRouter();
  const { ctx, askAgent, can } = useConsole();
  const today = ctx?.today ?? '';
  const [view, setView] = React.useState<View>('upcoming');
  const [text, setText] = React.useState('');
  const q = useDebounced(text.trim());
  const searching = q.length > 0;
  const cfg = VIEWS[view];
  const url = usePropertyUrl('/api/admin/bookings', {
    q: q || undefined,
    // A search looks everywhere; the tabs only narrow an unfiltered list.
    status: searching ? undefined : cfg.status,
    from: !searching && cfg.future && today ? today : undefined,
    limit: 200,
  });
  const { data, isLoading } = useSWR<BookingSummary[]>(url, fetcher, { keepPreviousData: true });

  const rows = React.useMemo(() => {
    const list = [...(data ?? [])];
    if (!searching && (view === 'upcoming' || view === 'inhouse')) list.sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.guest.name.localeCompare(b.guest.name));
    return list;
  }, [data, searching, view]);

  // Group by arrival day so the list reads like a calendar.
  const groups = React.useMemo(() => {
    const out: { day: string; items: BookingSummary[] }[] = [];
    for (const b of rows) {
      const last = out[out.length - 1];
      if (last && last.day === b.checkIn) last.items.push(b);
      else out.push({ day: b.checkIn, items: [b] });
    }
    return out;
  }, [rows]);

  const total = rows.reduce((s, b) => s + (b.status === 'CANCELLED' || b.status === 'NO_SHOW' ? 0 : b.totalPrice), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Reservations"
        description={data ? `${rows.length} reservation${rows.length === 1 ? '' : 's'}${total ? ` · ${money(total, { cents: false })}` : ''}` : 'Loading…'}
        actions={
          can('agent.use') ? (
            <Button variant="ghost" size="sm" className="text-agent hover:bg-agent-soft" onClick={() => askAgent('who is arriving tomorrow?')}>
              <Sparkles className="h-4 w-4" /> Ask
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search guest, email, phone or code…"
            className="pl-9 pr-9"
            aria-label="Search reservations"
          />
          {text && (
            <button onClick={() => setText('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent" aria-label="Clear search">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <SegmentedControl
          layoutId="bookings-view"
          aria-label="Reservation view"
          value={view}
          onChange={setView}
          options={(Object.keys(VIEWS) as View[]).map((v) => ({ value: v, label: VIEWS[v].label }))}
          className={`scrollbar-thin max-w-full overflow-x-auto ${searching ? 'opacity-50' : ''}`}
        />
      </div>
      {searching && <p className="-mt-3 text-xs text-muted-foreground">Searching all reservations for “{q}”.</p>}

      {/* overflow-clip (not hidden) keeps the sticky day headers pinned to the viewport. */}
      <Card className="overflow-clip p-0">
        {isLoading && !data ? (
          <div className="space-y-px">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-none" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={searching ? 'No matches' : `No ${VIEWS[view].label.toLowerCase()} reservations`}
            description={searching ? 'Try a last name, the 8-character code, or an email address.' : undefined}
          />
        ) : (
          groups.map((g) => (
            <section key={g.day}>
              <div className="sticky top-14 z-10 flex items-center justify-between border-b bg-surface-sunken/90 px-4 py-1.5 text-xs backdrop-blur">
                <span className="font-medium">
                  {fmtDay(g.day, 'weekday')}
                  {today && relativeDay(g.day, today) !== fmtDay(g.day, 'weekday') && (
                    <span className="ml-2 font-normal text-muted-foreground">{relativeDay(g.day, today)}</span>
                  )}
                </span>
                <span className="text-muted-foreground tabular">{g.items.length}</span>
              </div>
              <div className="divide-y">
                {g.items.map((b) => (
                  <BookingRow key={b.id} booking={b} today={today} onClick={() => router.push(`/admin/bookings/${b.id}`)} />
                ))}
              </div>
            </section>
          ))
        )}
      </Card>
    </div>
  );
}
