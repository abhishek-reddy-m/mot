import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Odometer, Rise, Rule} from '../components/Kinetic.tsx';
import {fmtMoney, STAY_NIGHTS, STAY_TOTAL} from '../facts.ts';
import {HEADLINE, INK, LIME, MARGIN, MONO, PAPER, SURFACE} from '../theme.ts';
import {RATES} from '../timeline.ts';
import {DiffLayout, VISUAL_TOP} from './DiffLayout.tsx';

const dim = SURFACE.ink.dim;

/** 01 — each night carries its own rate; the total is just their sum. */
export const Rates: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <DiffLayout
      n={1}
      label="Nightly rates"
      sans="Priced"
      serif="nightly."
      bg="ink"
      note="Each night at its own rate. No booking fees."
      noteAt={RATES.note}
    >
      <div style={{position: 'absolute', left: MARGIN, right: MARGIN, top: VISUAL_TOP}}>
        {STAY_NIGHTS.map((night, i) => {
          const at = RATES.rows[i];
          return (
            <div key={night.date} style={{opacity: frame >= at ? 1 : 0}}>
              <div style={{display: 'flex', alignItems: 'center', height: 156}}>
                <Rise at={at} dur={12}>
                  <div style={{...MONO, fontSize: 32, display: 'flex', gap: 18, alignItems: 'center'}}>
                    <span style={{color: PAPER, fontWeight: 700}}>{night.day}</span>
                    <span style={{color: dim}}>{night.date}</span>
                    {night.weekend ? (
                      <span
                        style={{
                          fontSize: 20,
                          padding: '7px 12px 6px',
                          background: LIME,
                          color: INK,
                          fontWeight: 700,
                        }}
                      >
                        Weekend
                      </span>
                    ) : null}
                  </div>
                </Rise>
                <div style={{flex: 1}} />
                <Odometer
                  value={fmtMoney(night.rate)}
                  at={at}
                  len={RATES.rollLen}
                  style={{...HEADLINE, fontSize: 112, color: PAPER}}
                />
              </div>
              {i < STAY_NIGHTS.length - 1 ? <Rule at={at + 2} dur={14} color={dim} /> : null}
            </div>
          );
        })}

        <Rule at={RATES.totalRule} dur={14} color={LIME} thickness={6} style={{marginTop: 4}} />
        <div style={{display: 'flex', alignItems: 'flex-end', marginTop: 34, opacity: frame >= RATES.total ? 1 : 0}}>
          <Rise at={RATES.total} dur={12}>
            <div style={{...MONO, fontSize: 32, color: LIME, lineHeight: 1.3}}>
              <div style={{fontWeight: 700}}>Total</div>
              <div>3 nights</div>
            </div>
          </Rise>
          <div style={{flex: 1}} />
          <Odometer
            value={fmtMoney(STAY_TOTAL)}
            at={RATES.total}
            len={RATES.totalRollLen}
            style={{...HEADLINE, fontSize: 150, color: LIME}}
          />
        </div>
      </div>
    </DiffLayout>
  );
};
