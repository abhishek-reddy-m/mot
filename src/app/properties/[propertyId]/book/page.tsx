'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getSession, signIn, signOut, useSession } from 'next-auth/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Building2, CalendarDays, Check, CreditCard, Lock, ShieldCheck, UserRound, Users } from 'lucide-react';
import type { StayQuote } from '@/lib/dto';
import { api, fetcher } from '@/lib/fetcher';
import { fmtDay, fmtRange } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Callout, EmptyState, Skeleton } from '@/components/ui/primitives';
import { SegmentedControl } from '@/components/ui/segmented';
import { SmartImage } from '@/components/ui/smart-image';
import { PublicDemoNote } from '@/components/guest/PublicDemoNote';
import { GuestShell } from '../../_components/guest-shell';
import { usePropertyShell } from '../../_components/property-shell';
import { plural, price, shiftDay } from '../../_components/format';

interface PublicProperty {
  id: string;
  name: string;
  city: string;
  state: string;
  primaryColor: string | null;
  isDemo: boolean;
  roomTypes: { id: string; name: string; capacity: number; photos: { url: string }[] }[];
}

type PaymentMethod = 'pay_at_property' | 'stripe';

const STEPS = ['Room and dates', 'Your details', 'Review and book'] as const;

/** Where the guest is in checkout; earlier steps are links back. */
function Steps({ current, backHref }: { current: 2 | 3; backHref: string }) {
  return (
    <nav aria-label="Booking progress" className="mt-5">
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          const dot = (
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                done ? 'bg-brand text-brand-foreground' : active ? 'border-2 border-brand bg-brand-soft text-brand-soft-foreground' : 'border border-input text-muted-foreground'
              )}
              aria-hidden
            >
              {done ? <Check className="h-4 w-4" /> : n}
            </span>
          );
          const text = (
            <>
              {dot}
              <span className={cn('hidden text-sm sm:inline', active ? 'font-semibold text-foreground' : 'text-muted-foreground')} aria-hidden>
                {label}
              </span>
              <span className="sr-only">
                {label}
                {done ? ' (done)' : ''}
              </span>
            </>
          );
          return (
            <li key={label} className={cn('flex items-center gap-2 sm:gap-3', n < STEPS.length && 'flex-1')} aria-current={active ? 'step' : undefined}>
              {n === 1 ? (
                <Link href={backHref} className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:gap-3 sm:rounded-md [&>span:nth-child(2)]:hover:underline">
                  {text}
                </Link>
              ) : (
                <span className="flex items-center gap-2 sm:gap-3">{text}</span>
              )}
              {n < STEPS.length && <span className={cn('h-px min-w-4 flex-1', done ? 'bg-brand' : 'bg-border')} aria-hidden />}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-sm text-muted-foreground sm:hidden" aria-hidden>
        Step {current} of {STEPS.length} · <span className="font-medium text-foreground">{STEPS[current - 1]}</span>
      </p>
    </nav>
  );
}

function Section({ id, title, description, done, children }: { id: string; title: string; description?: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {done && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
            <Check className="h-4 w-4" aria-hidden />
            <span className="sr-only">Done</span>
          </span>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function GuestAuth({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = React.useState<'register' | 'signin'>('register');
  const [form, setForm] = React.useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const { update } = useSession();
  const reduce = useReducedMotion();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'register') {
        await api('/api/auth/register', { method: 'POST', json: form });
      }
      const res = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      if (!res || res.error) throw new Error(mode === 'signin' ? 'That email and password don’t match an account.' : 'Your account was created, but signing in failed. Choose “I have an account” and try again.');
      await getSession();
      await update();
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SegmentedControl
        layoutId="checkout-auth"
        aria-label="Do you have an account?"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError('');
        }}
        options={[
          { value: 'register', label: 'I’m new here' },
          { value: 'signin', label: 'I have an account' },
        ]}
      />
      {mode === 'register' && <PublicDemoNote className="mt-4" />}
      <form onSubmit={submit} className="mt-5 space-y-4" aria-describedby={error ? 'auth-error' : undefined}>
        <AnimatePresence initial={false} mode="popLayout">
          {mode === 'register' && (
            <motion.div
              key="names"
              initial={reduce ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reduce ? undefined : { opacity: 0, height: 0 }}
              className="grid gap-4 overflow-hidden sm:grid-cols-2"
            >
              <Field label="First name" htmlFor="g-first">
                <Input id="g-first" required autoComplete="given-name" value={form.firstName} onChange={set('firstName')} />
              </Field>
              <Field label="Last name" htmlFor="g-last">
                <Input id="g-last" required autoComplete="family-name" value={form.lastName} onChange={set('lastName')} />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>
        <div className={cn('grid gap-4', mode === 'register' && 'sm:grid-cols-2')}>
          <Field label="Email" htmlFor="g-email" hint={mode === 'register' ? 'Your confirmation goes here.' : undefined}>
            <Input id="g-email" type="email" inputMode="email" required autoComplete="email" value={form.email} onChange={set('email')} />
          </Field>
          {mode === 'register' && (
            <Field label="Phone" optional htmlFor="g-phone" hint="Only used about this stay.">
              <Input id="g-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
            </Field>
          )}
        </div>
        <Field label="Password" htmlFor="g-pass" hint={mode === 'register' ? 'At least 8 characters. You’ll use it to manage your booking.' : undefined}>
          <Input
            id="g-pass"
            type="password"
            required
            minLength={mode === 'register' ? 8 : 1}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={form.password}
            onChange={set('password')}
          />
        </Field>
        {error && (
          <Callout tone="danger" id="auth-error" role="alert">
            {error}
          </Callout>
        )}
        <Button type="submit" variant="brand" size="lg" loading={busy} loadingText={mode === 'register' ? 'Creating your account…' : 'Signing in…'} className="h-11 w-full text-sm sm:w-auto">
          {mode === 'register' ? 'Continue' : 'Sign in and continue'}
        </Button>
      </form>
    </div>
  );
}

function Checkout() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const shell = usePropertyShell();
  const { data: session, status } = useSession();
  const roomTypeId = params.get('roomTypeId') ?? '';
  const checkIn = params.get('checkIn') ?? '';
  const checkOut = params.get('checkOut') ?? '';
  const guests = Number(params.get('guests')) || 2;
  const rooms = Number(params.get('rooms')) || 1;

  const { data: p } = useSWR<PublicProperty>(`/api/properties/${propertyId}`, fetcher);
  const { data: quote, error: quoteError } = useSWR<StayQuote>(
    roomTypeId && checkIn && checkOut ? `/api/quote?roomTypeId=${roomTypeId}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&rooms=${rooms}` : null,
    fetcher
  );
  const { data: config } = useSWR<{ stripeEnabled: boolean }>('/api/config', fetcher);
  const [payment, setPayment] = React.useState<PaymentMethod>('pay_at_property');
  const [notes, setNotes] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [needDetails, setNeedDetails] = React.useState(false);
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  const rt = p?.roomTypes.find((r) => r.id === roomTypeId);
  const signedIn = status === 'authenticated';
  const back = `/properties/${propertyId}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&rooms=${rooms}`;
  const unavailable = !!quote && quote.available < rooms;
  const stripe = !!config?.stripeEnabled;
  const method: PaymentMethod = stripe ? payment : 'pay_at_property';
  const name = p?.name ?? shell?.name;

  React.useEffect(() => {
    if (signedIn) setNeedDetails(false);
  }, [signedIn]);

  async function confirm() {
    if (!signedIn) {
      // Validate on click instead of a disabled button: show where to go next.
      setNeedDetails(true);
      document.getElementById('details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => document.querySelector<HTMLInputElement>('#details input:not([type="hidden"])')?.focus({ preventScroll: true }), 350);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await api<{ requiresPayment: boolean; checkoutUrl?: string; booking: { id: string } }>('/api/bookings', {
        method: 'POST',
        json: { propertyId, roomTypeId, checkIn, checkOut, guests, rooms, notes: notes.trim() || null, paymentMethod: method },
      });
      if (r.requiresPayment && r.checkoutUrl) {
        window.location.href = r.checkoutUrl;
        return;
      }
      router.push(`/bookings/${r.booking.id}?new=1`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (!roomTypeId || !checkIn || !checkOut) {
    return (
      <GuestShell brandColor={shell?.primaryColor} brand={shell ? { name: shell.name, href: `/properties/${propertyId}` } : undefined}>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h1 className="sr-only">Confirm and book</h1>
          <div className="mx-auto max-w-xl rounded-2xl border bg-card">
            <EmptyState
              icon={CalendarDays}
              title="Pick your dates and room first"
              description="Choose when you’re staying and which room you’d like, then come back here to book."
              action={
                <Button asChild variant="brand">
                  <Link href={`/properties/${propertyId}`}>See rooms and prices</Link>
                </Button>
              }
            />
          </div>
        </div>
      </GuestShell>
    );
  }

  const deadline = fmtDay(shiftDay(checkIn, -1), 'weekday');
  const cur = quote?.currency ?? 'USD';
  const totalLabel = quote ? price(quote.total, cur) : '';
  const nightsCount = quote?.nights.length ?? 0;

  return (
    <GuestShell brandColor={p?.primaryColor ?? shell?.primaryColor} brand={name ? { name, href: `/properties/${propertyId}` } : undefined}>
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <Link
          href={back}
          className="-ml-1 mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Change room or dates
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">Confirm and book</h1>
        <Steps current={signedIn ? 3 : 2} backHref={back} />

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
          <div className="order-2 min-w-0 space-y-5 lg:order-1">
            <Section id="details" title="Your details" description={signedIn ? undefined : 'We’ll send your confirmation by email.'} done={signedIn}>
              {status === 'loading' ? (
                <Skeleton className="h-16 rounded-xl" />
              ) : signedIn ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserRound className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{session?.user?.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{session?.user?.email}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0" onClick={() => signOut({ redirect: false })}>
                    Not you?
                  </Button>
                </div>
              ) : (
                <>
                  {needDetails && (
                    <Callout tone="info" className="mb-5" role="status">
                      Add your details to finish booking — it takes a few seconds.
                    </Callout>
                  )}
                  <GuestAuth onDone={() => setTimeout(() => confirmRef.current?.focus(), 100)} />
                </>
              )}
            </Section>

            <Section id="requests" title="Special requests" description="Optional. They go straight to the front desk — we can’t guarantee them, but we’ll try.">
              <Field label="Anything the hotel should know?" htmlFor="notes" labelClassName="sr-only">
                <Textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                  placeholder="Arrival time, celebrations, accessibility needs, a quiet room…"
                />
              </Field>
            </Section>

            <Section id="payment" title="Payment">
              {stripe ? (
                <fieldset>
                  <legend className="sr-only">How would you like to pay?</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        { value: 'pay_at_property', title: 'Pay at the hotel', text: 'Nothing is charged today. Pay when you arrive.', icon: Building2 },
                        { value: 'stripe', title: 'Pay now by card', text: 'Secure card payment by Stripe.', icon: CreditCard },
                      ] as const
                    ).map((o) => (
                      <label
                        key={o.value}
                        className="relative flex cursor-pointer items-start gap-3 rounded-xl border border-input p-4 transition-colors hover:bg-accent/60 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2"
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={o.value}
                          checked={payment === o.value}
                          onChange={() => setPayment(o.value)}
                          className="mt-0.5 h-5 w-5 shrink-0 accent-brand focus-visible:outline-none"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{o.title}</span>
                          <span className="mt-0.5 block text-sm text-muted-foreground">{o.text}</span>
                        </span>
                        <o.icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border bg-surface-sunken p-4">
                  <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold">Pay at the hotel</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">Nothing is charged today. You pay when you arrive.</p>
                  </div>
                </div>
              )}
            </Section>

            <section aria-label="Book" className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
              <p className="flex items-start gap-2.5 text-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                <span className="text-muted-foreground">
                  <strong className="font-semibold text-foreground">Free changes and cancellation until 3:00 PM on {deadline}</strong>, the day before check-in. After
                  that, contact the hotel.
                </span>
              </p>
              {error && (
                <Callout tone="danger" className="mt-4" role="alert">
                  {error}
                </Callout>
              )}
              {unavailable && (
                <Callout tone="danger" className="mt-4" role="alert" action={<Button asChild variant="outline" size="sm"><Link href={back}>Choose another room</Link></Button>}>
                  This room just sold out for these dates.
                </Callout>
              )}
              <Button
                ref={confirmRef}
                variant="brand"
                size="lg"
                className="mt-5 w-full"
                onClick={confirm}
                loading={busy}
                loadingText={method === 'stripe' ? 'Opening secure payment…' : 'Booking your room…'}
                disabled={!quote || unavailable}
              >
                <Lock aria-hidden />
                {method === 'stripe' ? 'Continue to payment' : 'Confirm booking'}
                {totalLabel && <span className="tabular">· {totalLabel}</span>}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {(p?.isDemo ?? shell?.isDemo) ? 'This is a demo hotel — book freely, nothing is charged.' : method === 'stripe' ? 'You’ll pay on the next screen.' : 'You won’t be charged today.'}
              </p>
            </section>
          </div>

          {/* Summary */}
          <aside className="order-1 lg:order-2" aria-labelledby="summary-title">
            <div className="overflow-hidden rounded-2xl border bg-card shadow-soft lg:sticky lg:top-24">
              <SmartImage src={rt?.photos[0]?.url} alt="" aspectRatio="16 / 9" sizes="400px" className="hidden w-full sm:block" />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <SmartImage src={rt?.photos[0]?.url} alt="" className="h-16 w-20 shrink-0 rounded-lg sm:hidden" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-muted-foreground">{name ? `${name} · ${p?.city ?? shell?.city ?? ''}` : ' '}</p>
                    <h2 id="summary-title" className="text-lg font-semibold tracking-tight">
                      {rt?.name ?? quote?.roomTypeName ?? <span className="skeleton mt-1 inline-block h-6 w-40 align-middle" aria-hidden />}
                    </h2>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-muted px-3 py-2.5">
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden /> Dates
                    </dt>
                    <dd className="mt-0.5 font-medium">{fmtRange(checkIn, checkOut)}</dd>
                  </div>
                  <div className="rounded-xl bg-muted px-3 py-2.5">
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" aria-hidden /> Guests
                    </dt>
                    <dd className="mt-0.5 font-medium">
                      {plural(guests, 'guest')}
                      {rooms > 1 ? ` · ${plural(rooms, 'room')}` : ''}
                    </dd>
                  </div>
                </dl>
                <p className="mt-2 text-xs text-muted-foreground">Check in from 3:00 PM · check out by 11:00 AM</p>

                <div className="mt-5 border-t pt-4">
                  <h3 className="text-sm font-semibold">Price details</h3>
                  {quoteError ? (
                    <Callout tone="warning" className="mt-3" role="alert">
                      {(quoteError as Error).message}
                    </Callout>
                  ) : !quote ? (
                    <div className="mt-3 space-y-2" aria-hidden>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="mt-3 h-6 w-full" />
                    </div>
                  ) : (
                    <dl className="mt-3 space-y-1.5 text-sm">
                      {nightsCount <= 7 ? (
                        quote.nights.map((n) => (
                          <div key={n.date} className="flex justify-between gap-3 text-muted-foreground">
                            <dt>{fmtDay(n.date, 'weekday')}</dt>
                            <dd className="tabular">
                              {price(n.price, cur)}
                              {rooms > 1 ? ` × ${rooms}` : ''}
                            </dd>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between gap-3 text-muted-foreground">
                          <dt>
                            {plural(nightsCount, 'night')} × {price(quote.averageNightly, cur)} average
                            {rooms > 1 ? ` × ${rooms} rooms` : ''}
                          </dt>
                          <dd className="tabular">{price(quote.subtotal, cur)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-3 text-muted-foreground">
                        <dt>Booking fee</dt>
                        <dd>None</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 border-t pt-3">
                        <dt className="text-base font-semibold">Total</dt>
                        <dd className="text-lg font-semibold tabular">{price(quote.total, cur)}</dd>
                      </div>
                    </dl>
                  )}
                  {quote && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Prices in {cur === 'USD' ? 'US dollars' : cur}. Local taxes, if any, are settled with the hotel.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </GuestShell>
  );
}

/** First paint: the hotel's header and the checkout's shape, before the search params are read. */
function CheckoutFallback() {
  const shell = usePropertyShell();
  return (
    <GuestShell brandColor={shell?.primaryColor} brand={shell ? { name: shell.name, href: `/properties/${shell.id}` } : undefined}>
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6" role="status" aria-label="Loading checkout">
        <div className="mt-3 h-10" />
        <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">Confirm and book</h1>
        <Skeleton className="mt-5 h-8 w-full max-w-3xl" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
          <Skeleton className="order-2 h-[28rem] rounded-2xl lg:order-1" />
          <Skeleton className="order-1 h-72 rounded-2xl lg:order-2 lg:h-[34rem]" />
        </div>
      </div>
    </GuestShell>
  );
}

export default function BookPage() {
  return (
    <React.Suspense fallback={<CheckoutFallback />}>
      <Checkout />
    </React.Suspense>
  );
}
