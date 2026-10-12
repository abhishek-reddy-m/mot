'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, BedDouble, Check, Grid2x2, MapPin, Phone, ShieldCheck, Sparkles, TriangleAlert, Users, Zap } from 'lucide-react';
import type { StayQuote } from '@/lib/dto';
import { fetcher } from '@/lib/fetcher';
import { fmtDay, fmtRange, nightsBetween } from '@/lib/format';
import { money } from '@/lib/status';
import { cn } from '@/lib/utils';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { EmptyState, Skeleton } from '@/components/ui/primitives';
import { SmartImage } from '@/components/ui/smart-image';
import { StaySearch, defaultStay, type StayQuery } from '@/components/guest/StaySearch';
import { brandStyle } from '@/components/guest/brand';
import { PRODUCT_NAME } from '@/config/product';

interface Photo {
  id: string;
  url: string;
  isMain: boolean;
}
interface PublicProperty {
  id: string;
  name: string;
  tagline: string | null;
  type: string | null;
  description: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string | null;
  amenities: string[];
  primaryColor: string | null;
  isDemo: boolean;
  photos: Photo[];
  roomTypes: { id: string; name: string; description: string | null; capacity: number; basePrice: number; amenities: string[]; photos: Photo[] }[];
}
interface Availability {
  roomTypes: {
    id: string;
    name: string;
    capacity: number;
    available: number;
    quote: StayQuote | null;
    fitsParty: boolean;
    isAvailable: boolean;
  }[];
}

function readStay(params: URLSearchParams): StayQuery {
  const d = defaultStay();
  const checkIn = params.get('checkIn');
  const checkOut = params.get('checkOut');
  const ok = !!checkIn && !!checkOut && checkOut > checkIn;
  return {
    checkIn: ok ? checkIn! : d.checkIn,
    checkOut: ok ? checkOut! : d.checkOut,
    guests: Number(params.get('guests')) || 2,
    rooms: Number(params.get('rooms')) || 1,
  };
}

/** Fill the 4×2 mosaic with no gaps whatever the photo count (lead photo is 2×2). */
function spanFor(count: number, i: number): string {
  if (count === 2) return 'sm:col-span-2 sm:row-span-2';
  if (count === 3) return 'sm:col-span-2';
  if (count === 4 && i === 3) return 'sm:col-span-2';
  return '';
}

function Gallery({ photos, name }: { photos: Photo[]; name: string }) {
  const [open, setOpen] = React.useState(false);
  const shown = photos.slice(0, 5);
  return (
    <>
      <div className="relative">
        <div className={cn('grid gap-2 overflow-hidden rounded-3xl', shown.length > 1 && 'sm:grid-cols-4 sm:grid-rows-2')} style={{ height: 'clamp(260px, 42vw, 460px)' }}>
          {(shown.length ? shown : [null]).map((p, i) => (
            <button
              key={p?.id ?? 'empty'}
              type="button"
              onClick={() => p && setOpen(true)}
              className={cn('group relative overflow-hidden', i === 0 ? 'sm:col-span-2 sm:row-span-2' : cn('hidden sm:block', spanFor(shown.length, i)), shown.length === 1 && 'sm:col-span-4')}
              aria-label={p ? `Open photo ${i + 1} of ${photos.length}` : undefined}
            >
              <SmartImage src={p?.url} alt={i === 0 ? name : ''} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]" loading={i === 0 ? 'eager' : 'lazy'} />
            </button>
          ))}
        </div>
        {photos.length > 1 && (
          <Button variant="outline" size="sm" className="absolute bottom-4 right-4 bg-white/90 text-slate-900 backdrop-blur hover:bg-white" onClick={() => setOpen(true)}>
            <Grid2x2 className="h-4 w-4" /> All {photos.length} photos
          </Button>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] max-w-5xl overflow-y-auto p-4 sm:p-6">
          <DialogTitle>{name}</DialogTitle>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {photos.map((p) => (
              <SmartImage key={p.id} src={p.url} className="aspect-[4/3] rounded-xl" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PropertyPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const stay = React.useMemo(() => readStay(params), [params]);
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const roomsRef = React.useRef<HTMLDivElement>(null);

  const { data: p, error } = useSWR<PublicProperty>(`/api/properties/${propertyId}`, fetcher);
  const availUrl = `/api/properties/${propertyId}/availability?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=${stay.guests}&rooms=${stay.rooms ?? 1}`;
  const { data: avail, error: availError, isLoading: availLoading } = useSWR<Availability>(p ? availUrl : null, fetcher, { keepPreviousData: true });

  const setStay = (v: StayQuery) => {
    const q = new URLSearchParams({ checkIn: v.checkIn, checkOut: v.checkOut, guests: String(v.guests), rooms: String(v.rooms ?? 1) });
    router.replace(`/properties/${propertyId}?${q}`, { scroll: false });
    setTimeout(() => roomsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const book = (roomTypeId: string) => {
    const q = new URLSearchParams({ roomTypeId, checkIn: stay.checkIn, checkOut: stay.checkOut, guests: String(stay.guests), rooms: String(stay.rooms ?? 1) });
    router.push(`/properties/${propertyId}/book?${q}`);
  };

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-10">
        <EmptyState icon={TriangleAlert} title="This property isn’t taking bookings" description="It may have moved or paused online booking." action={<Button asChild variant="outline"><Link href="/properties">Browse stays</Link></Button>} />
      </div>
    );
  }

  const byId = new Map((avail?.roomTypes ?? []).map((r) => [r.id, r]));
  const bookable = (avail?.roomTypes ?? []).filter((r) => r.isAvailable && r.fitsParty && r.quote);
  const cheapest = bookable.sort((a, b) => a.quote!.total - b.quote!.total)[0];

  return (
    <div style={brandStyle(p?.primaryColor)} className="min-h-dvh bg-background">
      <Navigation variant="guest" brand={p ? { name: p.name, href: `/properties/${p.id}` } : undefined} />

      <main className="mx-auto max-w-7xl px-4 pb-32 sm:px-6 lg:pb-16">
        <Link href="/properties" className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All stays
        </Link>

        {!p ? (
          <div className="mt-4 space-y-4">
            <Skeleton className="h-[420px] rounded-3xl" />
            <Skeleton className="h-10 w-1/2" />
          </div>
        ) : (
          <>
            <div className="mt-4">
              <Gallery photos={p.photos} name={p.name} />
            </div>

            <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
              <div className="min-w-0">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {p.type ?? 'Hotel'} · {p.city}, {p.state}
                  </p>
                  <h1 className="mt-1 font-display text-4xl leading-tight tracking-tight sm:text-5xl">{p.name}</h1>
                  {p.tagline && <p className="mt-2 text-lg text-muted-foreground">{p.tagline}</p>}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: Zap, title: 'Instant confirmation', text: 'Your room is held the moment you book.' },
                    { icon: ShieldCheck, title: 'Free changes', text: 'Cancel or move dates until 3 PM the day before.' },
                    { icon: Sparkles, title: 'Best rate, direct', text: 'No booking fees, ever.' },
                  ].map((f) => (
                    <div key={f.title} className="rounded-2xl border bg-card p-4">
                      <f.icon className="h-5 w-5 text-brand" />
                      <p className="mt-2 text-sm font-semibold">{f.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{f.text}</p>
                    </div>
                  ))}
                </div>

                {p.description && <p className="mt-8 max-w-prose whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{p.description}</p>}

                {p.amenities.length > 0 && (
                  <div className="mt-8">
                    <h2 className="text-lg font-semibold">What this place offers</h2>
                    <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
                      {p.amenities.map((a) => (
                        <li key={a} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-brand" /> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Rooms */}
                <div ref={roomsRef} className="mt-12 scroll-mt-20">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight">Choose your room</h2>
                      <p className="text-sm text-muted-foreground">
                        {fmtRange(stay.checkIn, stay.checkOut)} · {nights} night{nights > 1 ? 's' : ''} · {stay.guests} guest{stay.guests > 1 ? 's' : ''}
                        {(stay.rooms ?? 1) > 1 ? ` · ${stay.rooms} rooms` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 lg:hidden">
                    <StaySearch value={stay} onSubmit={setStay} showDestination={false} showRooms submitLabel="Update" compact />
                  </div>
                  {availError && (
                    <p className="mt-4 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm">{(availError as Error).message}</p>
                  )}
                  <div className="mt-5 space-y-4">
                    {p.roomTypes.map((rt, i) => {
                      const a = byId.get(rt.id);
                      const q = a?.quote;
                      const unavailable = a && !a.isAvailable;
                      const tooSmall = a && !a.fitsParty;
                      const low = a && a.isAvailable && a.available <= 3;
                      return (
                        <motion.div
                          key={rt.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={cn('overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-soft', (unavailable || tooSmall) && 'opacity-70')}
                        >
                          <div className="flex flex-col sm:flex-row">
                            <SmartImage src={rt.photos[0]?.url} className="h-48 shrink-0 sm:h-auto sm:w-60" />
                            <div className="flex flex-1 flex-col p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="text-lg font-semibold tracking-tight">{rt.name}</h3>
                                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Users className="h-3.5 w-3.5" /> Sleeps {rt.capacity}
                                  </p>
                                </div>
                                {low && <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">Only {a!.available} left</span>}
                              </div>
                              {rt.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{rt.description}</p>}
                              {rt.amenities.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {rt.amenities.slice(0, 5).map((am) => (
                                    <span key={am} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                      {am}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                                <div>
                                  {availLoading && !a ? (
                                    <Skeleton className="h-8 w-28" />
                                  ) : q ? (
                                    <>
                                      <p>
                                        <span className="text-2xl font-semibold tabular">{money(q.averageNightly, { cents: false })}</span>
                                        <span className="text-sm text-muted-foreground"> / night</span>
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {money(q.total)} total for {nights} night{nights > 1 ? 's' : ''}
                                        {(stay.rooms ?? 1) > 1 ? ` · ${stay.rooms} rooms` : ''}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">From {money(rt.basePrice, { cents: false })} / night</p>
                                  )}
                                </div>
                                {unavailable ? (
                                  <span className="text-sm font-medium text-muted-foreground">Sold out for these dates</span>
                                ) : tooSmall ? (
                                  <span className="max-w-[10rem] text-right text-sm text-muted-foreground">Sleeps {rt.capacity} — add a room for {stay.guests}</span>
                                ) : (
                                  <Button variant="brand" onClick={() => book(rt.id)} disabled={!q}>
                                    Select
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    {p.roomTypes.length === 0 && <EmptyState icon={BedDouble} title="Rooms coming soon" description="This property hasn’t published its rooms yet." />}
                  </div>
                </div>

                <div className="mt-12 grid gap-6 border-t pt-10 sm:grid-cols-2">
                  <div>
                    <h2 className="text-lg font-semibold">Where you’ll be</h2>
                    <p className="mt-3 flex items-start gap-2 text-sm">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <span>
                        {p.address}
                        <br />
                        {p.city}, {p.state} {p.zipCode}
                      </span>
                    </p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name}, ${p.address}, ${p.city}, ${p.state}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
                    >
                      Open in Maps
                    </a>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Good to know</h2>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <li>Check-in from 3:00 PM · check-out by 11:00 AM</li>
                      <li>Free cancellation until 3:00 PM the day before arrival</li>
                      <li className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        <a href={`tel:${p.phone}`} className="hover:text-foreground">
                          {p.phone}
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Booking card */}
              <aside className="hidden lg:block">
                <div className="sticky top-20 space-y-4">
                  <div className="rounded-3xl border bg-card p-5 shadow-lifted">
                    <p className="text-sm text-muted-foreground">{cheapest ? 'Rooms from' : 'Check availability'}</p>
                    {cheapest?.quote ? (
                      <p className="mt-0.5">
                        <span className="text-3xl font-semibold tabular">{money(cheapest.quote.averageNightly, { cents: false })}</span>
                        <span className="text-sm text-muted-foreground"> / night</span>
                      </p>
                    ) : avail ? (
                      <p className="mt-1 text-sm font-medium">Nothing left that fits — try other dates.</p>
                    ) : (
                      <Skeleton className="mt-2 h-9 w-32" />
                    )}
                    <StaySearch value={stay} onSubmit={setStay} showDestination={false} showRooms submitLabel="Check rooms" className="mt-4 grid-cols-1 border-0 p-0 shadow-none md:grid-cols-1" />
                    {cheapest && (
                      <p className="mt-3 text-center text-xs text-muted-foreground">
                        {bookable.length} room type{bookable.length > 1 ? 's' : ''} available for {fmtDay(stay.checkIn)} – {fmtDay(stay.checkOut)}
                      </p>
                    )}
                  </div>
                  <p className="px-2 text-center text-xs text-muted-foreground">
                    Secure booking by {PRODUCT_NAME}
                    {p.isDemo && ' · demo property — no real charges'}
                  </p>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      {/* Mobile booking bar */}
      {p && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {cheapest?.quote ? (
                <p>
                  <span className="text-lg font-semibold tabular">{money(cheapest.quote.averageNightly, { cents: false })}</span>
                  <span className="text-xs text-muted-foreground"> / night</span>
                </p>
              ) : (
                <p className="text-sm font-medium">{avail ? 'No rooms for these dates' : 'Checking…'}</p>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {fmtRange(stay.checkIn, stay.checkOut)} · {stay.guests} guest{stay.guests > 1 ? 's' : ''}
              </p>
            </div>
            <Button variant="brand" onClick={() => roomsRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              Choose a room
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <React.Suspense>
      <PropertyPage />
    </React.Suspense>
  );
}
