import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, F} from '../theme.ts';

/** Neon flicker: mostly on, with a short stutter on a few frames. */
const flickerOn = (frame: number, seed: number) => {
  const k = (frame + seed * 37) % 97;
  return !(k === 11 || k === 13 || k === 52 || k === 53 || k === 55);
};

const Key: React.FC<{x: number; y: number; n: string; present: boolean}> = ({x, y, n, present}) => (
  <g transform={`translate(${x} ${y})`}>
    <circle cx="0" cy="0" r="7" fill="#C9A227" />
    {present ? (
      <>
        <circle cx="0" cy="20" r="11" fill="none" stroke="#C9A227" strokeWidth="4" />
        <rect x="-4" y="30" width="8" height="34" fill="#C9A227" />
        <rect x="-26" y="64" width="52" height="40" rx="6" fill="#EAD9B0" />
        <text x="0" y="92" textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="700" fontSize="20" fill="#5A3E1E">
          {n}
        </text>
      </>
    ) : null}
  </g>
);

/**
 * The front desk at 11:47 PM (or the morning after, with `day`). Drawn flat
 * at 1080x1920; children render on top in the same coordinates.
 */
export const NightDesk: React.FC<{
  clock?: string;
  ampm?: string;
  day?: boolean;
  lampOn?: boolean;
  /** Leave the lamp or the wall clock out where headline type sits over them. */
  showLamp?: boolean;
  showClock?: boolean;
  children?: React.ReactNode;
}> = ({clock = '11:47', ampm = 'PM', day = false, lampOn = true, showLamp = true, showClock = true, children}) => {
  const frame = useCurrentFrame();
  const neon = !day && flickerOn(frame, 1);
  const neonV = !day && flickerOn(frame, 4);
  return (
    <div style={{position: 'absolute', inset: 0, background: day ? '#2E4A78' : C.wall, overflow: 'hidden'}}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
        {/* wainscot */}
        <rect x="0" y="880" width="1080" height="300" fill={day ? '#34548A' : '#162746'} />
        <rect x="0" y="876" width="1080" height="8" fill={day ? '#4A6CA6' : C.wallTrim} />

        {/* window */}
        <rect x="60" y="140" width="590" height="690" rx="10" fill={day ? '#3F5F95' : '#1E3159'} />
        <rect x="80" y="160" width="550" height="650" fill={day ? '#B9DCF7' : C.windowSky} />
        {day ? (
          <>
            <circle cx="520" cy="270" r="70" fill="#FFF3C4" />
            <rect x="80" y="660" width="550" height="150" fill="#9CB9D8" />
          </>
        ) : (
          <>
            {[
              [130, 210],
              [260, 190],
              [410, 240],
              [560, 205],
              [480, 300],
              [180, 290],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 2 ? 2 : 3} fill="#DDE6FF" opacity={0.7} />
            ))}
            <rect x="80" y="690" width="550" height="120" fill="#0E1A36" />
            {/* parking lot lamp */}
            <rect x="575" y="420" width="8" height="300" fill="#24345A" />
            <rect x="545" y="410" width="60" height="14" rx="7" fill="#2C3E66" />
            <ellipse cx="575" cy="428" rx="34" ry="10" fill="#FFD48A" opacity="0.5" />
          </>
        )}
        {/* sign box */}
        <rect x="120" y="420" width="400" height="190" rx="18" fill={day ? '#5A6B8C' : '#0B1020'} stroke={day ? '#71819F' : '#2A1B2A'} strokeWidth="6" />

        {/* wall clock */}
        {showClock ? <rect x="700" y="200" width="310" height="190" rx="22" fill="#0A0E18" stroke="#273352" strokeWidth="6" /> : null}

        {/* key rack */}
        <rect x="712" y="470" width="290" height="330" rx="12" fill="#4A3322" />
        <rect x="712" y="470" width="290" height="22" rx="10" fill="#5B4130" />
        <Key x={770} y={520} n="101" present />
        <Key x={857} y={520} n="102" present={false} />
        <Key x={944} y={520} n="103" present />
        <Key x={770} y={660} n="104" present />
        <Key x={857} y={660} n="105" present />
        <Key x={944} y={660} n="106" present={false} />

        {/* desk */}
        <rect x="0" y="1150" width="1080" height="770" fill={C.desk} />
        {[180, 400, 620, 840].map((x) => (
          <rect key={x} x={x} y="1250" width="4" height="670" fill="#2C1C11" />
        ))}
        <rect x="0" y="1150" width="1080" height="90" fill={C.deskTop} />
        <rect x="0" y="1150" width="1080" height="7" fill={C.deskEdge} />

        {/* banker's lamp */}
        {showLamp ? (
          <>
            <rect x="150" y="1100" width="120" height="50" rx="10" fill="#B8912F" />
            <rect x="203" y="1030" width="14" height="72" fill="#B8912F" />
            <path d="M 80 1040 L 340 1040 L 300 970 L 120 970 Z" fill={lampOn ? '#1F6B4C' : '#1A4A37'} />
            <rect x="80" y="1036" width="260" height="10" fill={lampOn ? '#FFE3A3' : '#5C5040'} />
          </>
        ) : null}
      </svg>

      {/* warm light pool from the lamp */}
      {lampOn && showLamp && !day ? (
        <div
          style={{
            position: 'absolute',
            left: -240,
            top: 900,
            width: 900,
            height: 640,
            background: 'radial-gradient(closest-side, rgba(255,181,71,0.34), rgba(255,181,71,0))',
          }}
        />
      ) : null}

      {/* neon */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 420,
          width: 400,
          height: 190,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: F.display,
          fontWeight: 800,
          fontSize: 82,
          letterSpacing: '0.04em',
        }}
      >
        {'VACANCY'.split('').map((ch, i) => {
          const on = i === 0 ? neonV : neon;
          return (
            <span
              key={i}
              style={{
                color: on ? '#FFD1DC' : day ? '#8C93A8' : '#4A2232',
                textShadow: on
                  ? `0 0 6px ${C.neon}, 0 0 18px ${C.neon}, 0 0 40px ${C.neon}, 0 0 70px rgba(255,77,115,0.6)`
                  : 'none',
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>

      {/* clock face */}
      <div
        style={{
          display: showClock ? 'flex' : 'none',
          position: 'absolute',
          left: 700,
          top: 200,
          width: 310,
          height: 190,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          fontFamily: F.mono,
          fontWeight: 700,
          color: C.clockRed,
          textShadow: `0 0 14px rgba(255,106,61,0.75)`,
        }}
      >
        <span style={{fontSize: 92, letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums'}}>{clock}</span>
        <span style={{fontSize: 28, marginTop: 40}}>{ampm}</span>
      </div>

      {children}
    </div>
  );
};

/** The paper booking ledger, open on the desk. */
export const Ledger: React.FC<{
  width: number;
  circleP?: number;
  style?: React.CSSProperties;
}> = ({width, circleP = 0, style}) => {
  const h = width * 0.62;
  const rows: Array<[string, string]> = [
    ['Rm 7', 'Jones — Thu–Sat'],
    ['Rm 12', 'Smith — Fri–Sun'],
    ['Rm 12', 'Patel — Fri–Sat'],
    ['Rm 15', 'Garcia — Fri'],
    ['Rm 3', 'Nguyen — Sat'],
  ];
  const rowH = h / 7.2;
  return (
    <div
      style={{
        position: 'relative',
        width,
        height: h,
        background: C.paper,
        borderRadius: 10,
        boxShadow: '0 22px 40px rgba(0,0,0,0.45), inset -14px 0 30px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {Array.from({length: 7}, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: rowH * (i + 1.3),
            height: 2,
            background: C.paperLine,
          }}
        />
      ))}
      <div style={{position: 'absolute', left: width * 0.16, top: 0, bottom: 0, width: 2, background: '#E6A8A8'}} />
      <div
        style={{
          position: 'absolute',
          left: width * 0.05,
          top: rowH * 0.25,
          fontFamily: F.hand,
          fontWeight: 700,
          fontSize: rowH * 0.85,
          color: C.pen,
        }}
      >
        Fri Oct 16
      </div>
      {rows.map(([room, guest], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: width * 0.03,
            top: rowH * (i + 1.35),
            height: rowH,
            display: 'flex',
            alignItems: 'center',
            fontFamily: F.hand,
            fontWeight: 600,
            fontSize: rowH * 0.72,
            color: C.pen,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{width: width * 0.15}}>{room}</span>
          <span style={{marginLeft: width * 0.03}}>{guest}</span>
        </div>
      ))}
      {/* red pen ring around the double-booked room */}
      <svg
        width={width}
        height={h}
        viewBox={`0 0 ${width} ${h}`}
        style={{position: 'absolute', inset: 0}}
      >
        <ellipse
          cx={width * 0.36}
          cy={rowH * 3.85}
          rx={width * 0.36}
          ry={rowH * 1.25}
          fill="none"
          stroke={C.redPen}
          strokeWidth={width * 0.012}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - circleP}
          transform={`rotate(-4 ${width * 0.36} ${rowH * 3.85})`}
        />
        <text
          x={width * 0.76}
          y={rowH * 4.25}
          fontFamily="Caveat"
          fontWeight={700}
          fontSize={rowH * 1.3}
          fill={C.redPen}
          opacity={circleP > 0.9 ? 1 : 0}
        >
          ??
        </text>
      </svg>
    </div>
  );
};

/** A yellow sticky note in marker handwriting. */
export const Sticky: React.FC<{
  width: number;
  lines: string[];
  rotate?: number;
  style?: React.CSSProperties;
}> = ({width, lines, rotate = -3, style}) => (
  <div
    style={{
      width,
      padding: `${width * 0.1}px ${width * 0.09}px`,
      background: C.sticky,
      boxShadow: '0 18px 30px rgba(0,0,0,0.35)',
      transform: `rotate(${rotate}deg)`,
      fontFamily: F.hand,
      fontWeight: 700,
      color: '#3B2F12',
      boxSizing: 'border-box',
      ...style,
    }}
  >
    {lines.map((l, i) => (
      <div key={i} style={{fontSize: i === 0 ? width * 0.17 : width * 0.13, lineHeight: 1.1}}>
        {l}
      </div>
    ))}
  </div>
);

/** A text message thread from housekeeping. */
export const TextThread: React.FC<{width: number; shown: number}> = ({width, shown}) => {
  const msgs = ['is 104 clean??', 'guest is asking', 'nobody marked it'];
  return (
    <div
      style={{
        width,
        background: '#F2F2F7',
        borderRadius: 34,
        padding: 30,
        boxShadow: '0 22px 50px rgba(0,0,0,0.45)',
        fontFamily: F.ui,
        boxSizing: 'border-box',
      }}
    >
      <div style={{textAlign: 'center', fontSize: 26, color: '#6B6B73', marginBottom: 22, fontWeight: 600}}>
        Housekeeping
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start'}}>
        {msgs.slice(0, shown).map((m) => (
          <div
            key={m}
            style={{
              background: '#E5E5EA',
              color: '#111',
              fontSize: 40,
              padding: '16px 26px',
              borderRadius: 30,
              borderBottomLeftRadius: 8,
            }}
          >
            {m}
          </div>
        ))}
      </div>
    </div>
  );
};
