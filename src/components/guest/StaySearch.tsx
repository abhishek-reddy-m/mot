'use client';

import * as React from 'react';
import { CalendarDays, MapPin, Minus, Plus, Search, Users } from 'lucide-react';
import { addDays, fmtDay, localToday, nightsBetween } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface StayQuery {
  q?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms?: number;
}

export function defaultStay(): StayQuery {
  const today = localToday();
  // Default to next Friday → Sunday: the most common leisure search.
  const d = new Date(`${today}T12:00:00Z`).getUTCDay();
  const toFri = (5 - d + 7) % 7 || 7;
  const checkIn = addDays(today, toFri);
  return { checkIn, checkOut: addDays(checkIn, 2), guests: 2, rooms: 1 };
}

export function Stepper({ value, onChange, min = 1, max = 12, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-7 w-7 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-40"
        aria-label={`Fewer ${label}`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-5 text-center text-sm font-semibold tabular" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-7 w-7 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-40"
        aria-label={`More ${label}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Destination + dates + guests in one bar. Native date inputs keep it
 * accessible and give phones their own pickers. Check-out follows
 * check-in so the range is always valid.
 */
export function StaySearch({
  value,
  onSubmit,
  showDestination = true,
  showRooms = false,
  submitLabel = 'Search',
  className,
  compact,
}: {
  value: StayQuery;
  onSubmit: (v: StayQuery) => void;
  showDestination?: boolean;
  showRooms?: boolean;
  submitLabel?: string;
  className?: string;
  compact?: boolean;
}) {
  const [v, setV] = React.useState<StayQuery>(value);
  React.useEffect(() => setV(value), [value]);
  const today = localToday();
  const nights = nightsBetween(v.checkIn, v.checkOut);

  const setCheckIn = (checkIn: string) => {
    if (!checkIn) return;
    setV((cur) => ({ ...cur, checkIn, checkOut: cur.checkOut <= checkIn ? addDays(checkIn, Math.max(1, nightsBetween(cur.checkIn, cur.checkOut))) : cur.checkOut }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
      className={cn(
        'grid gap-2 rounded-2xl border bg-card p-2 shadow-lifted',
        showDestination ? 'md:grid-cols-[1.3fr_1fr_1fr_auto_auto]' : 'md:grid-cols-[1fr_1fr_auto_auto]',
        compact && 'shadow-soft',
        className
      )}
    >
      {showDestination && (
        <label className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors focus-within:bg-accent hover:bg-accent/60">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-muted-foreground">Where</span>
            <input value={v.q ?? ''} onChange={(e) => setV({ ...v, q: e.target.value })} placeholder="City or hotel" className="w-full bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground" />
          </span>
        </label>
      )}
      <label className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors focus-within:bg-accent hover:bg-accent/60">
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium text-muted-foreground">Check in</span>
          <input type="date" required min={today} value={v.checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full bg-transparent text-sm font-medium outline-none" aria-label="Check-in date" />
        </span>
      </label>
      <label className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors focus-within:bg-accent hover:bg-accent/60">
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium text-muted-foreground">
            Check out{nights > 0 && <span className="font-normal"> · {nights} night{nights > 1 ? 's' : ''}</span>}
          </span>
          <input
            type="date"
            required
            min={addDays(v.checkIn, 1)}
            max={addDays(v.checkIn, 30)}
            value={v.checkOut}
            onChange={(e) => e.target.value && setV({ ...v, checkOut: e.target.value })}
            className="w-full bg-transparent text-sm font-medium outline-none"
            aria-label="Check-out date"
          />
        </span>
      </label>
      <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-2">
        <span className="flex items-center gap-3">
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>
            <span className="block text-[11px] font-medium text-muted-foreground">Guests</span>
            <Stepper value={v.guests} onChange={(guests) => setV({ ...v, guests })} label="guests" max={16} />
          </span>
        </span>
        {showRooms && (
          <span>
            <span className="block text-[11px] font-medium text-muted-foreground">Rooms</span>
            <Stepper value={v.rooms ?? 1} onChange={(rooms) => setV({ ...v, rooms })} label="rooms" max={9} />
          </span>
        )}
      </div>
      <Button type="submit" size="lg" variant="brand" className="h-auto min-h-12 rounded-xl px-6">
        <Search className="h-4 w-4" /> {submitLabel}
      </Button>
      <span className="sr-only" aria-live="polite">
        {fmtDay(v.checkIn, 'weekday')} to {fmtDay(v.checkOut, 'weekday')}
      </span>
    </form>
  );
}
