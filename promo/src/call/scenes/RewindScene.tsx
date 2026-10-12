import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {NightDesk} from '../components/NightDesk.tsx';
import {type CallState, CallScreen, Phone} from '../components/Phone.tsx';
import {headline, Slap} from '../components/Type.tsx';
import {RoomCard, SiteNav} from '../mockups.tsx';
import {Screen} from '../../mockups/ui.tsx';
import {APP} from '../../theme.ts';
import {C, F, M} from '../theme.ts';
import {at, prog, rel, wordAt} from '../timeline.ts';

const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** VHS rewind back to 11:47, then the same night with a booking site. */
export const RewindScene: React.FC = () => {
  const frame = useCurrentFrame();
  const end = rel(at('rewindEnd'), 'rewind');
  const rewinding = frame < end;
  const r = Math.min(1, frame / Math.max(1, end));
  const minute = 51 - Math.min(4, Math.floor(r * 4.999));
  const states: CallState[] = ['ended', 'hold', 'active', 'incoming'];
  const state = states[Math.min(3, Math.floor(r * 4))];

  const night = rel(wordAt('n_rewind', 'night'), 'rewind');
  const guest = rel(wordAt('n_rewind', 'guest'), 'rewind');
  const but = rel(wordAt('n_rewind', 'But'), 'rewind');
  const site = rel(wordAt('n_rewind', 'booking'), 'rewind');
  const rise = prog(frame, but, 14);
  const loaded = frame >= site;

  return (
    <AbsoluteFill style={{background: C.night, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: rewinding ? `translateX(${(hash(frame) - 0.5) * 26}px)` : undefined,
        }}
      >
        <NightDesk clock={`11:${String(rewinding ? minute : 47).padStart(2, '0')}`} />
        <div style={{position: 'absolute', left: 305, top: 840, opacity: rewinding ? 1 : 0}}>
          <Phone width={470} screenBg="#15161A" darkStatus>
            <CallScreen width={442} state={rewinding ? state : 'incoming'} timer="02:51" />
          </Phone>
        </div>
      </div>

      {rewinding ? (
        <>
          {/* tracking lines + tear bands */}
          <AbsoluteFill
            style={{
              background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 2px, rgba(0,0,0,0) 2px 5px)',
            }}
          />
          {[0, 1, 2].map((k) => {
            const y = ((hash(frame * 3 + k) * 1.2 - 0.1) * 1920) | 0;
            return (
              <div
                key={k}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: y,
                  height: 18 + k * 22,
                  background: 'rgba(230,236,255,0.18)',
                  transform: `translateX(${(hash(frame + k) - 0.5) * 120}px)`,
                }}
              />
            );
          })}
          <div
            style={{
              position: 'absolute',
              left: 70,
              top: 90,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              fontFamily: F.mono,
              fontWeight: 700,
              fontSize: 54,
              color: C.white,
              textShadow: '3px 0 #FF3B6B, -3px 0 #3BE0FF',
            }}
          >
            <span style={{display: 'flex'}}>
              {[0, 1].map((k) => (
                <span
                  key={k}
                  style={{
                    width: 0,
                    height: 0,
                    borderTop: '22px solid transparent',
                    borderBottom: '22px solid transparent',
                    borderRight: `34px solid ${C.white}`,
                  }}
                />
              ))}
            </span>
            REWIND
          </div>
        </>
      ) : null}

      {!rewinding ? (
        <div style={{position: 'absolute', left: M, right: M, top: 620, ...headline, fontSize: 112, color: C.white, opacity: 1 - rise}}>
          <Slap at={night} rotate={-2} style={{transformOrigin: 'left center'}}>
            Same night.
          </Slap>
          <Slap at={guest} rotate={2} style={{transformOrigin: 'left center'}}>
            <span style={{color: C.amber}}>Same guest.</span>
          </Slap>
        </div>
      ) : null}

      {/* the guest's phone, now with the hotel's own booking site */}
      {frame >= but ? (
        <div
          style={{
            position: 'absolute',
            left: 290,
            top: 430,
            transform: `translateY(${(1 - rise) * 1200}px)`,
          }}
        >
          <Phone width={500} time="11:47">
            <div style={{position: 'absolute', inset: 0, background: APP.gray50, paddingTop: 50}}>
              <Screen width={472}>
                <SiteNav />
                {loaded ? (
                  <div style={{padding: '18px 16px'}}>
                    <div style={{fontSize: 28, lineHeight: '34px', fontWeight: 700, marginBottom: 4}}>Oceanview Resort</div>
                    <div style={{fontSize: 14, color: APP.gray600, marginBottom: 16}}>123 Coastal Highway, Malibu, CA 90265</div>
                    <RoomCard />
                  </div>
                ) : (
                  <div style={{padding: 16, display: 'flex', flexDirection: 'column', gap: 12}}>
                    {[70, 50, 100, 100].map((w, i) => (
                      <div key={i} style={{height: i > 1 ? 120 : 22, width: `${w}%`, borderRadius: 8, background: APP.gray200}} />
                    ))}
                  </div>
                )}
              </Screen>
            </div>
          </Phone>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
