'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getSession, signIn, signOut, useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Building2, CalendarDays, Check, CreditCard, Lock, ShieldCheck, TriangleAlert, Users } from 'lucide-react';
import type { StayQuote } from '@/lib/dto';
import { api, fetcher } from '@/lib/fetcher';
import { fmtDay, fmtRange } from '@/lib/format';
import { money } from '@/lib/status';
import { cn } from '@/lib/utils';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState, Skeleton } from '@/components/ui/primitives';
import { SegmentedControl } from '@/components/ui/segmented';
import { SmartImage } from '@/components/ui/smart-image';
import { brandStyle } from '@/components/guest/brand';

interface PublicProperty {
  id: string;
  name: string;
  city: string;
  state: string;
  primaryColor: string | null;
  isDemo: boolean;
  roomTypes: { id: string; name: string; capacity: number; photos: { url: string }[] }[];
}

function Section({ n, title, children, done }: { n: number; title: string; children: React.ReactNode; done?: boolean }) {
  return (
    <section className="rounded-3xl border bg-card p-5 sm:p-6">
      <h2 className="flex items-center gap-3 text-lg font-semibold tracking-tight">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold', done ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground')}>
          {done ? <Check className="h-4 w-4" /> : n}
        </span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function GuestAuth() {
  const [mode, setMode] = React.useState<'register' | 'signin'>('register');
  const [form, setForm] = React.useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const { update } = useSession();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'register') {
        await api('/api/auth/register', { method: 'POST', json: form });
      }
      const res = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      if (!res || res.error) throw new Error(mode === 'signin' ? 'That email and password don’t match an account.' : 'Account created, but sign-in failed. Try signing in.');
      await getSession();
      await update();
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
        aria-label="Account"
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
      <form onSubmit={submit} className="mt-5 space-y-4">
        <AnimatePresence initial={false} mode="popLayout">
          {mode === 'register' && (
            <motion.div key="names" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-2 gap-3 overflow-hidden">
              <Field label="First name" htmlFor="g-first">
                <Input id="g-first" required autoComplete="given-name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </Field>
              <Field label="Last name" htmlFor="g-last">
                <Input id="g-last" required autoComplete="family-name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>
        <div className={cn('grid gap-3', mode === 'register' && 'sm:grid-cols-2')}>
          <Field label="Email" htmlFor="g-email">
            <Input id="g-email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          {mode === 'register' && (
            <Field label="Phone (optional)" htmlFor="g-phone" hint="Only used about this stay.">
              <Input id="g-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          )}
        </div>
        <Field label="Password" htmlFor="g-pass" hint={mode === 'register' ? 'At least 8 characters — you’ll use it to manage your booking.' : undefined}>
          <Input id="g-pass" type="password" required minLength={mode === 'register' ? 8 : 1} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        {error && (
          <p className="rounded-lg border border-destructive/25 bg-destructive-soft px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="brand" loading={busy} className="w-full sm:w-auto">
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
  const [payment, setPayment] = React.useState<'pay_at_property' | 'stripe'>('pay_at_property');
  const [notes, setNotes] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const rt = p?.roomTypes.find((r) => r.id === roomTypeId);
  const signedIn = status === 'authenticated';
  const back = `/properties/${propertyId}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&rooms=${rooms}`;
  const unavailable = quote && quote.available < rooms;

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      const r = await api<{ requiresPayment: boolean; checkoutUrl?: string; booking: { id: string } }>('/api/bookings', {
        method: 'POST',
        json: { propertyId, roomTypeId, checkIn, checkOut, guests, rooms, notes: notes.trim() || null, paymentMethod: payment },
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
      <div className="mx-auto max-w-xl p-10">
        <EmptyState icon={CalendarDays} title="Pick your dates and room first" action={<Button asChild variant="outline"><Link href={`/properties/${propertyId}`}>Back to the hotel</Link></Button>} />
      </div>
    );
  }

  return (
    <div style={brandStyle(p?.primaryColor)} className="min-h-dvh bg-background">
      <Navigation variant="guest" brand={p ? { name: p.name, href: `/properties/${p.id}` } : undefined} />
      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Link href={back} className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Change room or dates
        </Link>
        <h1 className="mt-4 font-display text-3xl tracking-tight sm:text-4xl">Confirm and book</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="order-2 space-y-5 lg:order-1">
            <Section n={1} title="Who’s staying" done={signedIn}>
              {status === 'loading' ? (
                <Skeleton className="h-12 rounded-xl" />
              ) : signedIn ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{session?.user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{session?.user?.email} · confirmation goes here</p>
                  </div>
                  <button onClick={() => signOut({ redirect: false })} className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground">
                    Not you?
                  </button>
                </div>
              ) : (
                <GuestAuth />
              )}
            </Section>

            <Section n={2} title="Anything we should know?">
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Arrival time, celebrations, accessibility needs, a quiet room…" aria-label="Special requests" />
              <p className="mt-2 text-xs text-muted-foreground">Requests go straight to the front desk. We can’t guarantee them, but we’ll try.</p>
            </Section>

            <Section n={3} title="Payment">
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    { value: 'pay_at_property', title: 'Pay at the hotel', text: 'Nothing charged today. Pay when you arrive.', icon: Building2, enabled: true },
                    { value: 'stripe', title: 'Pay now by card', text: config?.stripeEnabled ? 'Secure checkout by Stripe.' : 'Not available for this hotel yet.', icon: CreditCard, enabled: !!config?.stripeEnabled },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    disabled={!o.enabled}
                    onClick={() => setPayment(o.value)}
                    aria-pressed={payment === o.value}
                    className={cn(
                      'flex items-start gap-3 rounded-2xl border p-4 text-left transition-all',
                      payment === o.value ? 'border-brand bg-brand-soft/60 ring-1 ring-brand' : 'hover:bg-accent',
                      !o.enabled && 'cursor-not-allowed opacity-50 hover:bg-transparent'
                    )}
                  >
                    <o.icon className={cn('mt-0.5 h-5 w-5 shrink-0', payment === o.value ? 'text-brand' : 'text-muted-foreground')} />
                    <span>
                      <span className="block text-sm font-semibold">{o.title}</span>
                      <span className="block text-xs text-muted-foreground">{o.text}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Section>

            <div className="rounded-3xl border bg-card p-5 sm:p-6">
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>
                  Free cancellation and date changes until <strong className="font-medium text-foreground">3:00 PM on {checkIn ? fmtDay(addDaysLocal(checkIn, -1), 'weekday') : '—'}</strong>. After that, contact the hotel.
                </span>
              </p>
              {error && (
                <p className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive-soft px-3 py-2 text-sm text-destructive" role="alert">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </p>
              )}
              <Button variant="brand" size="lg" className="mt-5 w-full" onClick={confirm} loading={busy} disabled={!signedIn || !quote || !!unavailable}>
                <Lock className="h-4 w-4" />
                {!signedIn ? 'Add your details to continue' : payment === 'stripe' ? `Continue to payment · ${quote ? money(quote.total) : ''}` : `Confirm booking · ${quote ? money(quote.total) : ''}`}
              </Button>
              {p?.isDemo && <p className="mt-3 text-center text-xs text-muted-foreground">This is a demo hotel — you can book freely; nothing is charged.</p>}
            </div>
          </div>

          {/* Summary */}
          <aside className="order-1 lg:order-2">
            <div className="overflow-hidden rounded-3xl border bg-card shadow-soft lg:sticky lg:top-20">
              <SmartImage src={rt?.photos[0]?.url} className="h-40 w-full" />
              <div className="p-5">
                <p className="text-xs text-muted-foreground">{p ? `${p.name} · ${p.city}` : '\u00a0'}</p>
                <p className="mt-0.5 text-lg font-semibold tracking-tight">{rt?.name ?? quote?.roomTypeName ?? '…'}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-muted/60 p-3">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" /> Dates
                    </p>
                    <p className="mt-0.5 font-medium">{fmtRange(checkIn, checkOut)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/60 p-3">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> Guests
                    </p>
                    <p className="mt-0.5 font-medium">
                      {guests} guest{guests > 1 ? 's' : ''}
                      {rooms > 1 ? ` · ${rooms} rooms` : ''}
                    </p>
                  </div>
                </div>

                {quoteError ? (
                  <p className="mt-4 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2 text-sm">{(quoteError as Error).message}</p>
                ) : !quote ? (
                  <Skeleton className="mt-4 h-24 rounded-xl" />
                ) : (
                  <div className="mt-5 space-y-1.5 text-sm">
                    {quote.nights.map((n) => (
                      <div key={n.date} className="flex justify-between text-muted-foreground">
                        <span>{fmtDay(n.date, 'weekday')}</span>
                        <span className="tabular">
                          {money(n.price)}
                          {rooms > 1 ? ` × ${rooms}` : ''}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-3 text-base font-semibold">
                      <span>Total</span>
                      <span className="tabular">{money(quote.total)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">No booking fees · local taxes, if any, are settled with the hotel</p>
                    {unavailable && <p className="mt-2 rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">Just sold out for these dates. Go back to pick another room.</p>}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function addDaysLocal(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function BookPage() {
  return (
    <React.Suspense>
      <Checkout />
    </React.Suspense>
  );
}
