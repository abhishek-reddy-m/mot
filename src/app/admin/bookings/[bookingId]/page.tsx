'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BedDouble,
  CalendarRange,
  Check,
  Copy,
  CreditCard,
  LogIn,
  LogOut,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Phone,
  Sparkles,
  TriangleAlert,
  Undo2,
  Users,
} from 'lucide-react';
import type { ActivityEntry, BookingStatus, BookingSummary } from '@/lib/dto';
import { fetcher } from '@/lib/fetcher';
import { fmtDay, nightsBetween, relativeDay, timeAgo } from '@/lib/format';
import { BOOKING_STATUS, money } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, EmptyState, Skeleton } from '@/components/ui/primitives';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BookingStatusBadge, PaymentBadge } from '@/components/hotel/badges';
import { AssignRoomDialog, CheckInDialog, CheckOutDialog, ConfirmDialog, NoteDialog } from '@/components/frontdesk/dialogs';
import { useBookingActions } from '@/components/frontdesk/useBookingActions';
import { useConsole } from '@/components/console/ConsoleProvider';

interface Detail {
  booking: BookingSummary;
  history: { id: string; status: BookingStatus; notes: string | null; createdAt: string }[];
  activity: ActivityEntry[];
  actions: BookingStatus[];
}

interface Payment {
  paymentStatus: string;
  cardLast4: string | null;
  cardBrand: string | null;
  billingName: string | null;
  stripeCheckoutSessionId: string | null;
}

type DialogKind = 'checkin' | 'checkout' | 'note' | 'assign' | 'noshow' | 'cancel' | 'reinstate';

function parseNotes(notes: string | null) {
  if (!notes) return [];
  return notes
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^\[([^\]·]+)·\s*([^\]]+)\]\s*(.*)$/);
      return m ? { day: m[1].trim(), by: m[2].trim(), text: m[3] } : { day: null, by: null, text: line };
    })
    .reverse();
}

function Fact({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

export default function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { ctx, can, askAgent } = useConsole();
  const today = ctx?.today ?? '';
  const { data, error, isLoading } = useSWR<Detail>(`/api/admin/bookings/${bookingId}`, fetcher);
  const { data: payment } = useSWR<Payment>(can('booking.payment.view') ? `/api/admin/bookings/${bookingId}/payment` : null, fetcher);
  const { transition, pending } = useBookingActions();
  const [dialog, setDialog] = React.useState<DialogKind | null>(null);
  const [copied, setCopied] = React.useState(false);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <EmptyState
          icon={TriangleAlert}
          title="Reservation not found"
          description={(error as Error).message}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/bookings">Back to reservations</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  const b = data.booking;
  const has = (s: BookingStatus) => data.actions.includes(s);
  const reinstatable = (b.status === 'CANCELLED' || b.status === 'NO_SHOW') && has('CONFIRMED') && can('booking.reinstate');
  const notes = parseNotes(b.notes);
  const nightly = b.nights ? b.totalPrice / b.nights / Math.max(1, b.rooms) : b.totalPrice;
  const stayProgress =
    b.status === 'CHECKED_IN' && today ? Math.min(1, Math.max(0, nightsBetween(b.checkIn, today) / Math.max(1, b.nights))) : b.status === 'CHECKED_OUT' ? 1 : 0;

  const timeline = [
    ...data.history.map((h) => ({
      id: `h-${h.id}`,
      at: h.createdAt,
      title: BOOKING_STATUS[h.status]?.label ?? h.status,
      detail: h.notes,
      agent: false,
    })),
    ...data.activity
      .filter((a) => a.action !== 'BOOKING_STATUS')
      .map((a) => ({ id: `a-${a.id}`, at: a.at, title: a.summary, detail: a.user.name, agent: a.source === 'agent' })),
  ].sort((x, y) => y.at.localeCompare(x.at));

  const primary =
    b.status === 'CONFIRMED' || b.status === 'PENDING'
      ? has('CHECKED_IN') && can('booking.checkin') && b.checkIn <= today
        ? { label: 'Check in', icon: LogIn, onClick: () => setDialog('checkin') }
        : b.status === 'PENDING' && can('booking.confirm')
          ? { label: 'Confirm', icon: Check, onClick: () => transition(b, 'CONFIRMED') }
          : null
      : b.status === 'CHECKED_IN' && can('booking.checkout')
        ? { label: 'Check out', icon: LogOut, onClick: () => setDialog('checkout') }
        : reinstatable
          ? { label: 'Reinstate', icon: Undo2, onClick: () => setDialog('reinstate') }
          : null;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(b.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Couldn’t copy — select the code instead.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link href="/admin/bookings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Reservations
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={b.guest.name} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{b.guest.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <button
                onClick={copyCode}
                className="inline-flex items-center gap-1.5 rounded-md border bg-muted/60 px-2 py-0.5 font-mono text-xs tracking-wider hover:bg-muted"
                aria-label={`Copy confirmation code ${b.code}`}
              >
                {b.code} {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
              </button>
              <BookingStatusBadge status={b.status} />
              <PaymentBadge status={b.paymentStatus} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {primary && (
            <Button onClick={primary.onClick} loading={pending?.startsWith(b.id)}>
              <primary.icon className="h-4 w-4" /> {primary.label}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {b.status !== 'CHECKED_OUT' && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW' && can('booking.assignRoom') && (
                <DropdownMenuItem onSelect={() => setDialog('assign')}>{b.room ? 'Move to another room' : 'Choose a room'}</DropdownMenuItem>
              )}
              {can('booking.note') && <DropdownMenuItem onSelect={() => setDialog('note')}>Add note</DropdownMenuItem>}
              {b.status === 'PENDING' && has('CONFIRMED') && can('booking.confirm') && primary?.label !== 'Confirm' && (
                <DropdownMenuItem onSelect={() => transition(b, 'CONFIRMED')}>Confirm reservation</DropdownMenuItem>
              )}
              {(has('NO_SHOW') || has('CANCELLED')) && (
                <>
                  <DropdownMenuSeparator />
                  {has('NO_SHOW') && b.checkIn <= today && can('booking.noShow') && (
                    <DropdownMenuItem destructive onSelect={() => setDialog('noshow')}>
                      Mark no-show
                    </DropdownMenuItem>
                  )}
                  {has('CANCELLED') && can('booking.cancel') && (
                    <DropdownMenuItem destructive onSelect={() => setDialog('cancel')}>
                      Cancel reservation
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {/* Stay */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Stay</p>
              <span className="text-xs text-muted-foreground">{b.propertyName}</span>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border bg-surface-sunken/50 p-4">
              <div>
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p className="text-lg font-semibold">{fmtDay(b.checkIn, 'weekday')}</p>
                {today && <p className="text-xs text-muted-foreground">{relativeDay(b.checkIn, today)}</p>}
              </div>
              <div className="flex flex-col items-center px-2 text-xs text-muted-foreground">
                <span className="tabular">
                  {b.nights} night{b.nights === 1 ? '' : 's'}
                </span>
                <div className="mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${stayProgress * 100}%` }} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Check-out</p>
                <p className="text-lg font-semibold">{fmtDay(b.checkOut, 'weekday')}</p>
                {today && <p className="text-xs text-muted-foreground">{relativeDay(b.checkOut, today)}</p>}
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Fact icon={BedDouble} label="Room">
                {b.room ? (
                  <>
                    {b.room.number}
                    <span className="font-normal text-muted-foreground"> · {b.roomType.name}</span>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5">
                    Not assigned
                    {b.status !== 'CHECKED_OUT' && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW' && can('booking.assignRoom') && (
                      <button onClick={() => setDialog('assign')} className="text-xs font-medium text-primary hover:underline">
                        Choose
                      </button>
                    )}
                  </span>
                )}
              </Fact>
              <Fact icon={Users} label="Party">
                {b.guests} guest{b.guests === 1 ? '' : 's'}
                {b.rooms > 1 && ` · ${b.rooms} rooms`}
              </Fact>
              <Fact icon={CalendarRange} label="Booked">
                {timeAgo(b.createdAt)}
              </Fact>
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Notes & requests</p>
              {can('booking.note') && (
                <Button variant="ghost" size="sm" onClick={() => setDialog('note')}>
                  <MessageSquareText className="h-4 w-4" /> Add
                </Button>
              )}
            </div>
            {notes.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No notes yet. Add preferences, special occasions or anything the next shift should know.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {notes.map((n, i) => (
                  <li key={i} className="rounded-xl bg-muted/60 px-3 py-2.5">
                    <p className="text-sm">{n.text}</p>
                    {n.by && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {n.by} · {n.day ? fmtDay(n.day) : ''}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Timeline */}
          <Card className="p-5 sm:p-6">
            <p className="text-sm font-medium">History</p>
            {timeline.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nothing has happened yet.</p>
            ) : (
              <ol className="relative mt-4 space-y-4 border-l pl-5">
                {timeline.map((t) => (
                  <li key={t.id} className="relative">
                    <span className={cn('absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-card', t.agent ? 'bg-agent' : 'bg-primary/70')} />
                    <p className="text-sm">
                      {t.title}
                      {t.agent && (
                        <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-agent-soft px-1.5 py-px align-middle text-[10px] font-medium text-agent">
                          <Sparkles className="h-2.5 w-2.5" /> agent
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {timeAgo(t.at)}
                      {t.detail ? ` · ${t.detail}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* Guest */}
          <Card className="p-5 sm:p-6">
            <p className="text-sm font-medium">Guest</p>
            <div className="mt-3 space-y-2">
              <a href={`mailto:${b.guest.email}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-accent">
                <Mail className="h-4 w-4 text-muted-foreground" /> <span className="truncate">{b.guest.email}</span>
              </a>
              {b.guest.phone ? (
                <a href={`tel:${b.guest.phone}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-accent">
                  <Phone className="h-4 w-4 text-muted-foreground" /> {b.guest.phone}
                </a>
              ) : (
                <p className="flex items-center gap-2.5 px-2 py-1.5 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" /> No phone on file
                </p>
              )}
            </div>
          </Card>

          {/* Payment */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Payment</p>
              <PaymentBadge status={b.paymentStatus} />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular">{money(b.totalPrice)}</p>
            <p className="text-xs text-muted-foreground">
              {money(nightly)} avg / night · {b.nights} night{b.nights === 1 ? '' : 's'}
              {b.rooms > 1 ? ` × ${b.rooms} rooms` : ''}
            </p>
            {payment && (payment.cardLast4 || payment.stripeCheckoutSessionId) && (
              <p className="mt-4 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                {payment.cardLast4 ? `${payment.cardBrand ?? 'Card'} ending ${payment.cardLast4}` : 'Paid online via Stripe'}
              </p>
            )}
            {b.paymentStatus !== 'PAID' && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW' && (
              <p className="mt-4 text-xs text-muted-foreground">Collect at the property — the balance is due on arrival.</p>
            )}
          </Card>

          {/* Agent */}
          {can('agent.use') && b.status !== 'CHECKED_OUT' && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW' && (
            <Card className="relative overflow-hidden p-5 sm:p-6">
              <div className="bg-aurora pointer-events-none absolute inset-0 opacity-[0.07]" />
              <p className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-agent" /> Ask the agent
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                {[
                  b.status === 'CHECKED_IN' ? null : `Best room for ${b.guest.name}`,
                  b.status === 'CHECKED_IN' ? `Check out ${b.guest.name}` : `Check in ${b.guest.name}, quiet room on a high floor`,
                  `Add a note to ${b.guest.name}: `,
                ]
                  .filter((x): x is string => !!x)
                  .map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => askAgent(cmd)}
                      className="relative rounded-lg border bg-card/80 px-3 py-2 text-left text-sm transition-colors hover:border-agent/40 hover:bg-agent-soft/50"
                    >
                      “{cmd.trim()}{cmd.endsWith(': ') ? '…' : ''}”
                    </button>
                  ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <CheckInDialog booking={dialog === 'checkin' ? b : null} open={dialog === 'checkin'} onOpenChange={(o) => !o && setDialog(null)} />
      <CheckOutDialog booking={dialog === 'checkout' ? b : null} open={dialog === 'checkout'} onOpenChange={(o) => !o && setDialog(null)} today={today} />
      <NoteDialog booking={dialog === 'note' ? b : null} open={dialog === 'note'} onOpenChange={(o) => !o && setDialog(null)} />
      <AssignRoomDialog booking={dialog === 'assign' ? b : null} open={dialog === 'assign'} onOpenChange={(o) => !o && setDialog(null)} />
      <ConfirmDialog
        open={dialog === 'noshow' || dialog === 'cancel' || dialog === 'reinstate'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={
          dialog === 'reinstate'
            ? `Reinstate ${b.guest.name}’s reservation?`
            : dialog === 'noshow'
              ? `Mark ${b.guest.name} as a no-show?`
              : `Cancel ${b.guest.name}’s reservation?`
        }
        description={
          dialog === 'reinstate'
            ? 'It becomes confirmed again if the room type is still available for those nights.'
            : 'The room is released back to sale. A manager can reinstate it later.'
        }
        confirmLabel={dialog === 'reinstate' ? 'Reinstate' : dialog === 'noshow' ? 'Mark no-show' : 'Cancel reservation'}
        destructive={dialog !== 'reinstate'}
        loading={!!pending?.startsWith(b.id)}
        onConfirm={async () => {
          const to: BookingStatus = dialog === 'reinstate' ? 'CONFIRMED' : dialog === 'noshow' ? 'NO_SHOW' : 'CANCELLED';
          const r = await transition(b, to);
          if (r) setDialog(null);
        }}
      />
    </div>
  );
}
