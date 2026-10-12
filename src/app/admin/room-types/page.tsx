'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { BedDouble, ChevronRight, Plus, Tag, TriangleAlert, Users } from 'lucide-react';
import { api, fetcher } from '@/lib/fetcher';
import { money } from '@/lib/status';
import { parseRoomNumbers } from '@/lib/rooms';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/primitives';
import { SmartImage } from '@/components/ui/smart-image';
import { useConsole, usePropertyUrl } from '@/components/console/ConsoleProvider';

interface RoomTypeRow {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  basePrice: number | string;
  totalRooms: number;
  amenities: string[];
  isActive: boolean;
  photos: { url: string }[];
  _count: { bookings: number; rooms: number };
}
interface RoomRow {
  id: string;
  roomNumber: string;
  floor: string | null;
  roomTypeId: string;
  status: 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'OUT_OF_ORDER';
  isOutOfOrder: boolean;
}

const DOT: Record<RoomRow['status'], string> = {
  CLEAN: 'bg-success',
  INSPECTED: 'bg-success',
  DIRTY: 'bg-warning',
  OUT_OF_ORDER: 'bg-destructive',
};

function AddRooms({ roomType, propertyId, onDone }: { roomType: RoomTypeRow; propertyId: string; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const parsed = text.trim() ? parseRoomNumbers(text) : null;
  const error = parsed && 'error' in parsed ? parsed.error : null;
  const numbers = parsed && 'numbers' in parsed ? parsed.numbers : [];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!numbers.length) return;
    setBusy(true);
    try {
      await api('/api/admin/rooms', { method: 'POST', json: { propertyId, roomTypeId: roomType.id, roomNumbers: numbers } });
      toast.success(`Added ${numbers.length} ${roomType.name} room${numbers.length > 1 ? 's' : ''}`);
      setText('');
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed px-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
      >
        <Plus className="h-3 w-3" /> Add rooms
      </button>
    );
  }
  return (
    <form onSubmit={save} className="mt-2 w-full space-y-1.5">
      <div className="flex gap-2">
        <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. 101-110, 201, 203" className="h-9" aria-label="Room numbers" />
        <Button type="submit" size="sm" className="h-9" loading={busy} disabled={!numbers.length}>
          Add{numbers.length ? ` ${numbers.length}` : ''}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <p className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
        {error ?? (numbers.length ? `${numbers.slice(0, 12).join(', ')}${numbers.length > 12 ? ` … +${numbers.length - 12}` : ''} · floors are read from the number` : 'Ranges and lists both work.')}
      </p>
    </form>
  );
}

export default function RoomTypesPage() {
  const { propertyId, property, can } = useConsole();
  const typesUrl = usePropertyUrl('/api/admin/room-types');
  const roomsUrl = usePropertyUrl('/api/admin/rooms');
  const { data: types, isLoading, mutate } = useSWR<RoomTypeRow[]>(typesUrl, fetcher);
  const { data: rooms, mutate: mutateRooms } = useSWR<RoomRow[]>(roomsUrl, fetcher);
  const editable = can('inventory.write');
  const byType = React.useMemo(() => {
    const m = new Map<string, RoomRow[]>();
    for (const r of rooms ?? []) m.set(r.roomTypeId, [...(m.get(r.roomTypeId) ?? []), r]);
    return m;
  }, [rooms]);
  const totalRooms = (types ?? []).filter((t) => t.isActive).reduce((s, t) => s + t.totalRooms, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Rooms"
        description={types ? `${types.length} room type${types.length === 1 ? '' : 's'} · ${totalRooms} sellable rooms${property ? ` at ${property.name}` : ''}` : 'Loading…'}
        actions={
          editable ? (
            <Button asChild>
              <Link href="/admin/room-types/add">
                <Plus className="h-4 w-4" /> Add room type
              </Link>
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : !types?.length ? (
        <Card>
          <EmptyState
            icon={BedDouble}
            title="No room types yet"
            description="Start with the kinds of rooms you sell — like “Ocean King” or “Family Suite” — then add the room numbers."
            action={
              editable ? (
                <Button asChild>
                  <Link href="/admin/room-types/add">Add your first room type</Link>
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {types.map((t) => {
              const list = byType.get(t.id) ?? [];
              const gap = t.totalRooms - list.length;
              return (
                <motion.div key={t.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={cn('overflow-hidden p-0', !t.isActive && 'opacity-70')}>
                    <div className="flex flex-col sm:flex-row">
                      <Link href={`/admin/room-types/${t.id}`} className="relative block h-40 shrink-0 bg-muted sm:h-auto sm:w-56">
                        <SmartImage src={t.photos[0]?.url} className="h-full w-full" />
                        {!t.isActive && <span className="absolute left-3 top-3 rounded-full bg-foreground/80 px-2 py-0.5 text-[11px] font-medium text-background">Hidden from sale</span>}
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={`/admin/room-types/${t.id}`} className="text-lg font-semibold tracking-tight hover:underline">
                              {t.name}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" /> Sleeps {t.capacity}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Tag className="h-3.5 w-3.5" /> {money(Number(t.basePrice), { cents: false })} base
                              </span>
                              <span className="flex items-center gap-1.5">
                                <BedDouble className="h-3.5 w-3.5" /> {t.totalRooms} sellable
                              </span>
                            </div>
                          </div>
                          <Button asChild variant="ghost" size="sm" className="shrink-0">
                            <Link href={`/admin/room-types/${t.id}`}>
                              {editable ? 'Edit' : 'View'} <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                        {t.amenities.length > 0 && <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{t.amenities.join(' · ')}</p>}

                        <div className="mt-4 flex flex-wrap items-center gap-1.5">
                          {list.map((r) => (
                            <span key={r.id} className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-surface px-2 text-xs font-medium tabular" title={r.isOutOfOrder ? 'Out of order' : r.status.toLowerCase()}>
                              <span className={cn('h-1.5 w-1.5 rounded-full', DOT[r.isOutOfOrder ? 'OUT_OF_ORDER' : r.status])} />
                              {r.roomNumber}
                            </span>
                          ))}
                          {can('room.manage') && propertyId && (
                            <AddRooms
                              roomType={t}
                              propertyId={propertyId}
                              onDone={() => {
                                void mutateRooms();
                                void mutate();
                              }}
                            />
                          )}
                        </div>
                        {gap > 0 && (
                          <p className="mt-3 flex items-center gap-1.5 text-xs text-warning">
                            <TriangleAlert className="h-3.5 w-3.5" />
                            {list.length === 0
                              ? `Add room numbers so guests can be assigned a room (${t.totalRooms} to set up).`
                              : `${gap} more sellable room${gap > 1 ? 's' : ''} than room numbers — add the rest so every guest can get a key.`}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
