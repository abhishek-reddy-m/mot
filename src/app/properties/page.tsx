'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Building2, MapPin, SearchX, Users } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { fmtRange, nightsBetween } from '@/lib/format';
import { money } from '@/lib/status';
import { cn } from '@/lib/utils';
import Navigation from '@/components/Navigation';
import { Skeleton, EmptyState } from '@/components/ui/primitives';
import { SmartImage } from '@/components/ui/smart-image';
import { StaySearch, defaultStay, type StayQuery } from '@/components/guest/StaySearch';
import { SiteFooter } from '@/components/guest/SiteFooter';

interface PropertyCard {
  id: string;
  name: string;
  tagline: string | null;
  type: string | null;
  description: string | null;
  city: string;
  state: string;
  primaryColor: string | null;
  amenities: string[];
  mainPhoto: string | null;
  roomTypeCount: number;
  maxCapacity: number;
  fromPrice: number | null;
  available: boolean | null;
  isDemo: boolean;
}

function readQuery(params: URLSearchParams): StayQuery & { dated: boolean } {
  const d = defaultStay();
  const checkIn = params.get('checkIn');
  const checkOut = params.get('checkOut');
  const dated = !!checkIn && !!checkOut && checkOut > checkIn;
  return {
    q: params.get('q') ?? '',
    checkIn: dated ? checkIn! : d.checkIn,
    checkOut: dated ? checkOut! : d.checkOut,
    guests: Number(params.get('guests')) || 2,
    dated,
  };
}

function Directory() {
  const router = useRouter();
  const params = useSearchParams();
  const query = React.useMemo(() => readQuery(params), [params]);
  const apiParams = new URLSearchParams();
  if (query.q) apiParams.set('q', query.q);
  apiParams.set('guests', String(query.guests));
  if (query.dated) {
    apiParams.set('checkIn', query.checkIn);
    apiParams.set('checkOut', query.checkOut);
  }
  const { data, isLoading } = useSWR<PropertyCard[]>(`/api/properties?${apiParams}`, fetcher, { keepPreviousData: true });
  const nights = nightsBetween(query.checkIn, query.checkOut);

  const search = (v: StayQuery) => {
    const p = new URLSearchParams({ checkIn: v.checkIn, checkOut: v.checkOut, guests: String(v.guests) });
    if (v.q?.trim()) p.set('q', v.q.trim());
    router.replace(`/properties?${p}`, { scroll: false });
  };

  const stayParams = new URLSearchParams({ checkIn: query.checkIn, checkOut: query.checkOut, guests: String(query.guests) });
  const sorted = [...(data ?? [])].sort((a, b) => Number(b.available !== false) - Number(a.available !== false));

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div className="bg-aurora pointer-events-none absolute inset-0 opacity-[0.08]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 sm:pt-14">
          <h1 className="max-w-2xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">Find your next stay</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">Independent hotels, booked direct. Live prices, instant confirmation, free changes until the day before.</p>
          <StaySearch className="mt-8" value={query} onSubmit={search} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{query.q ? `Stays matching “${query.q}”` : 'All stays'}</h2>
            <p className="text-sm text-muted-foreground">
              {query.dated ? `${fmtRange(query.checkIn, query.checkOut)} · ${nights} night${nights > 1 ? 's' : ''} · ` : ''}
              {query.guests} guest{query.guests > 1 ? 's' : ''}
              {data ? ` · ${data.length} propert${data.length === 1 ? 'y' : 'ies'}` : ''}
            </p>
          </div>
        </div>

        {isLoading && !data ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] rounded-2xl" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : !sorted.length ? (
          <EmptyState icon={SearchX} title="No stays match that search" description="Try another city, or clear the search to see every property." />
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((p, i) => {
              const soldOut = p.available === false;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.05 }}>
                  <Link href={`/properties/${p.id}?${stayParams}`} className={cn('group block', soldOut && 'opacity-60')}>
                    <div className="relative overflow-hidden rounded-2xl">
                      <SmartImage src={p.mainPhoto} icon={Building2} className="aspect-[4/3] w-full transition-transform duration-700 group-hover:scale-[1.03]" loading={i < 3 ? 'eager' : 'lazy'} />
                      {p.isDemo && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-900 shadow-xs backdrop-blur">Demo hotel</span>}
                      {soldOut && <span className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-white">Sold out for these dates</span>}
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold tracking-tight group-hover:underline">{p.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" /> {p.city}, {p.state}
                        </p>
                      </div>
                      {p.fromPrice !== null && (
                        <p className="shrink-0 text-right">
                          <span className="block text-[11px] text-muted-foreground">{query.dated ? 'from' : 'from'}</span>
                          <span className="font-semibold tabular">{money(p.fromPrice, { cents: false })}</span>
                          <span className="text-xs text-muted-foreground"> / night</span>
                        </p>
                      )}
                    </div>
                    {p.tagline && <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{p.tagline}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.amenities.slice(0, 3).map((a) => (
                        <span key={a} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {a}
                        </span>
                      ))}
                      {p.maxCapacity > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          <Users className="h-3 w-3" /> up to {p.maxCapacity}
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

export default function PropertiesPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navigation variant="guest" />
      <main className="flex-1">
        <React.Suspense>
          <Directory />
        </React.Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
