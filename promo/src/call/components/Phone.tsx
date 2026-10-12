import React from 'react';
import {C, F} from '../theme.ts';

/** A generic smartphone: bezel, rounded screen, camera pill, status bar. */
export const Phone: React.FC<{
  width: number;
  children: React.ReactNode;
  screenBg?: string;
  time?: string;
  darkStatus?: boolean;
  style?: React.CSSProperties;
}> = ({width, children, screenBg = '#fff', time = '11:47', darkStatus = false, style}) => {
  const bezel = Math.round(width * 0.028);
  const height = Math.round(width * 2.06);
  const radius = width * 0.15;
  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: radius,
        background: '#0B0B0D',
        boxShadow: '0 0 0 3px #2B2B30, 0 40px 80px rgba(0,0,0,0.45)',
        padding: bezel,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: radius - bezel,
          overflow: 'hidden',
          background: screenBg,
        }}
      >
        <div style={{position: 'absolute', inset: 0}}>{children}</div>
        {/* status bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: width * 0.11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `0 ${width * 0.09}px`,
            fontFamily: F.ui,
            fontWeight: 600,
            fontSize: width * 0.04,
            color: darkStatus ? C.white : '#111',
          }}
        >
          <span>{time}</span>
          <span style={{display: 'flex', gap: width * 0.012, alignItems: 'flex-end'}}>
            {[0.35, 0.55, 0.75, 1].map((h, i) => (
              <span
                key={i}
                style={{
                  width: width * 0.008,
                  height: width * 0.03 * h,
                  background: darkStatus ? C.white : '#111',
                  borderRadius: 1,
                }}
              />
            ))}
            <span
              style={{
                width: width * 0.06,
                height: width * 0.028,
                border: `2px solid ${darkStatus ? C.white : '#111'}`,
                borderRadius: 4,
                marginLeft: width * 0.015,
                boxSizing: 'border-box',
                padding: 1,
              }}
            >
              <span style={{display: 'block', width: '70%', height: '100%', background: darkStatus ? C.white : '#111'}} />
            </span>
          </span>
        </div>
        {/* camera pill */}
        <div
          style={{
            position: 'absolute',
            top: width * 0.03,
            left: '50%',
            width: width * 0.28,
            height: width * 0.07,
            marginLeft: -width * 0.14,
            borderRadius: 999,
            background: '#000',
          }}
        />
      </div>
    </div>
  );
};

/** lucide "phone" glyph. */
export const Handset: React.FC<{size: number; color?: string; rotate?: number}> = ({size, color = '#fff', rotate = 0}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{transform: `rotate(${rotate}deg)`}}
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export type CallState = 'incoming' | 'active' | 'hold' | 'ended';

const RoundButton: React.FC<{size: number; bg: string; label?: string; children?: React.ReactNode}> = ({
  size,
  bg,
  label,
  children,
}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.14}}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
    {label ? (
      <div style={{fontFamily: F.ui, fontSize: size * 0.2, color: 'rgba(255,255,255,0.8)'}}>{label}</div>
    ) : null}
  </div>
);

/** The owner's call screen: incoming, in call, on hold, ended. */
export const CallScreen: React.FC<{width: number; state: CallState; timer: string}> = ({width, state, timer}) => {
  const status =
    state === 'incoming'
      ? 'Incoming call…'
      : state === 'hold'
        ? `On hold · ${timer}`
        : state === 'ended'
          ? `Call ended · ${timer}`
          : timer;
  const statusColor = state === 'hold' ? C.amber : state === 'ended' ? '#FF6B6B' : 'rgba(255,255,255,0.75)';
  const b = width * 0.19;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#15161A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: width * 0.26,
        fontFamily: F.ui,
        color: C.white,
      }}
    >
      <div
        style={{
          width: width * 0.26,
          height: width * 0.26,
          borderRadius: width,
          background: '#3A3D46',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: width * 0.12,
          fontWeight: 600,
          color: '#C9CCD6',
        }}
      >
        ?
      </div>
      <div style={{fontSize: width * 0.085, fontWeight: 600, marginTop: width * 0.06}}>Unknown</div>
      <div style={{fontSize: width * 0.045, color: 'rgba(255,255,255,0.6)', marginTop: width * 0.01}}>mobile</div>
      <div
        style={{
          fontSize: width * 0.05,
          marginTop: width * 0.05,
          color: statusColor,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 500,
        }}
      >
        {status}
      </div>

      <div style={{flex: 1}} />
      {state === 'incoming' ? (
        <div style={{display: 'flex', gap: width * 0.3, marginBottom: width * 0.3}}>
          <RoundButton size={b} bg="#FF3B30" label="Decline">
            <Handset size={b * 0.42} rotate={135} />
          </RoundButton>
          <RoundButton size={b} bg="#34C759" label="Accept">
            <Handset size={b * 0.42} />
          </RoundButton>
        </div>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: width * 0.24}}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: `${width * 0.07}px ${width * 0.1}px`}}>
            {['mute', 'keypad', 'speaker', 'add', state === 'hold' ? 'resume' : 'hold', 'notes'].map((l) => (
              <RoundButton
                key={l}
                size={width * 0.16}
                bg={l === 'resume' ? 'rgba(255,174,31,0.35)' : 'rgba(255,255,255,0.14)'}
                label={l}
              />
            ))}
          </div>
          <div style={{marginTop: width * 0.09, opacity: state === 'ended' ? 0.4 : 1}}>
            <RoundButton size={b} bg="#FF3B30">
              <Handset size={b * 0.42} rotate={135} />
            </RoundButton>
          </div>
        </div>
      )}
    </div>
  );
};
