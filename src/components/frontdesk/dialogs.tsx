'use client';

import * as React from 'react';
import useSWR from 'swr';
import { AlertTriangle, BedDouble, CheckCircle2, Sparkle } from 'lucide-react';
import type { RoomOption } from '@/lib/agent/blocks';
import type { BookingSummary } from '@/lib/dto';
import { fetcher } from '@/lib/fetcher';
import { fmtRange } from '@/lib/format';
import { money } from '@/lib/status';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/primitives';
import { Textarea } from '@/components/ui/textarea';
import { useBookingActions } from './useBookingActions';

type Prefs = { highFloor: boolean; quiet: boolean };

function RoomPicker({
  booking,
  value,
  onChange,
  readyOnly,
}: {
  booking: BookingSummary;
  value: string | null;
  onChange: (id: string, option: RoomOption) => void;
  readyOnly: boolean;
}) {
  const [prefs, setPrefs] = React.useState<Prefs>({ highFloor: false, quiet: false });
  const q = new URLSearchParams();
  if (prefs.highFloor) q.set('highFloor', '1');
  if (prefs.quiet) q.set('tags', 'quiet');
  const { data, isLoading } = useSWR<RoomOption[]>(`/api/admin/bookings/${booking.id}/room?${q}`, fetcher);
  const options = (data ?? []).filter((o) => !readyOnly || o.ready || o.room.id === value);

  // Preselect the best match.
  React.useEffect(() => {
    if (!value && options[0]) onChange(options[0].room.id, options[0]);
  }, [options, value, onChange]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['highFloor', 'High floor'],
            ['quiet', 'Quiet'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setPrefs((p) => ({ ...p, [k]: !p[k] }))}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              prefs[k] ? 'border-primary bg-primary-soft text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : options.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          No {readyOnly ? 'ready ' : ''}{booking.roomType.name} room is free for these nights.
        </p>
      ) : (
        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3" role="radiogroup" aria-label="Room">
          {options.map((o, i) => (
            <button
              key={o.room.id}
              type="button"
              role="radio"
              aria-checked={value === o.room.id}
              onClick={() => onChange(o.room.id, o)}
              className={cn(
                'relative rounded-xl border p-2.5 text-left transition-all',
                value === o.room.id ? 'border-primary bg-primary-soft ring-2 ring-primary/20' : 'hover:border-foreground/30',
                !o.ready && 'border-dashed'
              )}
            >
              <span className="flex items-center justify-between">
                <span className="font-semibold tabular">{o.room.number}</span>
                {i === 0 && <span className="rounded-full bg-agent-soft px-1.5 text-[10px] font-semibold text-agent">Best</span>}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                Floor {o.room.floor ?? '—'} · {o.ready ? (o.room.status === 'INSPECTED' ? 'Inspected' : 'Clean') : 'Needs cleaning'}
              </span>
              {o.room.tags.includes('quiet') && <Sparkle className="absolute bottom-2 right-2 h-3 w-3 text-agent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CheckInDialog({ booking, open, onOpenChange }: { booking: BookingSummary | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { transition, pending } = useBookingActions();
  const [roomId, setRoomId] = React.useState<string | null>(null);
  const [option, setOption] = React.useState<RoomOption | null>(null);
  const [showAll, setShowAll] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setRoomId(booking?.room?.id ?? null);
      setOption(null);
      setShowAll(false);
    }
  }, [open, booking]);
  if (!booking) return null;
  const onChange = (id: string, o: RoomOption) => {
    setRoomId(id);
    setOption(o);
  };
  const dirty = option ? !option.ready : false;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Check in {booking.guest.name}</DialogTitle>
          <DialogDescription>
            {booking.roomType.name} · {fmtRange(booking.checkIn, booking.checkOut)} · {booking.nights} night{booking.nights === 1 ? '' : 's'} · {booking.guests} guest
            {booking.guests === 1 ? '' : 's'}
          </DialogDescription>
        </DialogHeader>
        {booking.notes && <p className="rounded-xl bg-agent-soft/50 px-3 py-2 text-sm">{booking.notes.split('\n').slice(-1)[0]}</p>}
        <RoomPicker booking={booking} value={roomId} onChange={onChange} readyOnly={!showAll} />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-[hsl(var(--primary))]" />
          Show rooms that still need cleaning
        </label>
        {dirty && (
          <p className="flex gap-2 rounded-xl border border-warning/30 bg-warning-soft/60 px-3 py-2 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" /> Room {option?.room.number} hasn’t been cleaned. The guest will be checked into it anyway.
          </p>
        )}
        {booking.paymentStatus === 'AWAITING_PAYMENT' && (
          <p className="flex gap-2 rounded-xl border border-warning/30 bg-warning-soft/60 px-3 py-2 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" /> Online payment didn’t complete — collect {money(booking.totalPrice)} at the desk.
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!roomId}
            loading={pending === `${booking.id}:CHECKED_IN`}
            onClick={async () => {
              const r = await transition(booking, 'CHECKED_IN', { roomId: roomId!, allowDirtyRoom: dirty });
              if (r) onOpenChange(false);
            }}
          >
            <CheckCircle2 className="h-4 w-4" /> Check in{option ? ` to ${option.room.number}` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssignRoomDialog({ booking, open, onOpenChange }: { booking: BookingSummary | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { assignRoom, pending } = useBookingActions();
  const [roomId, setRoomId] = React.useState<string | null>(null);
  const [option, setOption] = React.useState<RoomOption | null>(null);
  React.useEffect(() => {
    if (open) {
      setRoomId(null);
      setOption(null);
    }
  }, [open]);
  if (!booking) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{booking.room ? `Move ${booking.guest.name}` : `Choose a room for ${booking.guest.name}`}</DialogTitle>
          <DialogDescription>
            {booking.roomType.name} · {fmtRange(booking.checkIn, booking.checkOut)}
            {booking.room ? ` · currently Room ${booking.room.number}` : ''}
          </DialogDescription>
        </DialogHeader>
        <RoomPicker
          booking={booking}
          value={roomId}
          onChange={(id, o) => {
            setRoomId(id);
            setOption(o);
          }}
          readyOnly={false}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!roomId || roomId === booking.room?.id}
            loading={pending === `${booking.id}:room`}
            onClick={async () => {
              const r = await assignRoom(booking, roomId!);
              if (r) onOpenChange(false);
            }}
          >
            <BedDouble className="h-4 w-4" /> Assign{option ? ` Room ${option.room.number}` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CheckOutDialog({ booking, open, onOpenChange, today }: { booking: BookingSummary | null; open: boolean; onOpenChange: (o: boolean) => void; today: string }) {
  const { transition, pending } = useBookingActions();
  if (!booking) return null;
  const early = booking.checkOut > today;
  const unpaid = booking.paymentStatus !== 'PAID';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check out {booking.guest.name}?</DialogTitle>
          <DialogDescription>
            {booking.room ? `Room ${booking.room.number} will be marked dirty and added to the housekeeping queue.` : 'This stay will be closed.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {early && (
            <p className="flex gap-2 rounded-xl border border-info/25 bg-info-soft/60 px-3 py-2 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-info" /> Early departure — the unused nights go back on sale.
            </p>
          )}
          {unpaid && (
            <p className="flex gap-2 rounded-xl border border-warning/30 bg-warning-soft/60 px-3 py-2 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" /> Balance of {money(booking.totalPrice)} to settle before the guest leaves.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Not yet
          </Button>
          <Button
            loading={pending === `${booking.id}:CHECKED_OUT`}
            onClick={async () => {
              const r = await transition(booking, 'CHECKED_OUT');
              if (r) onOpenChange(false);
            }}
          >
            Check out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NoteDialog({ booking, open, onOpenChange }: { booking: BookingSummary | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { addNote, pending } = useBookingActions();
  const [note, setNote] = React.useState('');
  React.useEffect(() => {
    if (open) setNote('');
  }, [open]);
  if (!booking) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Note for {booking.guest.name}</DialogTitle>
          <DialogDescription>Visible to the whole team on this reservation, stamped with your name.</DialogDescription>
        </DialogHeader>
        <Field label="Note" htmlFor="note">
          <Textarea id="note" autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Celebrating an anniversary — leave a card in the room" maxLength={1000} />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!note.trim()}
            loading={pending === `${booking.id}:note`}
            onClick={async () => {
              const r = await addNote(booking, note);
              if (r) onOpenChange(false);
            }}
          >
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  loading,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep it
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
