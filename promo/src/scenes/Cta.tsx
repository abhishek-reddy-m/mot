import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Highlight, Rise, Rule, Typed} from '../components/Kinetic.tsx';
import {BRAND, BRAND_SUFFIX, CTA_URL, PLATFORMS, PRICE_LINES} from '../facts.ts';
import {FONT, HEADLINE, INK, MARGIN, MONO, PAPER, SERIF, SERIF_SCALE} from '../theme.ts';
import {CTA, prog} from '../timeline.ts';

/** Callback to the hook, then wordmark, price, platforms and URL. */
export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const [l1, l2, l3] = CTA.lines;
  return (
    <AbsoluteFill style={{background: PAPER, color: INK}}>
      <div style={{position: 'absolute', left: MARGIN, right: MARGIN, top: 250, ...HEADLINE}}>
        <Rise at={l1} style={{fontSize: 210}}>
          <span style={{...SERIF, fontSize: `${SERIF_SCALE}em`}}>
            <Highlight at={CTA.swipe} dur={CTA.swipeLen}>
              Another
            </Highlight>
          </span>
        </Rise>
        <Rise at={l2} style={{fontSize: 122}}>
          booking site.
        </Rise>
        <Rise at={l3} style={{fontSize: 160, marginTop: 18, whiteSpace: 'nowrap'}}>
          Just better.
        </Rise>
      </div>

      <div style={{position: 'absolute', left: MARGIN, right: MARGIN, bottom: 196}}>
        <Rule at={CTA.rule} dur={CTA.ruleLen} color={INK} />

        <div style={{display: 'flex', alignItems: 'flex-end', gap: 22, marginTop: 52, whiteSpace: 'nowrap'}}>
          <Rise at={CTA.wordmark}>
            {/* The app's logotype: Dancing Script + Montserrat (src/components/Navigation.tsx) */}
            <div style={{fontFamily: FONT.script, fontWeight: 700, fontSize: 156, lineHeight: 1}}>{BRAND}</div>
          </Rise>
          <Rise at={CTA.wordmark + 4}>
            <div
              style={{
                fontFamily: FONT.montserrat,
                fontWeight: 600,
                fontSize: 30,
                letterSpacing: '0.3em',
                paddingBottom: 27,
              }}
            >
              {BRAND_SUFFIX}
            </div>
          </Rise>
        </div>

        <Rise at={CTA.price} style={{marginTop: 54}}>
          <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 50, letterSpacing: '-0.03em', lineHeight: 1.1}}>
            {PRICE_LINES.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </Rise>

        <div style={{display: 'flex', gap: 16, marginTop: 50}}>
          {PLATFORMS.map((p, i) => {
            const at = CTA.pills[i];
            const s = prog(frame, at, 8);
            return (
              <div
                key={p}
                style={{
                  ...MONO,
                  fontSize: 28,
                  fontWeight: 700,
                  padding: '16px 28px 15px',
                  border: `3px solid ${INK}`,
                  borderRadius: 999,
                  opacity: frame >= at ? 1 : 0,
                  transform: `scale(${1.25 - 0.25 * s})`,
                  transformOrigin: 'left center',
                }}
              >
                {p}
              </div>
            );
          })}
        </div>

        <div style={{...MONO, textTransform: 'none', fontSize: 46, fontWeight: 700, marginTop: 70}}>
          <Typed text={CTA_URL} at={CTA.typeStart} rate={CTA.typeRate} cursorColor={INK} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
