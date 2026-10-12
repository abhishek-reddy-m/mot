import * as React from 'react';
import { BedDouble, MessageSquareText, Users } from 'lucide-react';
import type { BookingSummary, ISODate } from '@/lib/dto';
import { fmtRange, relativeDay } from '@/lib/format';
import { money } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/primitives';
import { BookingStatusBadge, PaymentBadge } from './badges';

/**
 * One reservation, scannable in a glance: who, what, when, which room,
 * status — with an actions slot. Shared by the classic front desk and the
 * agent's booking lists so both modes look identical.
 */
export function BookingRow({
  booking: b,
  today,
  variant = 'default',
  actions,
  onClick,
  className,
}: {
  booking: BookingSummary;
  today: ISODate;
  variant?: 'default' | 'arrivals' | 'departures' | 'inhouse';
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const late = variant === 'arrivals' && b.checkIn < today && b.status !== 'CHECKED_IN';
  const overdue = variant === 'departures' && b.checkOut < today && b.status === 'CHECKED_IN';
  const lastNote = b.notes?.split('\n').slice(-1)[0]?.replace(/^\[[^\]]+\]\s*/, '');
  return (
    <div
      className={cn(
        'group flex flex-col gap-3 px-4 py-3.5 transition-colors sm:flex-row sm:items-center',
        onClick && 'cursor-pointer hover:bg-accent/50',
        className
      )}
      onClick={onClick}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={b.guest.name} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-medium">{b.guest.name}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{b.code}</span>
            {late && <span className="rounded bg-warning-soft px-1.5 text-[11px] font-medium text-warning">Late arrival</span>}
            {overdue && <span className="rounded bg-destructive-soft px-1.5 text-[11px] font-medium text-destructive">Overdue</span>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>{b.roomType.name}</span>
            <span className="tabular">
              {fmtRange(b.checkIn, b.checkOut)} · {b.nights} night{b.nights === 1 ? '' : 's'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {b.guests}
            </span>
            {variant === 'inhouse' && <span>Leaves {relativeDay(b.checkOut, today).toLowerCase()}</span>}
          </div>
          {lastNote && (
            <p className="mt-1 flex items-start gap-1 text-xs text-foreground/80">
              <MessageSquareText className="mt-0.5 h-3 w-3 shrink-0 text-agent" />
              <span className="line-clamp-1">{lastNote}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 pl-12 sm:pl-0">
        <span
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium tabular',
            b.room ? 'bg-surface' : 'border-dashed text-muted-foreground'
          )}
          title={b.room ? `Room ${b.room.number}, floor ${b.room.floor ?? '—'}` : 'No room assigned'}
        >
          <BedDouble className="h-3.5 w-3.5" />
          {b.room ? b.room.number : 'No room'}
        </span>
        <BookingStatusBadge status={b.status} />
        {variant === 'departures' && b.paymentStatus !== 'PAID' && <PaymentBadge status={b.paymentStatus} />}
        <span className="hidden w-20 text-right text-sm font-medium tabular md:inline">{money(b.totalPrice, { cents: false })}</span>
        {actions && (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
