import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Ledger, NightDesk, Sticky, TextThread} from '../components/NightDesk.tsx';
import {CallScreen, Phone} from '../components/Phone.tsx';
import {headline, Slap} from '../components/Type.tsx';
import {C, F, M} from '../theme.ts';
import {at, FPS, prog, rel} from '../timeline.ts';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Hold time shown on the phone: runs fast, from 0:07 to 2:51. */
const holdClock = (frame: number, end: number) => 7 + (164 * Math.min(frame, end)) / Math.max(1, end);

const Super: React.FC<{at: number; lines: React.ReactNode[]}> = ({at: a, lines}) => (
  <div style={{position: 'absolute', left: M, right: M, top: 150}}>
    <Slap at={a} rotate={-2} style={{transformOrigin: 'left center'}}>
      <div style={{...headline, fontSize: 104, color: C.white}}>
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </Slap>
  </div>
);

const Amber: React.FC<{children: React.ReactNode}> = ({children}) => <span style={{color: C.amber}}>{children}</span>;

/** On hold: three everyday problems pile up, then the guest gives up. */
export const HoldScene: React.FC = () => {
  const frame = useCurrentFrame();
  const p1 = rel(at('p1'), 'hold');
  const p2 = rel(at('p2'), 'hold');
  const p3 = rel(at('p3'), 'hold');
  const holdEnd = rel(at('holdEnd'), 'hold');
  const hangup = rel(at('hangup'), 'hold');
  const lost = rel(at('lost'), 'hold');

  const back = prog(frame, holdEnd - 2, 10); // phone returns to center
  const pileOut = prog(frame, holdEnd - 4, 8);
  const callState = frame >= hangup ? 'ended' : frame >= holdEnd ? 'active' : 'hold';
  const seconds = frame >= holdEnd ? 171 + Math.min(frame, hangup) / FPS - holdEnd / FPS : holdClock(frame, holdEnd);

  // Phone: small in the corner while on hold, back to the middle after.
  const small = {x: 760, y: 1300, w: 250};
  const big = {x: 305, y: 600, w: 470};
  const w = small.w + (big.w - small.w) * back;
  const x = small.x + (big.x - small.x) * back;
  const y = small.y + (big.y - small.y) * back;

  return (
    <AbsoluteFill style={{background: C.night}}>
      <NightDesk showClock={false} />
      <AbsoluteFill style={{background: 'rgba(7,13,27,0.72)'}} />

      {/* The pile of problems */}
      <div style={{position: 'absolute', inset: 0, opacity: 1 - pileOut}}>
        {frame >= p1 ? (
          <div style={{position: 'absolute', left: 90, top: 560, transform: 'rotate(-4deg)'}}>
            <Slap at={p1}>
              <Ledger width={880} circleP={prog(frame, p1 + 8, 14)} />
            </Slap>
          </div>
        ) : null}
        {frame >= p2 ? (
          <div style={{position: 'absolute', left: 230, top: 640, transform: 'rotate(3deg)'}}>
            <Slap at={p2}>
              <TextThread width={680} shown={frame >= p2 + 16 ? 3 : frame >= p2 + 8 ? 2 : 1} />
            </Slap>
          </div>
        ) : null}
        {frame >= p3 ? (
          <div style={{position: 'absolute', left: 300, top: 780}}>
            <Slap at={p3} rotate={-6}>
              <Sticky width={480} rotate={-5} lines={['RATES', '$299 a night', '(every night)']} />
            </Slap>
          </div>
        ) : null}

        {frame >= p1 && frame < p2 ? <Super at={p1} lines={['Two names in', <Amber key="a">Room 12.</Amber>]} /> : null}
        {frame >= p2 && frame < p3 ? <Super at={p2} lines={['Is 104', <Amber key="a">even clean?</Amber>]} /> : null}
        {frame >= p3 ? <Super at={p3} lines={['Friday, priced', <Amber key="a">like a Tuesday.</Amber>]} /> : null}

        <div
          style={{
            position: 'absolute',
            left: M,
            top: 1380,
            fontFamily: F.display,
            fontWeight: 800,
            color: C.amber,
          }}
        >
          <div style={{fontSize: 34, letterSpacing: '0.08em'}}>ON HOLD</div>
          <div style={{fontSize: 120, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: C.white}}>{mmss(seconds)}</div>
        </div>
      </div>

      <div style={{position: 'absolute', left: x, top: y}}>
        <Phone width={w} screenBg="#15161A" darkStatus>
          <CallScreen width={w - Math.round(w * 0.056)} state={callState} timer={mmss(seconds)} />
        </Phone>
      </div>

      {frame >= lost ? (
        <AbsoluteFill style={{background: 'rgba(7,13,27,0.55)'}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 230, display: 'flex', justifyContent: 'center'}}>
            <Slap at={lost} rotate={-3}>
              <div style={{...headline, fontSize: 150, color: '#FF5A5F', textAlign: 'center'}}>Booking lost.</div>
            </Slap>
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
