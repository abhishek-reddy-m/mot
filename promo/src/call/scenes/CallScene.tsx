import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CallScreen, Phone} from '../components/Phone.tsx';
import {NightDesk} from '../components/NightDesk.tsx';
import {C} from '../theme.ts';
import {at, FPS, prog, rel, RING_BURSTS, RING_LEN} from '../timeline.ts';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** 11:47 PM. The desk phone rings; the owner picks up and has to "check". */
export const CallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const answer = rel(at('answer'), 'call');
  const ringing = frame < answer && RING_BURSTS.some((b) => frame >= b * FPS && frame < (b + RING_LEN) * FPS);
  const shakeX = ringing ? Math.sin(frame * 2.6) * 7 : 0;
  const shakeR = ringing ? Math.sin(frame * 3.1) * 1.4 : 0;
  // Slow push-in once the call connects.
  const push = prog(frame, answer, 90);
  const scale = 1 + 0.09 * push;
  const timer = mmss(Math.max(0, (frame - answer) / FPS));

  return (
    <AbsoluteFill style={{background: C.night}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: '540px 1300px'}}>
        <NightDesk />
        <div
          style={{
            position: 'absolute',
            left: 305,
            top: 840,
            transform: `translateX(${shakeX}px) rotate(${shakeR}deg)`,
          }}
        >
          {ringing ? (
            <>
              {[-1, 1].map((side) => (
                <div
                  key={side}
                  style={{
                    position: 'absolute',
                    top: 330,
                    [side < 0 ? 'left' : 'right']: -86,
                    width: 60,
                    height: 300,
                    display: 'flex',
                    gap: 14,
                    flexDirection: side < 0 ? 'row-reverse' : 'row',
                  }}
                >
                  {[0, 1].map((k) => (
                    <div
                      key={k}
                      style={{
                        width: 22,
                        height: 140 + k * 60,
                        alignSelf: 'center',
                        borderRadius: 999,
                        border: `6px solid ${C.amber}`,
                        [side < 0 ? 'borderRight' : 'borderLeft']: 'none',
                        opacity: (frame + k * 4) % 8 < 5 ? 0.9 : 0.35,
                      }}
                    />
                  ))}
                </div>
              ))}
            </>
          ) : null}
          <Phone width={470} screenBg="#15161A" darkStatus>
            <CallScreen width={442} state={frame < answer ? 'incoming' : 'active'} timer={timer} />
          </Phone>
        </div>
      </div>
    </AbsoluteFill>
  );
};
