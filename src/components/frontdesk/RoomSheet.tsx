'use client';

import * as React from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Brush, CircleCheck, Sparkles, Wrench } from 'lucide-react';
import type { RoomSummary, TeamMember } from '@/lib/dto';
import { api, fetcher } from '@/lib/fetcher';
import { fmtDay } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OccupancyBadge, RoomStatusBadge, TaskStatusBadge } from '@/components/hotel/badges';
import { useConsole, usePropertyUrl } from '@/components/console/ConsoleProvider';

export function RoomSheet({ room, onOpenChange }: { room: RoomSummary | null; onOpenChange: (o: boolean) => void }) {
  const { can, refresh, askAgent } = useConsole();
  const teamUrl = usePropertyUrl('/api/admin/team', { role: 'HOUSEKEEPER' });
  const { data: team } = useSWR<TeamMember[]>(room && can('housekeeping.assign') ? teamUrl : null, fetcher);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');
  React.useEffect(() => setReason(''), [room?.id]);

  async function act(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      refresh();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const patch = (body: object) => api(`/api/admin/rooms/${room!.id}`, { method: 'PATCH', json: body });

  return (
    <Sheet open={!!room} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0">
        {room && (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg">Room {room.number}</SheetTitle>
              <SheetDescription>
                {room.roomType.name} · Floor {room.floor ?? '—'}
                {room.tags.length > 0 && ` · ${room.tags.join(', ')}`}
              </SheetDescription>
              <div className="flex flex-wrap gap-1.5 pt-2">
                <RoomStatusBadge status={room.status} />
                <OccupancyBadge occupancy={room.occupancy} />
                {room.task && <TaskStatusBadge status={room.task.status} />}
              </div>
            </SheetHeader>
            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              {(room.current || room.arriving) && (
                <div className="space-y-2">
                  {room.current && (
                    <div className="rounded-xl border p-3 text-sm">
                      <p className="text-xs text-muted-foreground">In house</p>
                      <p className="font-medium">{room.current.guestName}</p>
                      <p className="text-xs text-muted-foreground">Leaves {fmtDay(room.current.checkOut, 'weekday')} · #{room.current.code}</p>
                    </div>
                  )}
                  {room.arriving && (
                    <div className="rounded-xl border p-3 text-sm">
                      <p className="text-xs text-muted-foreground">Arriving</p>
                      <p className="font-medium">{room.arriving.guestName}</p>
                      <p className="text-xs text-muted-foreground">#{room.arriving.code}</p>
                    </div>
                  )}
                </div>
              )}

              {!room.isOutOfOrder && can('room.status') && (
                <div>
                  <p className="mb-2 text-sm font-medium">Housekeeping status</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['DIRTY', 'Dirty', Brush],
                        ['CLEAN', 'Clean', CircleCheck],
                        ['INSPECTED', 'Inspected', Sparkles],
                      ] as const
                    ).map(([status, label, Icon]) => (
                      <Button
                        key={status}
                        variant={room.status === status ? 'default' : 'outline'}
                        size="sm"
                        loading={busy === status}
                        disabled={room.status === status}
                        onClick={() => act(status, () => patch({ status }), `Room ${room.number} marked ${label.toLowerCase()}`)}
                      >
                        <Icon className="h-4 w-4" /> {label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {can('housekeeping.assign') && !room.isOutOfOrder && (
                <Field label="Cleaning assigned to">
                  <Select
                    value={room.task?.assignee?.id ?? ''}
                    onValueChange={(v) =>
                      act('assign', () => api('/api/admin/housekeeping', { method: 'POST', json: { roomId: room.id, assignedTo: v } }), `Room ${room.number} assigned`)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={team?.length ? 'Choose a housekeeper' : 'No housekeepers on this property yet'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(team ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} · {m.openTasks ?? 0} open
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {can('room.outOfOrder') && (
                <div className="rounded-xl border p-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Wrench className="h-4 w-4 text-muted-foreground" /> {room.isOutOfOrder ? 'Out of order' : 'Maintenance'}
                  </p>
                  {room.isOutOfOrder ? (
                    <>
                      <p className="mt-1 text-sm text-muted-foreground">{room.outOfOrderReason}</p>
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="outline"
                        loading={busy === 'ooo'}
                        onClick={() => act('ooo', () => patch({ isOutOfOrder: false }), `Room ${room.number} is back in service`)}
                      >
                        Return to service
                      </Button>
                    </>
                  ) : (
                    <>
                      <Field label="Reason" className="mt-3">
                        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. AC not cooling — vendor booked" />
                      </Field>
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="destructive"
                        disabled={room.occupancy === 'OCCUPIED' || room.occupancy === 'DEPARTING'}
                        loading={busy === 'ooo'}
                        onClick={() => act('ooo', () => patch({ isOutOfOrder: true, outOfOrderReason: reason || 'Maintenance' }), `Room ${room.number} taken out of order`)}
                      >
                        Take out of order
                      </Button>
                      {(room.occupancy === 'OCCUPIED' || room.occupancy === 'DEPARTING') && (
                        <p className="mt-2 text-xs text-muted-foreground">Someone is staying here — move them first.</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            {can('agent.use') && (
              <div className="border-t p-4">
                <Button variant="soft" className="w-full" onClick={() => askAgent(`rooms on floor ${room.floor ?? ''}`)}>
                  <Sparkles className="h-4 w-4" /> Ask the agent about floor {room.floor}
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
