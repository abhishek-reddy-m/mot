import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {NightDesk} from '../components/NightDesk.tsx';
import {Phone} from '../components/Phone.tsx';
import {headline, Slap} from '../components/Type.tsx';
import {NewBookingRow} from '../mockups.tsx';
import {Screen} from '../../mockups/ui.tsx';
import {APP} from '../../theme.ts';
import {C, M} from '../theme.ts';
import {at, prog, rel} from '../timeline.ts';

/** 11:47 PM again: the phone stays dark. Morning: the booking is waiting. */
export const NightScene: React.FC = () => {
  const frame = useCurrentFrame();
  const morning = rel(at('morning'), 'night');
  const isMorning = frame >= morning;
  const rowIn = prog(frame, morning + 6, 12);

  if (!isMorning) {
    return (
      <AbsoluteFill style={{background: C.night}}>
        <NightDesk lampOn={false} showLamp={false} />
        <AbsoluteFill style={{background: 'rgba(7,13,27,0.35)'}} />
        <div style={{position: 'absolute', left: 305, top: 1180}}>
          <Phone width={470} screenBg="#050608" darkStatus time="">
            <div />
          </Phone>
        </div>
        <div style={{position: 'absolute', left: M, right: M, top: 870, ...headline, fontSize: 112, color: C.white}}>
          <Slap at={4} style={{transformOrigin: 'left center'}}>
            11:47 PM.
          </Slap>
          <Slap at={14} style={{transformOrigin: 'left center'}}>
            <span style={{color: C.amber}}>No call.</span>
          </Slap>
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill>
      <NightDesk day lampOn={false} showLamp={false} clock="7:02" ampm="AM" />
      <div style={{position: 'absolute', left: M, right: M, top: 870, ...headline, fontSize: 112, color: C.white}}>
        <Slap at={morning + 2} style={{transformOrigin: 'left center'}}>
          7:02 AM.
        </Slap>
        <Slap at={morning + 12} style={{transformOrigin: 'left center'}}>
          <span style={{color: C.amber}}>Already booked.</span>
        </Slap>
      </div>
      <div
        style={{
          position: 'absolute',
          left: M,
          top: 1160,
          width: 1080 - 2 * M,
          borderRadius: 26,
          overflow: 'hidden',
          background: APP.gray50,
          boxShadow: '0 30px 70px rgba(0,0,0,0.35)',
          opacity: rowIn,
          transform: `translateY(${(1 - rowIn) * 120}px)`,
        }}
      >
        <Screen width={1080 - 2 * M} viewport={560}>
          <NewBookingRow highlight={frame >= morning + 18} />
        </Screen>
      </div>
    </AbsoluteFill>
  );
};
