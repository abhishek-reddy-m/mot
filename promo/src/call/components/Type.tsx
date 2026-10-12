import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, F, M} from '../theme.ts';
import {EASE, prog} from '../timeline.ts';

/** Big text that slaps onto the screen: overshoots, settles. */
export const Slap: React.FC<{
  at: number;
  children: React.ReactNode;
  rotate?: number;
  style?: React.CSSProperties;
}> = ({at, children, rotate = 0, style}) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const p = prog(frame, at, 9, EASE.backOut);
  return (
    <div
      style={{
        transform: `scale(${1.35 - 0.35 * p}) rotate(${rotate * (2 - p)}deg)`,
        opacity: Math.min(1, (frame - at + 1) / 3),
        transformOrigin: 'center',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** A line that rises into place. */
export const RiseLine: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, children, style}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, at, 12);
  return (
    <div style={{overflow: 'hidden', padding: '0.06em 0.1em 0.14em', margin: '-0.06em -0.1em -0.14em', ...style}}>
      <div style={{transform: `translateY(${(1 - p) * 110}%)`}}>{children}</div>
    </div>
  );
};

export const headline: React.CSSProperties = {
  fontFamily: F.display,
  fontWeight: 800,
  letterSpacing: '-0.03em',
  lineHeight: 0.98,
};

/**
 * Layout for the six "here is how it works" scenes on warm paper: an eyebrow,
 * a two-line headline, and the problem from the call crossed out before the
 * product screen takes its place.
 */
export const FeatureLayout: React.FC<{
  eyebrow: string;
  title: [string, string];
  problem?: React.ReactNode;
  /** Frame the problem card is struck through, and the frame it leaves. */
  strikeAt?: number;
  exitAt?: number;
  children: React.ReactNode;
}> = ({eyebrow, title, problem, strikeAt = 4, exitAt = 14, children}) => {
  const frame = useCurrentFrame();
  const strike = prog(frame, strikeAt, 6);
  const exit = prog(frame, exitAt, 10);
  const enter = problem ? prog(frame, exitAt + 2, 14) : prog(frame, 2, 14);
  return (
    <AbsoluteFill style={{background: C.cream, color: C.navy}}>
      <div style={{position: 'absolute', left: M, right: M, top: 150}}>
        <RiseLine at={0}>
          <span
            style={{
              display: 'inline-block',
              fontFamily: F.display,
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '10px 20px',
              borderRadius: 999,
              background: C.navy,
              color: C.amber,
            }}
          >
            {eyebrow}
          </span>
        </RiseLine>
        <div style={{...headline, fontSize: 100, marginTop: 30}}>
          <RiseLine at={3}>{title[0]}</RiseLine>
          <RiseLine at={7}>{title[1]}</RiseLine>
        </div>
      </div>

      {problem && exit < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 640,
            display: 'flex',
            justifyContent: 'center',
            transform: `translate(${-exit * 700}px, ${-exit * 80}px) rotate(${-exit * 14}deg) scale(${1 - exit * 0.3})`,
            opacity: 1 - exit,
          }}
        >
          <div style={{position: 'relative'}}>
            {problem}
            <div
              style={{
                position: 'absolute',
                left: -30,
                right: -30,
                top: '50%',
                height: 16,
                marginTop: -8,
                background: C.redPen,
                borderRadius: 8,
                transform: `rotate(-6deg) scaleX(${strike})`,
                transformOrigin: 'left center',
              }}
            />
          </div>
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 90}px)`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
