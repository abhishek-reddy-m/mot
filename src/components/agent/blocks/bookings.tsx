'use client';

import * as React from 'react';
import Link from 'next/link';
import { BedDouble, CalendarRange, CreditCard, Mail, Phone, Users } from 'lucide-react';
import type { AgentBlock, QuickAction } from '@/lib/agent/blocks';
import type { BookingSummary } from '@/lib/dto';
import { fmtDay, fmtRange, timeAgo } from '@/lib/format';
import { BOOKING_STATUS, money } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/primitives';
import { BookingRow } from '@/components/hotel/BookingRow';
import { BookingStatusBadge, PaymentBadge } from '@/components/hotel/badges';
import { useAgentUI } from '../AgentUI';
import { ActionButtons } from './core';

function rowActions(b: BookingSummary, variant: string, today: string): QuickAction[] {
  const arriving = (b.status === 'CONFIRMED' || b.status === 'PENDING') && b.checkIn <= today && b.checkOut > today;
  if (variant === 'arrivals' && arriving) return [{ label: 'Check in', command: `check in ${b.code}`, tone: 'primary' }];
  if ((variant === 'departures' || variant === 'inhouse') && b.status === 'CHECKED_IN') return [{ label: 'Check out', command: `check out ${b.code}` }];
  return [];
}

export function BookingsBlock({ block }: { block: Extract<AgentBlock, { type: 'bookings' }> }) {
  const { today, send, compact } = useAgentUI();
  const [expanded, setExpanded] = React.useState(false);
  const limit = compact ? 5 : 8;
  const items = expanded ? block.items : block.items.slice(0, limit);
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <p className="text-sm font-medium">{block.title}</p>
        <span className="rounded-full bg-muted px-2 text-xs font-medium tabular text-muted-foreground">{block.items.length}</span>
      </div>
      {block.items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">{block.emptyText ?? 'Nothing here.'}</p>
      ) : (
        <div className="divide-y">
          {items.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              today={today}
              variant={block.variant === 'search' ? 'default' : block.variant}
              onClick={() => send(`show reservation ${b.code}`)}
              actions={<ActionButtons actions={rowActions(b, block.variant, today)} />}
              className={compact ? 'sm:flex-col sm:items-start' : undefined}
            />
          ))}
        </div>
      )}
      {block.items.length > limit && (
        <button onClick={() => setExpanded((e) => !e)} className="w-full border-t py-2 text-xs font-medium text-muted-foreground hover:bg-accent/50">
          {expanded ? 'Show less' : `Show all ${block.items.length}`}
        </button>
      )}
    </div>
  );
}

export function BookingCard({ block }: { block: Extract<AgentBlock, { type: 'booking' }> }) {
  const b = block.booking;
  const notes = b.notes?.split('\n').filter(Boolean) ?? [];
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
      <div className="flex items-start gap-3 p-4">
        <Avatar name={b.guest.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{b.guest.name}</h3>
            <BookingStatusBadge status={b.status} />
          </div>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">#{b.code}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <a href={`mailto:${b.guest.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <Mail className="h-3 w-3" />
              {b.guest.email}
            </a>
            {b.guest.phone && (
              <a href={`tel:${b.guest.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                <Phone className="h-3 w-3" />
                {b.guest.phone}
              </a>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tabular">{money(b.totalPrice)}</p>
          <PaymentBadge status={b.paymentStatus} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px border-y bg-border text-sm sm:grid-cols-4">
        {[
          { icon: CalendarRange, label: 'Stay', value: fmtRange(b.checkIn, b.checkOut), hint: `${b.nights} night${b.nights === 1 ? '' : 's'}` },
          { icon: BedDouble, label: 'Room', value: b.room ? `Room ${b.room.number}` : 'Not assigned', hint: b.roomType.name },
          { icon: Users, label: 'Guests', value: `${b.guests} guest${b.guests === 1 ? '' : 's'}`, hint: `${b.rooms} room${b.rooms === 1 ? '' : 's'}` },
          { icon: CreditCard, label: 'Booked', value: fmtDay(b.createdAt.slice(0, 10)), hint: b.propertyName },
        ].map((c) => (
          <div key={c.label} className="bg-card px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              <c.icon className="h-3 w-3" />
              {c.label}
            </p>
            <p className={cn('mt-1 font-medium', !b.room && c.label === 'Room' && 'text-muted-foreground')}>{c.value}</p>
            <p className="truncate text-xs text-muted-foreground">{c.hint}</p>
          </div>
        ))}
      </div>
      {notes.length > 0 && (
        <div className="space-y-1 border-b bg-agent-soft/30 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-agent">Notes</p>
          {notes.slice(-3).map((n, i) => (
            <p key={i} className="text-sm text-foreground/90">
              {n}
            </p>
          ))}
        </div>
      )}
      {block.history && block.history.length > 0 && (
        <details className="group border-b px-4 py-2.5">
          <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground hover:text-foreground">History · {block.history.length} events</summary>
          <ol className="mt-2 space-y-1.5">
            {block.history.map((h, i) => (
              <li key={i} className="flex gap-2 text-xs">
                <span className="w-20 shrink-0 text-muted-foreground">{timeAgo(h.createdAt)}</span>
                <span className="font-medium">{BOOKING_STATUS[h.status as keyof typeof BOOKING_STATUS]?.label ?? h.status}</span>
                <span className="truncate text-muted-foreground">{h.notes}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <ActionButtons actions={block.actions} />
        <Button asChild variant="link" size="sm">
          <Link href={`/admin/bookings/${b.id}`}>Open in Classic</Link>
        </Button>
      </div>
    </div>
  );
}

export function RoomOptionsBlock({ block }: { block: Extract<AgentBlock, { type: 'roomOptions' }> }) {
  const { send, busy } = useAgentUI();
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-xs">
      <p className="text-sm font-medium">{block.title}</p>
      {block.options.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No free rooms of this type for those nights.</p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {block.options.map((o, i) => (
            <div key={o.room.id} className={cn('flex flex-col rounded-xl border p-3', i === 0 && 'border-agent/40 bg-agent-soft/30')}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold tabular">Room {o.room.number}</span>
                <span className="text-xs text-muted-foreground">Floor {o.room.floor ?? '—'}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {o.reasons.map((r) => (
                  <span
                    key={r}
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px]',
                      r === 'Needs cleaning' ? 'bg-warning-soft text-warning' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {r}
                  </span>
                ))}
              </div>
              <Button
                size="sm"
                variant={i === 0 ? 'default' : 'outline'}
                className="mt-3"
                disabled={busy}
                onClick={() => send(`assign room ${o.room.number} to ${block.bookingCode}`)}
              >
                {i === 0 ? 'Use best match' : `Use ${o.room.number}`}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
