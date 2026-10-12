'use client';

import * as React from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Brush, Repeat, Sparkle, User, Wrench } from 'lucide-react';
import type { RoomSummary } from '@/lib/dto';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  CLEAN: 'border-success/30 bg-success-soft/60',
  INSPECTED: 'border-info/30 bg-info-soft/60',
  DIRTY: 'border-warning/40 bg-warning-soft/70',
  OUT_OF_ORDER: 'border-destructive/30 bg-destructive-soft/70',
};

const DOT: Record<string, string> = {
  CLEAN: 'bg-success',
  INSPECTED: 'bg-info',
  DIRTY: 'bg-warning',
  OUT_OF_ORDER: 'bg-destructive',
};

function OccupancyIcon({ room }: { room: RoomSummary }) {
  const cls = 'h-3.5 w-3.5';
  switch (room.occupancy) {
    case 'OCCUPIED':
      return <User className={cls} aria-label="Occupied" />;
    case 'ARRIVING':
      return <ArrowDownToLine className={cls} aria-label="Arriving" />;
    case 'DEPARTING':
      return <ArrowUpFromLine className={cls} aria-label="Departing" />;
    case 'TURNOVER':
      return <Repeat className={cls} aria-label="Turnover" />;
    default:
      return null;
  }
}

export function RoomTile({ room, highlight, onClick }: { room: RoomSummary; highlight?: boolean; onClick?: () => void }) {
  const guest = room.current?.guestName ?? room.arriving?.guestName;
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      title={[
        `Room ${room.number} · ${room.roomType.name}`,
        room.isOutOfOrder ? `Out of order: ${room.outOfOrderReason ?? ''}` : room.status.toLowerCase(),
        guest ? `${room.occupancy.toLowerCase()} · ${guest}` : room.occupancy.toLowerCase(),
        room.task ? `Cleaning: ${room.task.status.toLowerCase()}${room.task.assignee ? ` (${room.task.assignee.name})` : ''}` : null,
      ]
        .filter(Boolean)
        .join('\n')}
      className={cn(
        'relative flex min-h-[84px] flex-col justify-between rounded-xl border p-2.5 text-left transition-all',
        STATUS_STYLE[room.status] ?? 'bg-surface',
        onClick && 'hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        highlight && 'ring-2 ring-agent ring-offset-2 ring-offset-background'
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-[15px] font-semibold leading-none tabular">{room.number}</span>
        <span className="flex items-center gap-1 text-foreground/70">
          <OccupancyIcon room={room} />
          {room.isOutOfOrder && <Wrench className="h-3.5 w-3.5 text-destructive" aria-label="Out of order" />}
          {room.task && <Brush className={cn('h-3.5 w-3.5', room.task.status === 'IN_PROGRESS' ? 'text-info' : 'text-warning')} aria-label="Cleaning task" />}
          {room.tags.includes('quiet') && <Sparkle className="h-3 w-3 text-agent" aria-label="Quiet" />}
        </span>
      </div>
      <div className="mt-2 min-w-0">
        <p className="truncate text-[11px] text-muted-foreground">{room.roomType.name}</p>
        <p className="truncate text-xs font-medium">{room.isOutOfOrder ? room.outOfOrderReason ?? 'Out of order' : guest ?? '—'}</p>
      </div>
    </Comp>
  );
}

export function RoomLegend({ className }: { className?: string }) {
  const items: [string, string][] = [
    ['CLEAN', 'Clean'],
    ['INSPECTED', 'Inspected'],
    ['DIRTY', 'Dirty'],
    ['OUT_OF_ORDER', 'Out of order'],
  ];
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground', className)}>
      {items.map(([k, l]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', DOT[k])} />
          {l}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <User className="h-3 w-3" /> Occupied
      </span>
      <span className="inline-flex items-center gap-1.5">
        <ArrowDownToLine className="h-3 w-3" /> Arriving
      </span>
      <span className="inline-flex items-center gap-1.5">
        <ArrowUpFromLine className="h-3 w-3" /> Departing
      </span>
    </div>
  );
}

/** Rooms grouped by floor — a live floor plan of the property. */
export function RoomGrid({
  rooms,
  highlight = [],
  onRoomClick,
  dense,
}: {
  rooms: RoomSummary[];
  highlight?: string[];
  onRoomClick?: (room: RoomSummary) => void;
  dense?: boolean;
}) {
  const floors = React.useMemo(() => {
    const map = new Map<string, RoomSummary[]>();
    for (const r of rooms) map.set(r.floor ?? '—', [...(map.get(r.floor ?? '—') ?? []), r]);
    return [...map.entries()].sort((a, b) => (parseInt(b[0]) || 0) - (parseInt(a[0]) || 0));
  }, [rooms]);
  if (!rooms.length) return <p className="py-6 text-center text-sm text-muted-foreground">No rooms match.</p>;
  return (
    <div className="space-y-4">
      {floors.map(([floor, list]) => (
        <div key={floor} className="flex gap-3">
          <div className="w-10 shrink-0 pt-2 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {floor === '—' ? '' : `Fl ${floor}`}
          </div>
          <div className={cn('grid flex-1 gap-2', dense ? 'grid-cols-[repeat(auto-fill,minmax(96px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(112px,1fr))]')}>
            {list.map((r) => (
              <RoomTile key={r.id} room={r} highlight={highlight.includes(r.number)} onClick={onRoomClick ? () => onRoomClick(r) : undefined} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
