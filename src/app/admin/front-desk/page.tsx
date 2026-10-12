'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import type { BookingSummary, FrontDeskSummary, RoomSummary } from '@/lib/dto';
import { fetcher } from '@/lib/fetcher';
import { addDays, fmtDay, relativeDay } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, PageHeader, Skeleton, StatTile } from '@/components/ui/primitives';
import { SegmentedControl } from '@/components/ui/segmented';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookingRow } from '@/components/hotel/BookingRow';
import { RoomGrid, RoomLegend } from '@/components/hotel/RoomGrid';
import { useConsole, usePropertyUrl } from '@/components/console/ConsoleProvider';
import { AssignRoomDialog, CheckInDialog, CheckOutDialog, ConfirmDialog, NoteDialog } from '@/components/frontdesk/dialogs';
import { RoomSheet } from '@/components/frontdesk/RoomSheet';
import { useBookingActions } from '@/components/frontdesk/useBookingActions';

type Tab = 'arrivals' | 'departures' | 'inhouse' | 'rooms';
type RoomFilter = 'all' | 'ready' | 'dirty' | 'occupied' | 'arriving' | 'ooo';
type DialogState =
  | { kind: 'checkin' | 'checkout' | 'note' | 'assign' | 'noshow' | 'cancel'; booking: BookingSummary }
  | null;

export default function FrontDeskPage() {
  const { ctx, can, askAgent } = useConsole();
  const today = ctx?.today ?? '';
  const [day, setDay] = React.useState<string>('');
  const date = day || today;
  const [tab, setTab] = React.useState<Tab>('arrivals');
  const [query, setQuery] = React.useState('');
  const [roomFilter, setRoomFilter] = React.useState<RoomFilter>('all');
  const [dialog, setDialog] = React.useState<DialogState>(null);
  const [room, setRoom] = React.useState<RoomSummary | null>(null);
  const { transition, pending } = useBookingActions();

  const summaryUrl = usePropertyUrl('/api/admin/front-desk', { date: day || undefined });
  const boardUrl = usePropertyUrl('/api/admin/room-board');
  const { data, isLoading, mutate, isValidating } = useSWR<FrontDeskSummary>(summaryUrl, fetcher, { refreshInterval: 60_000 });
  const { data: rooms } = useSWR<RoomSummary[]>(tab === 'rooms' ? boardUrl : null, fetcher, { refreshInterval: 60_000 });

  const isToday = date === today;
  const filter = (list: BookingSummary[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((b) => [b.guest.name, b.guest.email, b.code, b.room?.number ?? '', b.roomType.name].some((v) => v.toLowerCase().includes(q)));
  };

  const filteredRooms = (rooms ?? []).filter((r) => {
    switch (roomFilter) {
      case 'ready':
        return !r.isOutOfOrder && (r.status === 'CLEAN' || r.status === 'INSPECTED') && r.occupancy !== 'OCCUPIED';
      case 'dirty':
        return r.status === 'DIRTY';
      case 'occupied':
        return r.occupancy === 'OCCUPIED' || r.occupancy === 'DEPARTING' || r.occupancy === 'TURNOVER';
      case 'arriving':
        return r.occupancy === 'ARRIVING' || r.occupancy === 'TURNOVER';
      case 'ooo':
        return r.isOutOfOrder;
      default:
        return true;
    }
  });

  const s = data?.stats;
  const open = (kind: NonNullable<DialogState>['kind'], booking: BookingSummary) => setDialog({ kind, booking });

  function Overflow({ b }: { b: BookingSummary }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${b.guest.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/bookings/${b.id}`}>Open reservation</Link>
          </DropdownMenuItem>
          {b.status !== 'CHECKED_OUT' && can('booking.assignRoom') && (
            <DropdownMenuItem onSelect={() => open('assign', b)}>{b.room ? 'Change room' : 'Choose room'}</DropdownMenuItem>
          )}
          {can('booking.note') && <DropdownMenuItem onSelect={() => open('note', b)}>Add note</DropdownMenuItem>}
          {b.status === 'PENDING' && can('booking.confirm') && <DropdownMenuItem onSelect={() => transition(b, 'CONFIRMED')}>Confirm booking</DropdownMenuItem>}
          {(b.status === 'CONFIRMED' || b.status === 'PENDING') && (
            <>
              <DropdownMenuSeparator />
              {b.checkIn <= today && can('booking.noShow') && (
                <DropdownMenuItem destructive onSelect={() => open('noshow', b)}>
                  Mark no-show
                </DropdownMenuItem>
              )}
              {can('booking.cancel') && (
                <DropdownMenuItem destructive onSelect={() => open('cancel', b)}>
                  Cancel reservation
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  function List({ items, variant, empty }: { items: BookingSummary[]; variant: 'arrivals' | 'departures' | 'inhouse'; empty: string }) {
    const shown = filter(items);
    if (isLoading) {
      return (
        <div className="space-y-px p-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      );
    }
    if (shown.length === 0) {
      return <EmptyState icon={variant === 'arrivals' ? ArrowDownToLine : variant === 'departures' ? ArrowUpFromLine : Users} title={query ? 'No matches' : empty} />;
    }
    return (
      <div className="divide-y">
        {shown.map((b) => {
          const canCheckIn = variant === 'arrivals' && (b.status === 'CONFIRMED' || b.status === 'PENDING') && isToday && can('booking.checkin');
          const canCheckOut = b.status === 'CHECKED_IN' && can('booking.checkout');
          return (
            <BookingRow
              key={b.id}
              booking={b}
              today={today}
              variant={variant}
              actions={
                <>
                  {canCheckIn && (
                    <Button size="sm" onClick={() => open('checkin', b)}>
                      Check in
                    </Button>
                  )}
                  {canCheckOut && (variant !== 'arrivals') && (
                    <Button size="sm" variant={variant === 'departures' ? 'default' : 'outline'} onClick={() => open('checkout', b)}>
                      Check out
                    </Button>
                  )}
                  <Overflow b={b} />
                </>
              }
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow={data ? `${relativeDay(date, today)} · ${fmtDay(date, 'long')}` : '…'}
        title="Front desk"
        actions={
          <>
            <div className="flex items-center rounded-lg border bg-surface shadow-xs">
              <Button variant="ghost" size="icon-sm" aria-label="Previous day" onClick={() => setDay(addDays(date, -1))}>
                <ChevronLeft />
              </Button>
              <button className={cn('px-2 text-[13px] font-medium', isToday && 'text-primary')} onClick={() => setDay('')}>
                {isToday ? 'Today' : fmtDay(date)}
              </button>
              <Button variant="ghost" size="icon-sm" aria-label="Next day" onClick={() => setDay(addDays(date, 1))}>
                <ChevronRight />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => mutate()} aria-label="Refresh">
              <RefreshCw className={cn('h-4 w-4', isValidating && 'animate-spin')} />
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="Arrivals" icon={ArrowDownToLine} tone="info" value={s ? `${s.arrivalsDone}/${s.arrivalsDone + s.arrivalsDue}` : '—'} hint={s ? `${s.unassignedArrivals} need a room` : ''} onClick={() => setTab('arrivals')} active={tab === 'arrivals'} />
        <StatTile label="Departures" icon={ArrowUpFromLine} tone="warning" value={s ? `${s.departuresDone}/${s.departuresDone + s.departuresDue}` : '—'} hint="checked out" onClick={() => setTab('departures')} active={tab === 'departures'} />
        <StatTile label="In house" icon={Users} tone="brand" value={s?.inHouse ?? '—'} hint="guests staying" onClick={() => setTab('inhouse')} active={tab === 'inhouse'} />
        <StatTile label="Tonight" icon={BedDouble} tone="agent" value={s ? `${s.occupancyPct}%` : '—'} hint={s ? `${s.availableTonight} rooms to sell` : ''} />
        <StatTile label="Rooms ready" icon={Sparkles} tone="success" value={s ? s.clean + s.inspected : '—'} hint={s ? `${s.dirty} dirty · ${s.outOfOrder} out of order` : ''} onClick={() => setTab('rooms')} active={tab === 'rooms'} className="col-span-2 md:col-span-1" />
      </div>

      {data && data.alerts.length > 0 && isToday && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {data.alerts.map((a) => (
            <div
              key={a.id}
              className={cn(
                'flex shrink-0 items-center gap-3 rounded-xl border bg-card px-3.5 py-2 text-sm shadow-xs',
                a.tone === 'danger' && 'border-destructive/30',
                a.tone === 'warning' && 'border-warning/40'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', a.tone === 'danger' ? 'bg-destructive' : a.tone === 'warning' ? 'bg-warning' : 'bg-info')} />
              <span className="font-medium">{a.title}</span>
              {a.command && can('agent.use') && (
                <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-agent hover:bg-agent-soft" onClick={() => askAgent(a.command!)}>
                  <Sparkles className="h-3.5 w-3.5" /> Fix
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <SegmentedControl
            aria-label="Front desk view"
            layoutId="fd-tab"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'arrivals', label: `Arrivals${data ? ` · ${data.arrivals.length}` : ''}` },
              { value: 'departures', label: `Departures${data ? ` · ${data.departures.length}` : ''}` },
              { value: 'inhouse', label: `In house${data ? ` · ${data.inHouse.length}` : ''}` },
              { value: 'rooms', label: 'Rooms' },
            ]}
          />
          {tab !== 'rooms' ? (
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search guest, code or room" className="h-9 pl-9" />
            </div>
          ) : (
            <SegmentedControl
              aria-label="Room filter"
              layoutId="fd-room-filter"
              size="sm"
              value={roomFilter}
              onChange={setRoomFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'ready', label: 'Ready' },
                { value: 'dirty', label: 'Dirty' },
                { value: 'occupied', label: 'Occupied' },
                { value: 'arriving', label: 'Arriving' },
                { value: 'ooo', label: 'Out of order' },
              ]}
            />
          )}
        </div>
        {tab === 'arrivals' && <List items={data?.arrivals ?? []} variant="arrivals" empty={`No arrivals ${isToday ? 'today' : 'on this day'}`} />}
        {tab === 'departures' && <List items={data?.departures ?? []} variant="departures" empty={`No departures ${isToday ? 'today' : 'on this day'}`} />}
        {tab === 'inhouse' && <List items={data?.inHouse ?? []} variant="inhouse" empty="Nobody is checked in right now" />}
        {tab === 'rooms' && (
          <div className="space-y-4 p-4">
            <RoomLegend />
            {!rooms ? <Skeleton className="h-64 rounded-xl" /> : <RoomGrid rooms={filteredRooms} onRoomClick={setRoom} />}
          </div>
        )}
      </Card>

      <CheckInDialog booking={dialog?.kind === 'checkin' ? dialog.booking : null} open={dialog?.kind === 'checkin'} onOpenChange={(o) => !o && setDialog(null)} />
      <CheckOutDialog booking={dialog?.kind === 'checkout' ? dialog.booking : null} open={dialog?.kind === 'checkout'} onOpenChange={(o) => !o && setDialog(null)} today={today} />
      <NoteDialog booking={dialog?.kind === 'note' ? dialog.booking : null} open={dialog?.kind === 'note'} onOpenChange={(o) => !o && setDialog(null)} />
      <AssignRoomDialog booking={dialog?.kind === 'assign' ? dialog.booking : null} open={dialog?.kind === 'assign'} onOpenChange={(o) => !o && setDialog(null)} />
      <ConfirmDialog
        open={dialog?.kind === 'noshow' || dialog?.kind === 'cancel'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog?.kind === 'noshow' ? `Mark ${dialog.booking.guest.name} as a no-show?` : `Cancel ${dialog?.booking.guest.name}’s reservation?`}
        description="The room is released back to sale. A manager can reinstate it later."
        confirmLabel={dialog?.kind === 'noshow' ? 'Mark no-show' : 'Cancel reservation'}
        destructive
        loading={!!dialog && pending === `${dialog.booking.id}:${dialog.kind === 'noshow' ? 'NO_SHOW' : 'CANCELLED'}`}
        onConfirm={async () => {
          if (!dialog) return;
          const r = await transition(dialog.booking, dialog.kind === 'noshow' ? 'NO_SHOW' : 'CANCELLED');
          if (r) setDialog(null);
        }}
      />
      <RoomSheet room={room} onOpenChange={(o) => !o && setRoom(null)} />
    </div>
  );
}
