'use client';

import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, BadgeDollarSign, EyeOff, MoreHorizontal, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { api, fetcher } from '@/lib/fetcher';
import { parseRoomNumbers } from '@/lib/rooms';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState, Skeleton } from '@/components/ui/primitives';
import { ChipInput } from '@/components/setup/ChipInput';
import { PhotoManager } from '@/components/setup/PhotoManager';
import { RoomTypeFields, validateRoomType, type RoomTypeDraft } from '@/components/setup/RoomTypeFields';
import { ConfirmDialog } from '@/components/frontdesk/dialogs';
import { useConsole } from '@/components/console/ConsoleProvider';

interface RoomLite {
  id: string;
  roomNumber: string;
  floor: string | null;
  tags: string[];
  status: string;
  isOutOfOrder: boolean;
  notes?: string | null;
}
interface RoomTypeDetail {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  basePrice: number;
  totalRooms: number;
  amenities: string[];
  isActive: boolean;
  property: { id: string; name: string };
  rooms: RoomLite[];
  _count: { bookings: number };
}

const ROOM_TAGS = ['quiet', 'high floor', 'accessible', 'connecting', 'corner', 'near elevator', 'ocean view', 'garden view', 'balcony'];

function toDraft(t: RoomTypeDetail): RoomTypeDraft {
  return {
    name: t.name,
    description: t.description ?? '',
    capacity: String(t.capacity),
    basePrice: String(t.basePrice),
    totalRooms: String(t.totalRooms),
    amenities: t.amenities,
  };
}

function RoomDialog({ room, onClose, onSaved }: { room: RoomLite | null; onClose: () => void; onSaved: () => void }) {
  const [number, setNumber] = React.useState('');
  const [floor, setFloor] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState('');
  const [busy, setBusy] = React.useState<'save' | 'delete' | null>(null);
  React.useEffect(() => {
    if (!room) return;
    setNumber(room.roomNumber);
    setFloor(room.floor ?? '');
    setTags(room.tags);
    setNotes(room.notes ?? '');
  }, [room]);

  async function save() {
    if (!room) return;
    setBusy('save');
    try {
      await api(`/api/admin/rooms/${room.id}`, { method: 'PATCH', json: { roomNumber: number.trim(), floor: floor.trim() || null, tags, notes: notes.trim() || null } });
      toast.success(`Room ${number} saved`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function remove() {
    if (!room) return;
    setBusy('delete');
    try {
      await api(`/api/admin/rooms/${room.id}`, { method: 'DELETE' });
      toast.success(`Room ${room.roomNumber} removed`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={!!room} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Room {room?.roomNumber}</DialogTitle>
          <DialogDescription>Tags help you (and the agent) pick the right room — “quiet room on a high floor” matches these.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Number" htmlFor="room-num">
              <Input id="room-num" value={number} onChange={(e) => setNumber(e.target.value)} />
            </Field>
            <Field label="Floor" htmlFor="room-floor">
              <Input id="room-floor" value={floor} onChange={(e) => setFloor(e.target.value)} />
            </Field>
          </div>
          <Field label="Tags" htmlFor="room-tags">
            <ChipInput id="room-tags" value={tags} onChange={(v) => setTags(v.map((t) => t.toLowerCase()))} suggestions={ROOM_TAGS} max={12} />
          </Field>
          <Field label="Notes for staff" htmlFor="room-notes">
            <Textarea id="room-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Sofa bed in the closet" />
          </Field>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" className="text-destructive hover:bg-destructive-soft" onClick={remove} loading={busy === 'delete'}>
            <Trash2 className="h-4 w-4" /> Remove room
          </Button>
          <Button onClick={save} loading={busy === 'save'} disabled={!number.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RoomTypeDetailPage() {
  const { roomTypeId } = useParams<{ roomTypeId: string }>();
  const router = useRouter();
  const { can, refresh } = useConsole();
  const url = `/api/admin/room-types/${roomTypeId}`;
  const { data: t, error, mutate } = useSWR<RoomTypeDetail>(url, fetcher);
  const [draft, setDraft] = React.useState<RoomTypeDraft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [editRoom, setEditRoom] = React.useState<RoomLite | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [numbers, setNumbers] = React.useState('');
  const [adding, setAdding] = React.useState(false);
  const editable = can('inventory.write');

  React.useEffect(() => {
    if (t && !draft) setDraft(toDraft(t));
  }, [t, draft]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <EmptyState icon={TriangleAlert} title="Room type not found" description={(error as Error).message} action={<Button asChild variant="outline"><Link href="/admin/room-types">Back to rooms</Link></Button>} />
      </div>
    );
  }
  if (!t || !draft) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(t));
  const parsed = numbers.trim() ? parseRoomNumbers(numbers) : null;
  const roomNumbers = parsed && 'numbers' in parsed ? parsed.numbers : [];

  async function save() {
    if (!draft) return;
    const problem = validateRoomType(draft);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      await api(url, {
        method: 'PATCH',
        json: {
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          capacity: Number(draft.capacity),
          basePrice: Number(draft.basePrice),
          totalRooms: Number(draft.totalRooms || 0),
          amenities: draft.amenities,
        },
      });
      const fresh = await mutate();
      if (fresh) setDraft(toDraft(fresh));
      refresh();
      toast.success('Saved');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    try {
      await api(url, { method: 'PATCH', json: { isActive: !t!.isActive } });
      await mutate();
      refresh();
      toast.success(t!.isActive ? `${t!.name} is hidden from sale` : `${t!.name} is on sale again`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      const r = await api<{ message: string }>(url, { method: 'DELETE' });
      toast.success(r.message);
      refresh();
      router.push('/admin/room-types');
    } catch (e) {
      toast.error((e as Error).message);
      setDeleting(false);
    }
  }

  async function addRooms(e: React.FormEvent) {
    e.preventDefault();
    if (!roomNumbers.length) return;
    setAdding(true);
    try {
      await api('/api/admin/rooms', { method: 'POST', json: { propertyId: t!.property.id, roomTypeId: t!.id, roomNumbers } });
      toast.success(`Added ${roomNumbers.length} room${roomNumbers.length > 1 ? 's' : ''}`);
      setNumbers('');
      const fresh = await mutate();
      if (fresh && draft) setDraft({ ...draft, totalRooms: String(fresh.totalRooms) });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8 lg:pb-28">
      <Link href="/admin/room-types" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Rooms
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-[28px]">
            {t.name}
            {!t.isActive && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Hidden from sale</span>}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.property.name} · {t._count.bookings} booking{t._count.bookings === 1 ? '' : 's'} so far
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/rate-calendar">
              <BadgeDollarSign className="h-4 w-4" /> Rates
            </Link>
          </Button>
          {editable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={toggleActive}>
                  <EyeOff className="h-4 w-4" /> {t.isActive ? 'Hide from sale' : 'Put back on sale'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" /> Delete room type
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <p className="mb-5 text-sm font-semibold">Details</p>
        <fieldset disabled={!editable}>
          <RoomTypeFields value={draft} onChange={setDraft} />
        </fieldset>
      </Card>

      <Card className="p-5 sm:p-6">
        <p className="mb-1 text-sm font-semibold">Photos</p>
        <p className="mb-4 text-xs text-muted-foreground">The cover photo leads on your booking page. Bright, wide shots convert best.</p>
        <PhotoManager endpoint={`/api/admin/room-types/${t.id}/photos`} editable={editable} />
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Room numbers</p>
            <p className="text-xs text-muted-foreground">
              {t.rooms.length} of {t.totalRooms} set up · click a room to add tags like “quiet” or “accessible”
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {t.rooms.map((r) => (
            <button
              key={r.id}
              onClick={() => can('room.manage') && setEditRoom(r)}
              className="group flex flex-col items-start rounded-xl border bg-surface p-3 text-left transition-all hover:-translate-y-px hover:shadow-soft"
            >
              <span className="flex w-full items-center justify-between">
                <span className="text-lg font-semibold tabular">{r.roomNumber}</span>
                {can('room.manage') && <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
              </span>
              <span className="text-xs text-muted-foreground">Floor {r.floor ?? '—'}</span>
              {r.tags.length > 0 && (
                <span className="mt-1.5 flex flex-wrap gap-1">
                  {r.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </span>
              )}
            </button>
          ))}
        </div>
        {can('room.manage') && (
          <form onSubmit={addRooms} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input value={numbers} onChange={(e) => setNumbers(e.target.value)} placeholder="Add rooms, e.g. 301-305" aria-label="Room numbers to add" />
            <Button type="submit" variant="outline" loading={adding} disabled={!roomNumbers.length}>
              <Plus className="h-4 w-4" /> Add{roomNumbers.length ? ` ${roomNumbers.length}` : ''}
            </Button>
          </form>
        )}
        {parsed && 'error' in parsed && <p className="mt-1.5 text-xs text-destructive">{parsed.error}</p>}
      </Card>

      {/* Sticky save bar appears only with unsaved changes */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t bg-surface/95 px-4 py-3 backdrop-blur transition-transform duration-300 lg:left-[248px]',
          dirty && editable ? 'translate-y-0' : 'translate-y-full'
        )}
        aria-hidden={!dirty}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">You have unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDraft(toDraft(t))}>
              Discard
            </Button>
            <Button onClick={save} loading={saving}>
              Save changes
            </Button>
          </div>
        </div>
      </div>

      <RoomDialog room={editRoom} onClose={() => setEditRoom(null)} onSaved={() => void mutate()} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${t.name}?`}
        description={
          t._count.bookings > 0
            ? 'It has booking history, so it will be hidden from sale instead — past reservations stay intact.'
            : 'This removes the room type, its photos, rates and room numbers. This can’t be undone.'
        }
        confirmLabel={t._count.bookings > 0 ? 'Hide from sale' : 'Delete'}
        destructive
        loading={deleting}
        onConfirm={remove}
      />
    </div>
  );
}
