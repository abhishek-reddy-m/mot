import React from 'react';
import {useCurrentFrame} from 'remotion';
import {HOUSEKEEPING_ROOMS} from '../facts.ts';
import {Badge, Button, Card, Screen} from '../mockups/ui.tsx';
import {APP, LIME, MARGIN} from '../theme.ts';
import {DESK, linear, prog} from '../timeline.ts';
import {DiffLayout, VISUAL_TOP} from './DiffLayout.tsx';

const W = 1080 - 2 * MARGIN;
/**
 * Tablet-width layout: still the 2-column room grid (grid-cols-2 below md),
 * but wide enough that "Room 101" and its status badge share a line.
 */
const VIEWPORT = 520;
const ZOOM = W / VIEWPORT;
/** CSS-px offset of the room grid inside the mockup, and its height. */
const GRID_TOP = 96;
const GRID_H = 2 * 176 + 16;

type Status = 'DIRTY' | 'CLEAN' | 'INSPECTED';

// Badge colors from getRoomStatusBadge (src/app/housekeeping/page.tsx).
const BADGE: Record<Status, {bg: string; color: string}> = {
  DIRTY: {bg: APP.yellow100, color: APP.yellow800},
  CLEAN: {bg: APP.green100, color: APP.green800},
  INSPECTED: {bg: APP.blue100, color: APP.blue800},
};

const RoomCard: React.FC<{room: (typeof HOUSEKEEPING_ROOMS)[number]; status: Status; punch?: number}> = ({
  room,
  status,
  punch = 1,
}) => (
  <Card style={{height: 176}}>
    <div style={{padding: 16}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12}}>
        <div>
          <div style={{fontSize: 18, lineHeight: '28px', fontWeight: 700}}>Room {room.number}</div>
          <div style={{fontSize: 14, lineHeight: '20px', color: APP.gray500}}>{room.type}</div>
          <div style={{fontSize: 12, lineHeight: '16px', color: APP.gray400}}>Floor {room.floor}</div>
        </div>
        <Badge
          bg={BADGE[status].bg}
          color={BADGE[status].color}
          style={{transform: `scale(${1.3 - 0.3 * punch})`, transformOrigin: 'right top'}}
        >
          {status}
        </Badge>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
        {status === 'DIRTY' ? (
          <Button size="sm" bg={APP.green600}>
            Mark Clean
          </Button>
        ) : null}
        {status === 'CLEAN' ? (
          <>
            <Button size="sm" bg={APP.blue600}>
              Mark Inspected
            </Button>
            <Button size="sm" variant="outline" color="#ca8a04">
              Mark Dirty
            </Button>
          </>
        ) : null}
        {status === 'INSPECTED' ? (
          <Button size="sm" variant="outline" color="#ca8a04">
            Mark Dirty
          </Button>
        ) : null}
      </div>
    </div>
  </Card>
);

const Page: React.FC<{statusOf: (i: number) => Status; punchOf?: (i: number) => number}> = ({
  statusOf,
  punchOf = () => 1,
}) => (
  <div style={{background: APP.gray50, padding: 16, borderRadius: 12}}>
    <div style={{fontSize: 24, lineHeight: '32px', fontWeight: 700}}>Housekeeping</div>
    <div style={{color: APP.gray500, marginBottom: 24}}>Manage room cleanliness status</div>
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
      {HOUSEKEEPING_ROOMS.map((room, i) => (
        <RoomCard key={room.number} room={room} status={statusOf(i)} punch={punchOf(i)} />
      ))}
    </div>
  </div>
);

/** 04 — the same system runs the front desk and housekeeping. */
export const FrontDesk: React.FC = () => {
  const frame = useCurrentFrame();
  const scan = prog(frame, DESK.scan, DESK.scanLen, linear);
  const scanning = frame >= DESK.scan && scan < 1;
  // Scan line position in output px, measured from the top of the room grid.
  const lineY = (GRID_TOP + scan * (GRID_H + 24)) * ZOOM;
  const enter = prog(frame, DESK.grid, 14);

  const cleanOrInspected = (i: number): Status => (frame >= DESK.flips[i] ? 'INSPECTED' : 'CLEAN');
  const punchOf = (i: number) => (frame >= DESK.flips[i] ? prog(frame, DESK.flips[i], 8) : 1);

  return (
    <DiffLayout
      n={4}
      label="Front desk + housekeeping"
      sans="Runs the"
      serif="hotel."
      bg="ink"
      note={['Dirty · Clean · Inspected.', 'Five staff roles. One system.']}
      noteAt={DESK.note}
    >
      <div
        style={{
          position: 'absolute',
          left: MARGIN,
          top: VISUAL_TOP - 10,
          width: W,
          opacity: frame >= DESK.grid ? 1 : 0,
          transform: `translateY(${(1 - enter) * 80}px)`,
        }}
      >
        {/* Before the scan: every room dirty. */}
        <div style={{clipPath: `inset(${frame >= DESK.scan ? lineY : 0}px 0 0 0)`}}>
          <Screen width={W} viewport={VIEWPORT}>
            <Page statusOf={() => 'DIRTY'} />
          </Screen>
        </div>
        {/* Behind the scan line: cleaned, then inspected one by one. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: `inset(0 0 calc(100% - ${frame >= DESK.scan ? lineY : 0}px) 0)`,
          }}
        >
          <Screen width={W} viewport={VIEWPORT}>
            <Page statusOf={cleanOrInspected} punchOf={punchOf} />
          </Screen>
        </div>
        {scanning ? (
          <div
            style={{
              position: 'absolute',
              left: -24,
              right: -24,
              top: lineY - 4,
              height: 8,
              background: LIME,
            }}
          />
        ) : null}
      </div>
    </DiffLayout>
  );
};
