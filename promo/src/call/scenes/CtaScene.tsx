import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CTA_URL} from '../../facts.ts';
import {FONT} from '../../theme.ts';
import {headline, RiseLine} from '../components/Type.tsx';
import {C, F, M} from '../theme.ts';
import {at, prog, rel, wordAt} from '../timeline.ts';
import {SpokenType} from './TurnScene.tsx';

const FEATURES = ['Online booking', 'Live availability', 'Nightly rates', 'Housekeeping', 'Front desk', 'Staff logins'];

/** "No more 'let me check.'" then the offer and where to see it. */
export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const ctaStart = rel(at('n_cta'), 'cta');
  const card = frame >= ctaStart;
  const live = rel(wordAt('n_cta', 'See'), 'cta');

  if (!card) {
    return (
      <AbsoluteFill style={{background: C.night}}>
        <SpokenType id="n_close" scene="cta" size={150} top={640} hot={[2, 3, 4]} lines={[[0, 1], [2, 3, 4]]} />
      </AbsoluteFill>
    );
  }

  const urlIn = prog(frame, live, 12);
  return (
    <AbsoluteFill style={{background: C.night, color: C.white}}>
      <div style={{position: 'absolute', left: M, right: M, top: 170}}>
        <div style={{...headline, fontSize: 112}}>
          <RiseLine at={ctaStart}>Your own</RiseLine>
          <RiseLine at={ctaStart + 4}>booking site</RiseLine>
          <RiseLine at={ctaStart + 8}>
            <span style={{color: C.amber}}>+ front desk.</span>
          </RiseLine>
        </div>
        <RiseLine at={ctaStart + 16} style={{marginTop: 34}}>
          <div style={{fontFamily: F.display, fontWeight: 700, fontSize: 46, color: 'rgba(255,255,255,0.8)'}}>
            For independent hotels &amp; motels.
          </div>
        </RiseLine>

        <div style={{display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 50}}>
          {FEATURES.map((f, i) => {
            const p = prog(frame, ctaStart + 22 + i * 5, 10);
            return (
              <div
                key={f}
                style={{
                  fontFamily: F.display,
                  fontWeight: 700,
                  fontSize: 36,
                  padding: '14px 26px',
                  borderRadius: 999,
                  border: '3px solid rgba(255,255,255,0.35)',
                  opacity: p,
                  transform: `scale(${0.85 + 0.15 * p})`,
                }}
              >
                {f}
              </div>
            );
          })}
        </div>

        <div style={{marginTop: 90, opacity: urlIn, transform: `translateY(${(1 - urlIn) * 40}px)`}}>
          <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 44, color: C.amber, marginBottom: 18}}>See it live</div>
          <div
            style={{
              display: 'inline-block',
              fontFamily: F.mono,
              fontWeight: 700,
              fontSize: 50,
              padding: '22px 34px',
              borderRadius: 22,
              background: C.white,
              color: C.navy,
            }}
          >
            {CTA_URL}
          </div>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 30, fontSize: 30, color: 'rgba(255,255,255,0.7)', fontFamily: F.ui}}>
            Demo property:
            <span style={{fontFamily: FONT.script, fontWeight: 700, fontSize: 48, color: C.white}}>Casa Blanca</span>
            <span style={{fontFamily: FONT.montserrat, fontWeight: 600, fontSize: 20, letterSpacing: '0.25em', color: C.white}}>HOTELS</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
