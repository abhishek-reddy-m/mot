import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Flip, Rise, Rule} from '../components/Kinetic.tsx';
import {AVAIL_STEPS, ROOM} from '../facts.ts';
import {APP, FONT, HEADLINE, INK, MARGIN, MONO, SURFACE} from '../theme.ts';
import {AVAIL, prog} from '../timeline.ts';
import {DiffLayout, VISUAL_TOP} from './DiffLayout.tsx';

const dim = SURFACE.paper.dim;

/** 02 — per-night counts that step down until the room is gone. */
export const Availability: React.FC = () => {
  const frame = useCurrentFrame();
  let step = -1;
  AVAIL.steps.forEach((f, i) => {
    if (frame >= f) step = i;
  });
  const left = step >= 0 ? AVAIL_STEPS[step].left : ROOM.totalRooms;
  const stamp = prog(frame, AVAIL.stamp, 8);

  return (
    <DiffLayout
      n={2}
      label="Live availability"
      sans="Live"
      serif="counts."
      bg="paper"
      note="Counted per night. Sold out means sold out."
      noteAt={AVAIL.note}
    >
      <div style={{position: 'absolute', left: MARGIN, right: MARGIN, top: VISUAL_TOP}}>
        <Rise at={AVAIL.roomTag} dur={12}>
          <div style={{...MONO, fontSize: 28, display: 'flex', justifyContent: 'space-between'}}>
            <span style={{fontWeight: 700}}>{ROOM.name}</span>
            <span style={{color: dim}}>{ROOM.totalRooms} rooms</span>
          </div>
        </Rise>
        <Rule at={AVAIL.roomTag + 2} dur={14} color={INK} style={{marginTop: 22}} />

        <Flip
          at={AVAIL.steps}
          len={AVAIL.stepLen}
          style={{...MONO, fontSize: 54, fontWeight: 700, height: 70, marginTop: 40}}
          values={AVAIL_STEPS.map((s) => (
            <span key={s.date}>
              {s.day} <span style={{fontWeight: 400, color: dim}}>{s.date}</span>
            </span>
          ))}
        />

        <Flip
          at={AVAIL.steps}
          len={AVAIL.stepLen}
          style={{...HEADLINE, fontSize: 360, height: 336, marginTop: 14, fontVariantNumeric: 'tabular-nums'}}
          values={AVAIL_STEPS.map((s) => (
            <span key={s.date}>
              {s.left}
              <span style={{color: dim}}>/{ROOM.totalRooms}</span>
            </span>
          ))}
        />

        <div style={{height: 104, display: 'flex', alignItems: 'center'}}>
          {frame >= AVAIL.stamp ? (
            // The room card's real "Not Available" badge (destructive variant, text-lg py-1 px-3).
            <div
              style={{
                fontFamily: FONT.app,
                fontSize: 18 * 2.4,
                lineHeight: `${28 * 2.4}px`,
                fontWeight: 600,
                padding: `${4 * 2.4}px ${12 * 2.4}px`,
                borderRadius: 6 * 2.4,
                background: APP.destructive,
                color: APP.destructiveFg,
                transformOrigin: 'left center',
                transform: `rotate(-3deg) scale(${1.45 - 0.45 * stamp})`,
              }}
            >
              Not Available
            </div>
          ) : null}
        </div>

        <div style={{display: 'flex', gap: 12, marginTop: 20}}>
          {Array.from({length: ROOM.totalRooms}, (_, i) => {
            const booked = i >= left;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 74,
                  border: `3px solid ${INK}`,
                  background: booked ? INK : 'transparent',
                  opacity: frame >= AVAIL.roomTag ? 1 : 0,
                }}
              />
            );
          })}
        </div>
        <div style={{...MONO, fontSize: 22, color: dim, marginTop: 14, display: 'flex', justifyContent: 'space-between'}}>
          <span>Rooms left</span>
          <span>Booked</span>
        </div>
      </div>
    </DiffLayout>
  );
};
