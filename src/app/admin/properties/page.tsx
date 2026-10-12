'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, BedDouble, Building2, CalendarCheck2, Check, MapPin, Plus } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/primitives';
import { SmartImage } from '@/components/ui/smart-image';
import { useConsole } from '@/components/console/ConsoleProvider';

interface PropertyRow {
  id: string;
  name: string;
  city: string;
  state: string;
  type: string | null;
  tagline: string | null;
  isActive: boolean;
  isDemo: boolean;
  primaryColor: string | null;
  photos: { url: string }[];
  roomTypes: { id: string; totalRooms: number; isActive: boolean }[];
  _count: { bookings: number; rooms: number };
}

export default function PropertiesPage() {
  const router = useRouter();
  const { can, propertyId, setPropertyId } = useConsole();
  const { data, isLoading } = useSWR<PropertyRow[]>('/api/admin/properties', fetcher);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Properties"
        description={data ? `${data.length} propert${data.length === 1 ? 'y' : 'ies'} you manage` : 'Loading…'}
        actions={
          can('property.create') ? (
            <Button asChild>
              <Link href="/admin/properties/add">
                <Plus className="h-4 w-4" /> Add property
              </Link>
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : !data?.length ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No properties yet"
            description="Add your first property to start taking bookings."
            action={
              can('property.create') ? (
                <Button asChild>
                  <Link href="/admin/properties/add">Add property</Link>
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => {
            const rooms = p.roomTypes.filter((t) => t.isActive).reduce((s, t) => s + t.totalRooms, 0);
            const current = p.id === propertyId;
            return (
              <Card key={p.id} className={cn('group flex flex-col overflow-hidden p-0 transition-shadow hover:shadow-lifted', current && 'ring-2 ring-primary/25')}>
                <div className="relative">
                  <SmartImage src={p.photos[0]?.url} icon={Building2} className="aspect-[16/9] w-full" />
                  <span className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: p.primaryColor ?? 'hsl(var(--primary))' }} />
                  <div className="absolute left-3 top-3 flex gap-1.5">
                    {p.isDemo && <span className="rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-medium shadow-xs">Demo</span>}
                    {!p.isActive && <span className="rounded-full bg-foreground/80 px-2 py-0.5 text-[11px] font-medium text-background">Inactive</span>}
                    {current && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                        <Check className="h-3 w-3" /> Current
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="font-semibold tracking-tight">{p.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {p.city}, {p.state}
                    {p.type && <span>· {p.type}</span>}
                  </p>
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <BedDouble className="h-3.5 w-3.5" /> {rooms} rooms
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarCheck2 className="h-3.5 w-3.5" /> {p._count.bookings} bookings
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2 pt-1">
                    {!current && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setPropertyId(p.id);
                          router.push('/admin');
                        }}
                      >
                        Switch to
                      </Button>
                    )}
                    {can('property.write') && (
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link href={`/admin/properties/${p.id}`}>Edit</Link>
                      </Button>
                    )}
                    <Button asChild size="icon-sm" variant="ghost" aria-label="Open booking page">
                      <Link href={`/properties/${p.id}`} target="_blank">
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
