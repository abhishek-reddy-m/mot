import React from 'react';
import {useCurrentFrame} from 'remotion';
import {LIME} from '../theme.ts';
import {expoOut, odometerSteps, prog, RISE} from '../timeline.ts';

/**
 * A line of type that slides up from behind a mask. The mask is padded so
 * descenders, italic overhang and highlighter bleed are not clipped at rest.
 */
export const Rise: React.FC<{
  at: number;
  dur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({at, dur = RISE, children, style}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, at, dur);
  const pad = '0.12em';
  return (
    <div
      style={{
        overflow: 'hidden',
        padding: pad,
        margin: `-${pad}`,
        ...style,
      }}
    >
      <div style={{transform: `translateY(${(1 - p) * 150}%)`}}>{children}</div>
    </div>
  );
};

/** Lime marker swipe drawn left to right behind a word. */
export const Highlight: React.FC<{
  at: number;
  dur?: number;
  children: React.ReactNode;
  color?: string;
  inset?: {top: string; bottom: string};
}> = ({at, dur = 10, children, color = LIME, inset = {top: '0.2em', bottom: '0.04em'}}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, at, dur);
  return (
    <span style={{position: 'relative', display: 'inline-block'}}>
      <span
        style={{
          position: 'absolute',
          left: '-0.06em',
          right: '-0.1em',
          top: inset.top,
          bottom: inset.bottom,
          background: color,
          transform: `scaleX(${p}) skewX(-6deg)`,
          transformOrigin: 'left center',
        }}
      />
      <span style={{position: 'relative'}}>{children}</span>
    </span>
  );
};

/** Hairline rule that draws itself left to right. */
export const Rule: React.FC<{
  at: number;
  dur?: number;
  color: string;
  thickness?: number;
  style?: React.CSSProperties;
}> = ({at, dur = 20, color, thickness = 2, style}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, at, dur);
  return (
    <div
      style={{
        height: thickness,
        background: color,
        transform: `scaleX(${p})`,
        transformOrigin: 'left center',
        ...style,
      }}
    />
  );
};

/** Text typed one character per `rate` frames, with a block cursor. */
export const Typed: React.FC<{
  text: string;
  at: number;
  rate?: number;
  cursorColor: string;
  style?: React.CSSProperties;
  /** Keep the cursor after typing finishes. */
  holdCursor?: boolean;
}> = ({text, at, rate = 1, cursorColor, style, holdCursor = true}) => {
  const frame = useCurrentFrame();
  if (frame < at) return <span style={style}>{' '}</span>;
  const n = Math.min(text.length, Math.floor((frame - at) / rate) + 1);
  const done = n >= text.length;
  const blinkOn = Math.floor(frame / 8) % 2 === 0;
  const showCursor = !done || (holdCursor && blinkOn);
  return (
    <span style={{whiteSpace: 'pre', ...style}}>
      {text.slice(0, n)}
      <span
        style={{
          display: 'inline-block',
          width: '0.58em',
          height: '1.05em',
          marginLeft: '0.06em',
          verticalAlign: '-0.18em',
          background: showCursor ? cursorColor : 'transparent',
        }}
      />
    </span>
  );
};

/**
 * Mechanical odometer: every digit column rolls through its own strip on the
 * expo-out curve and lands on the target. The rightmost columns spin furthest.
 */
export const Odometer: React.FC<{
  value: string;
  at: number;
  len: number;
  style?: React.CSSProperties;
}> = ({value, at, len, style}) => {
  const frame = useCurrentFrame();
  const t = Math.min(1, Math.max(0, (frame - at) / len));
  const e = expoOut(t);
  const chars = [...value];
  const digitIdx = chars.map((c, i) =>
    /\d/.test(c) ? chars.slice(i + 1).filter((x) => /\d/.test(x)).length : -1,
  );
  return (
    <span
      style={{
        display: 'inline-flex',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
        ...style,
      }}
    >
      {chars.map((c, i) => {
        if (digitIdx[i] < 0) {
          return (
            <span key={i} style={{display: 'inline-block', opacity: t > 0 ? 1 : 0}}>
              {c}
            </span>
          );
        }
        const steps = odometerSteps(Number(c), digitIdx[i]);
        const pos = e * steps;
        const strip = Array.from({length: steps + 1}, (_, k) => k % 10);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              height: '1em',
              overflow: 'hidden',
              position: 'relative',
              opacity: t > 0 ? 1 : 0,
            }}
          >
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                transform: `translateY(${-pos}em)`,
              }}
            >
              {strip.map((d, k) => (
                <span key={k} style={{height: '1em', lineHeight: 1}}>
                  {d}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
};

/**
 * Ticker: shows values[i] once frame >= at[i]; each change pushes the old
 * value up and out of the mask while the new one rises in.
 */
export const Flip: React.FC<{
  values: React.ReactNode[];
  at: number[];
  len?: number;
  style?: React.CSSProperties;
}> = ({values, at, len = 9, style}) => {
  const frame = useCurrentFrame();
  let idx = -1;
  for (let i = 0; i < at.length; i++) if (frame >= at[i]) idx = i;
  if (idx < 0) return <div style={{overflow: 'hidden', ...style}} />;
  const p = prog(frame, at[idx], len);
  const prev = idx > 0 ? values[idx - 1] : null;
  return (
    <div style={{position: 'relative', overflow: 'hidden', ...style}}>
      {prev !== null && p < 1 ? (
        <div style={{position: 'absolute', inset: 0, transform: `translateY(${-p * 110}%)`}}>
          {prev}
        </div>
      ) : null}
      <div style={{transform: `translateY(${(1 - p) * 110}%)`}}>{values[idx]}</div>
    </div>
  );
};
