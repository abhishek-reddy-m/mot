'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BedDouble,
  CalendarPlus,
  Check,
  Copy,
  CreditCard,
  Mail,
  MapPin,
  Navigation as NavIcon,
  Phone,
  ShieldCheck,
  TriangleAlert,
  Users,
  XCircle,
} from 'lucide-react';
import type { BookingStatus, StayQuote } from '@/lib/dto';
import { api, fetcher } from '@/lib/fetcher';
import { addDays, fmtDay, localToday, nightsBetween } from '@/lib/format';
import { BOOKING_STATUS, money, paymentLabel } from '@/lib/status';
import { cn } from '@/lib/utils';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState, Skeleton } from '@/components/ui/primitives';
import { SmartImage } from '@/components/ui/smart-image';
import { brandStyle } from '@/components/guest/brand';

interface GuestBooking {
  id: string;
  code: string;
  status: BookingStatus;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  rooms: number;
  totalPrice: number;
  notes: string | null;
  roomTypeId: string;
  property: { id: string; name: string; address: string; city: string; state: string; zipCode: string; phone: string; email: string | null; primaryColor: string | null; photos: { url: string }[] };
  roomType: { id: string; name: string; capacity: number; amenities: string[]; photos: { url: string }[] };
  room: { roomNumber: string } | null;
  user: { firstName: string; lastName: string; email: string };
  statusHistory: { status: string; notes: string | null; createdAt: string }[];
  policy: { deadlineDay: string; deadlineLabel: string; passed: boolean };
  canCancel: boolean;
  canModifyCheckIn: boolean;
  canModifyCheckOut: boolean;
}

function icsFor(b: GuestBooking) {
  const d = (day: string) => day.replace(/-/g, '');
  const esc = (s: string) => s.replace(/[,;\\]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StayOS//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${b.id}@stayos`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`,
    `DTSTART;VALUE=DATE:${d(b.checkIn)}`,
    `DTEND;VALUE=DATE:${d(b.checkOut)}`,
    `SUMMARY:${esc(`Stay at ${b.property.name}`)}`,
    `LOCATION:${esc(`${b.property.address}, ${b.property.city}, ${b.property.state} ${b.property.zipCode}`)}`,
    `DESCRIPTION:${esc(`Confirmation ${b.code} · ${b.roomType.name} · ${b.guests} guest(s). Check-in from 3 PM.`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function ChangeDatesDialog({ booking, open, onOpenChange, onDone }: { booking: GuestBooking; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [checkIn, setCheckIn] = React.useState(booking.checkIn);
  const [checkOut, setCheckOut] = React.useState(booking.checkOut);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setCheckIn(booking.checkIn);
      setCheckOut(booking.checkOut);
    }
  }, [open, booking.checkIn, booking.checkOut]);
  const changed = checkIn !== booking.checkIn || checkOut !== booking.checkOut;
  const valid = checkOut > checkIn;
  const { data: quote } = useSWR<StayQuote>(
    open && changed && valid ? `/api/quote?roomTypeId=${booking.roomTypeId}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${booking.guests}&rooms=${booking.rooms}` : null,
    fetcher
  );
  const diff = quote ? quote.total - booking.totalPrice : 0;
  const today = localToday();

  async function save() {
    setBusy(true);
    try {
      const body: Record<string, string> = {};
      if (checkIn !== booking.checkIn) body.newCheckIn = checkIn;
      if (checkOut !== booking.checkOut) body.newCheckOut = checkOut;
      await api(`/api/bookings/${booking.id}/modify-dates`, { method: 'POST', json: body });
      toast.success('Your dates are updated');
      onDone();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change your dates</DialogTitle>
          <DialogDescription>
            {booking.canModifyCheckIn ? 'Pick new dates — we’ll check availability and show the new price.' : 'Your check-in can no longer change online, but you can still change check-out.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check in" htmlFor="cd-in">
            <Input
              id="cd-in"
              type="date"
              value={checkIn}
              min={today}
              disabled={!booking.canModifyCheckIn}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                setCheckIn(v);
                if (checkOut <= v) setCheckOut(addDays(v, Math.max(1, nightsBetween(booking.checkIn, booking.checkOut))));
              }}
            />
          </Field>
          <Field label="Check out" htmlFor="cd-out">
            <Input id="cd-out" type="date" value={checkOut} min={addDays(checkIn > today ? checkIn : today, 1)} max={addDays(checkIn, 30)} onChange={(e) => e.target.value && setCheckOut(e.target.value)} />
          </Field>
        </div>
        {changed && valid && (
          <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm">
            {quote ? (
              <div className="flex items-center justify-between">
                <span>
                  {nightsBetween(checkIn, checkOut)} night{nightsBetween(checkIn, checkOut) > 1 ? 's' : ''} · new total
                </span>
                <span className="text-right">
                  <span className="font-semibold tabular">{money(quote.total)}</span>
                  <span className={cn('block text-xs tabular', diff > 0 ? 'text-warning' : diff < 0 ? 'text-success' : 'text-muted-foreground')}>
                    {diff === 0 ? 'Same price' : `${diff > 0 ? '+' : '−'}${money(Math.abs(diff))}`}
                  </span>
                </span>
              </div>
            ) : (
              <Skeleton className="h-8" />
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep my dates
          </Button>
          <Button variant="brand" onClick={save} loading={busy} disabled={!changed || !valid}>
            Change dates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BookingPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const { data: b, error, mutate } = useSWR<GuestBooking>(status === 'authenticated' ? `/api/bookings/${bookingId}` : null, fetcher);
  const { data: config } = useSWR<{ emailEnabled: boolean }>('/api/config', fetcher);
  const [changeOpen, setChangeOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(params.get('action') === 'cancel');
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const isNew = params.get('new') === '1';
  const payment = params.get('payment');

  React.useEffect(() => {
    if (status === 'unauthenticated') router.replace(`/login?callbackUrl=${encodeURIComponent(`/bookings/${bookingId}`)}`);
  }, [status, router, bookingId]);

  async function cancel() {
    if (!b) return;
    setBusy(true);
    try {
      await api(`/api/bookings/${b.id}/cancel`, { method: 'PUT', json: { reason: reason.trim() || undefined } });
      toast.success('Your booking is cancelled');
      setCancelOpen(false);
      await mutate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-background">
        <Navigation variant="guest" />
        <div className="mx-auto max-w-xl p-10">
          <EmptyState icon={TriangleAlert} title="We couldn’t open this booking" description={(error as Error).message} action={<Button asChild variant="outline"><Link href="/dashboard">My trips</Link></Button>} />
        </div>
      </div>
    );
  }

  if (!b) {
    return (
      <div className="min-h-dvh bg-background">
        <Navigation variant="guest" />
        <div className="mx-auto max-w-4xl space-y-4 p-6">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </div>
    );
  }

  const upcoming = b.status === 'CONFIRMED' || b.status === 'PENDING';
  const cancelled = b.status === 'CANCELLED' || b.status === 'NO_SHOW';
  const today = localToday();
  const daysToGo = nightsBetween(today, b.checkIn);
  const pay = paymentLabel(b.paymentStatus);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.property.name}, ${b.property.address}, ${b.property.city}, ${b.property.state}`)}`;

  return (
    <div style={brandStyle(b.property.primaryColor)} className="min-h-dvh bg-background">
      <Navigation variant="guest" />
      <main className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <Link href="/dashboard" className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> My trips
        </Link>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 overflow-hidden rounded-3xl border bg-card">
          <div className="relative">
            <SmartImage src={b.property.photos[0]?.url} className="h-44 w-full sm:h-56" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute inset-x-5 bottom-4 text-white sm:inset-x-6">
              <p className="text-sm text-white/80">
                {b.property.city}, {b.property.state}
              </p>
              <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{b.property.name}</h1>
            </div>
          </div>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              {cancelled ? (
                <p className="flex items-center gap-2 font-semibold text-destructive">
                  <XCircle className="h-5 w-5" /> {b.status === 'NO_SHOW' ? 'Marked as no-show' : 'Cancelled'}
                </p>
              ) : isNew || payment === 'success' ? (
                <p className="flex items-center gap-2 text-lg font-semibold">
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="flex h-7 w-7 items-center justify-center rounded-full bg-success text-white">
                    <Check className="h-4 w-4" />
                  </motion.span>
                  {payment === 'success' ? 'Payment received — you’re booked!' : 'You’re booked!'}
                </p>
              ) : (
                <p className="font-semibold">
                  {b.status === 'CHECKED_IN' ? 'Enjoy your stay' : b.status === 'CHECKED_OUT' ? 'Thanks for staying' : daysToGo === 0 ? 'Check-in is today' : daysToGo === 1 ? 'See you tomorrow' : `${daysToGo} days to go`}
                </p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                {isNew && !cancelled ? (config?.emailEnabled ? `Confirmation sent to ${b.user.email}. ` : 'Keep your confirmation code handy. ') : ''}
                {BOOKING_STATUS[b.status].label}
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(b.code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  /* clipboard unavailable — the code is visible anyway */
                }
              }}
              className="group flex items-center gap-3 rounded-2xl border border-dashed px-4 py-2.5 text-left transition-colors hover:bg-accent"
              aria-label={`Copy confirmation code ${b.code}`}
            >
              <span>
                <span className="block text-[11px] text-muted-foreground">Confirmation</span>
                <span className="font-mono text-lg font-semibold tracking-[0.2em]">{b.code}</span>
              </span>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
            </button>
          </div>
          {payment === 'cancelled' && b.paymentStatus === 'AWAITING_PAYMENT' && (
            <p className="mx-5 mb-5 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm sm:mx-6">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              Payment wasn’t completed, so this booking isn’t confirmed yet. Book again and choose “Pay at the hotel”, or contact {b.property.name}.
            </p>
          )}
        </motion.div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            {/* Stay */}
            <section className="rounded-3xl border bg-card p-5 sm:p-6">
              <div className="grid grid-cols-2 divide-x rounded-2xl border">
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">Check in</p>
                  <p className="mt-0.5 text-lg font-semibold">{fmtDay(b.checkIn, 'weekday')}</p>
                  <p className="text-xs text-muted-foreground">from 3:00 PM</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">Check out</p>
                  <p className="mt-0.5 text-lg font-semibold">{fmtDay(b.checkOut, 'weekday')}</p>
                  <p className="text-xs text-muted-foreground">by 11:00 AM</p>
                </div>
              </div>
              <ul className="mt-5 space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <BedDouble className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {b.roomType.name}
                    {b.rooms > 1 ? ` × ${b.rooms}` : ''}
                    {b.room && <span className="text-muted-foreground"> · Room {b.room.roomNumber}</span>}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {b.guests} guest{b.guests > 1 ? 's' : ''} · {b.nights} night{b.nights > 1 ? 's' : ''}
                </li>
                <li className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <span className="font-semibold tabular">{money(b.totalPrice)}</span>
                    <span className="text-muted-foreground"> · {pay.label}</span>
                  </span>
                </li>
              </ul>
              {b.notes && (
                <div className="mt-5 rounded-xl bg-muted/60 px-4 py-3 text-sm">
                  <p className="text-xs text-muted-foreground">Your requests</p>
                  <p className="mt-0.5 whitespace-pre-line">{b.notes.split('\n').filter((l) => !l.startsWith('[')).join('\n') || b.notes}</p>
                </div>
              )}
            </section>

            {/* Manage */}
            {(upcoming || b.status === 'CHECKED_IN') && (
              <section className="rounded-3xl border bg-card p-5 sm:p-6">
                <h2 className="text-base font-semibold">Manage your booking</h2>
                <p className={cn('mt-1 flex items-start gap-2 text-sm', b.policy.passed ? 'text-muted-foreground' : 'text-success')}>
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  {b.policy.passed ? 'The free change window has closed — contact the hotel for help.' : `Free changes and cancellation until ${b.policy.deadlineLabel}.`}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(b.canModifyCheckIn || b.canModifyCheckOut) && (
                    <Button variant="outline" onClick={() => setChangeOpen(true)}>
                      Change dates
                    </Button>
                  )}
                  {b.canCancel && (
                    <Button variant="ghost" className="text-destructive hover:bg-destructive-soft" onClick={() => setCancelOpen(true)}>
                      Cancel booking
                    </Button>
                  )}
                </div>
              </section>
            )}

            {/* Timeline */}
            <section className="rounded-3xl border bg-card p-5 sm:p-6">
              <h2 className="text-base font-semibold">History</h2>
              <ol className="relative mt-4 space-y-4 border-l pl-5">
                {[...b.statusHistory].reverse().map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-card" />
                    <p className="text-sm">{h.notes ?? BOOKING_STATUS[h.status as BookingStatus]?.label ?? h.status}</p>
                    <p className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border bg-card p-5 sm:p-6">
              <h2 className="text-base font-semibold">Getting there</h2>
              <p className="mt-3 flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>
                  {b.property.address}
                  <br />
                  {b.property.city}, {b.property.state} {b.property.zipCode}
                </span>
              </p>
              <div className="mt-4 grid gap-2">
                <Button asChild variant="outline" className="justify-start">
                  <a href={mapsUrl} target="_blank" rel="noreferrer">
                    <NavIcon className="h-4 w-4" /> Directions
                  </a>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <a href={`tel:${b.property.phone}`}>
                    <Phone className="h-4 w-4" /> {b.property.phone}
                  </a>
                </Button>
                {b.property.email && (
                  <Button asChild variant="outline" className="justify-start">
                    <a href={`mailto:${b.property.email}?subject=${encodeURIComponent(`Booking ${b.code}`)}`}>
                      <Mail className="h-4 w-4" /> Email the hotel
                    </a>
                  </Button>
                )}
                {!cancelled && b.status !== 'CHECKED_OUT' && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      const url = URL.createObjectURL(new Blob([icsFor(b)], { type: 'text/calendar' }));
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `stay-${b.code}.ics`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <CalendarPlus className="h-4 w-4" /> Add to calendar
                  </Button>
                )}
              </div>
            </section>
            {b.status === 'CHECKED_OUT' && (
              <Button asChild variant="brand" className="w-full">
                <Link href={`/properties/${b.property.id}`}>Book {b.property.name} again</Link>
              </Button>
            )}
          </aside>
        </div>
      </main>

      <ChangeDatesDialog booking={b} open={changeOpen} onOpenChange={setChangeOpen} onDone={() => void mutate()} />
      <Dialog open={cancelOpen && b.canCancel} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel your stay at {b.property.name}?</DialogTitle>
            <DialogDescription>
              {fmtDay(b.checkIn, 'weekday')} – {fmtDay(b.checkOut, 'weekday')} · {b.roomType.name}. It’s free — {b.paymentStatus === 'PAID' ? 'you paid online, so the hotel will arrange your refund.' : 'nothing has been charged.'}
            </DialogDescription>
          </DialogHeader>
          <Field label="Reason (optional)" htmlFor="cancel-reason">
            <Textarea id="cancel-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Plans changed…" />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Keep booking
            </Button>
            <Button variant="destructive" onClick={cancel} loading={busy}>
              Cancel booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Page() {
  return (
    <React.Suspense>
      <BookingPage />
    </React.Suspense>
  );
}
