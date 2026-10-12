'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, LayoutDashboard, Luggage, MapPin } from 'lucide-react';
import type { BookingStatus } from '@/lib/dto';
import { fetcher } from '@/lib/fetcher';
import { fmtDay, fmtRange, localToday, nightsBetween } from '@/lib/format';
import { BOOKING_STATUS, money } from '@/lib/status';
import { isStaffRole } from '@/lib/routes';
import { cn } from '@/lib/utils';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/primitives';
import { SegmentedControl } from '@/components/ui/segmented';
import { SmartImage } from '@/components/ui/smart-image';
import { BookingStatusBadge } from '@/components/hotel/badges';
import { SiteFooter } from '@/components/guest/SiteFooter';
import { brandStyle } from '@/components/guest/brand';

interface Trip {
  id: string;
  code: string | null;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalPrice: number;
  paymentStatus: string;
  property: { id: string; name: string; city: string; state: string; primaryColor: string | null; photos: { url: string }[] };
  roomType: { name: string; photos: { url: string }[] };
  room: { roomNumber: string } | null;
}

type Tab = 'upcoming' | 'past' | 'cancelled';

function NextTrip({ trip }: { trip: Trip }) {
  const today = localToday();
  const days = nightsBetween(today, trip.checkIn);
  const inHouse = trip.status === 'CHECKED_IN';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={brandStyle(trip.property.primaryColor)}>
      <Link href={`/bookings/${trip.id}`} className="group grid overflow-hidden rounded-3xl border bg-card shadow-soft transition-shadow hover:shadow-lifted md:grid-cols-[1.2fr_1fr]">
        <SmartImage src={trip.property.photos[0]?.url ?? trip.roomType.photos[0]?.url} className="h-56 md:h-full md:min-h-72" loading="eager" />
        <div className="flex flex-col p-6 sm:p-8">
          <span className="inline-flex w-fit items-center rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
            {inHouse ? 'You’re staying here now' : days === 0 ? 'Check-in today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
          </span>
          <h2 className="mt-4 font-display text-3xl tracking-tight">{trip.property.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {trip.property.city}, {trip.property.state}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Check in</p>
              <p className="font-semibold">{fmtDay(trip.checkIn, 'weekday')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Check out</p>
              <p className="font-semibold">{fmtDay(trip.checkOut, 'weekday')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Room</p>
              <p className="font-semibold">
                {trip.roomType.name}
                {trip.room ? ` · ${trip.room.roomNumber}` : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Confirmation</p>
              <p className="font-mono font-semibold tracking-wider">{trip.code}</p>
            </div>
          </div>
          <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-medium text-brand">
            Manage booking <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function TripRow({ trip }: { trip: Trip }) {
  const nights = nightsBetween(trip.checkIn, trip.checkOut);
  return (
    <Link href={`/bookings/${trip.id}`} className="group flex items-center gap-4 rounded-2xl border bg-card p-3 pr-4 transition-all hover:-translate-y-px hover:shadow-soft">
      <SmartImage src={trip.property.photos[0]?.url} className="h-20 w-24 shrink-0 rounded-xl sm:w-32" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{trip.property.name}</p>
        <p className="truncate text-sm text-muted-foreground">
          {fmtRange(trip.checkIn, trip.checkOut)} · {nights} night{nights > 1 ? 's' : ''} · {trip.roomType.name}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <BookingStatusBadge status={trip.status} />
          <span className="text-xs text-muted-foreground tabular">{money(trip.totalPrice, { cents: false })}</span>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export default function TripsPage() {
  const { data: session } = useSession();
  const { data, isLoading } = useSWR<Trip[]>('/api/bookings', fetcher);
  const [tab, setTab] = React.useState<Tab>('upcoming');
  const today = localToday();
  const firstName = session?.user?.name?.split(' ')[0];

  const upcoming = (data ?? [])
    .filter((t) => (t.status === 'CONFIRMED' || t.status === 'PENDING' || t.status === 'CHECKED_IN') && t.checkOut >= today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const past = (data ?? []).filter((t) => t.status === 'CHECKED_OUT' || ((t.status === 'CONFIRMED' || t.status === 'CHECKED_IN') && t.checkOut < today));
  const cancelled = (data ?? []).filter((t) => t.status === 'CANCELLED' || t.status === 'NO_SHOW');
  const [next, ...later] = upcoming;
  const list = tab === 'upcoming' ? later : tab === 'past' ? past : cancelled;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navigation variant="guest" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-6 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl tracking-tight">{firstName ? `Hi ${firstName}` : 'Your trips'}</h1>
            <p className="mt-1 text-muted-foreground">{upcoming.length ? `You have ${upcoming.length} upcoming stay${upcoming.length > 1 ? 's' : ''}.` : 'Where to next?'}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/properties">
              <CalendarDays className="h-4 w-4" /> Book a stay
            </Link>
          </Button>
        </div>

        {isStaffRole(session?.user?.role) && (
          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border bg-primary-soft/50 px-4 py-3 text-sm">
            <span>You also have access to a hotel console.</span>
            <Button asChild size="sm">
              <Link href="/admin">
                <LayoutDashboard className="h-4 w-4" /> Open console
              </Link>
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-72 rounded-3xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : !data?.length ? (
          <div className="mt-10 rounded-3xl border bg-card">
            <EmptyState
              icon={Luggage}
              title="No trips yet"
              description="When you book a stay it shows up here — with your confirmation, directions and free changes until the day before."
              action={
                <Button asChild>
                  <Link href="/properties">Find a stay</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {next && (
              <div className="mt-8">
                <NextTrip trip={next} />
              </div>
            )}
            <div className="mt-10 flex items-center justify-between gap-3">
              <SegmentedControl
                layoutId="trips-tab"
                aria-label="Trips"
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'upcoming', label: `Later${later.length ? ` · ${later.length}` : ''}` },
                  { value: 'past', label: `Past${past.length ? ` · ${past.length}` : ''}` },
                  { value: 'cancelled', label: `Cancelled${cancelled.length ? ` · ${cancelled.length}` : ''}` },
                ]}
              />
            </div>
            <div className={cn('mt-4 space-y-3')}>
              {list.length === 0 ? (
                <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  {tab === 'upcoming' ? (next ? 'Nothing else planned yet.' : 'No upcoming stays.') : tab === 'past' ? 'No past stays yet.' : 'Nothing cancelled.'}
                </p>
              ) : (
                list.map((t) => <TripRow key={t.id} trip={t} />)
              )}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">{BOOKING_STATUS.CONFIRMED.label} bookings can be changed or cancelled free until 3 PM the day before arrival.</p>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
