import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {HUD_NAME, PLATFORMS} from '../facts.ts';
import {FONT, LIME, SURFACE} from '../theme.ts';
import {BEAT, FPS, SCENES, sceneAt} from '../timeline.ts';

const INSET = 40;
const ARM = 54;
const STROKE = 3;

const pad = (n: number) => String(n).padStart(2, '0');

const timecode = (frame: number) => {
  const ff = frame % FPS;
  const s = Math.floor(frame / FPS);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(ff)}`;
};

const Corner: React.FC<{color: string; pos: 'tl' | 'tr' | 'bl' | 'br'}> = ({color, pos}) => {
  const top = pos[0] === 't';
  const left = pos[1] === 'l';
  return (
    <div
      style={{
        position: 'absolute',
        width: ARM,
        height: ARM,
        [top ? 'top' : 'bottom']: INSET,
        [left ? 'left' : 'right']: INSET,
        [top ? 'borderTop' : 'borderBottom']: `${STROKE}px solid ${color}`,
        [left ? 'borderLeft' : 'borderRight']: `${STROKE}px solid ${color}`,
      }}
    />
  );
};

/** Camera-viewfinder HUD: name, blinking REC + timecode, scene counter, platforms. */
export const Hud: React.FC = () => {
  const frame = useCurrentFrame();
  const s = sceneAt(frame);
  const surface = SURFACE[s.bg];
  const color = surface.fg;
  const recOn = Math.floor(frame / BEAT) % 2 === 0;
  const dot = s.bg === 'ink' ? LIME : color;

  const text: React.CSSProperties = {
    position: 'absolute',
    fontFamily: FONT.mono,
    fontWeight: 500,
    fontSize: 22,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  };
  const edge = INSET + 26;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Corner color={color} pos="tl" />
      <Corner color={color} pos="tr" />
      <Corner color={color} pos="bl" />
      <Corner color={color} pos="br" />

      <div style={{...text, top: edge, left: edge}}>{HUD_NAME}</div>

      <div style={{...text, top: edge, right: edge, display: 'flex', alignItems: 'center', gap: 12}}>
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            background: recOn ? dot : 'transparent',
            border: `2px solid ${dot}`,
          }}
        />
        <span>REC</span>
        <span style={{fontVariantNumeric: 'tabular-nums'}}>{timecode(frame)}</span>
      </div>

      <div style={{...text, bottom: edge, left: edge, fontVariantNumeric: 'tabular-nums'}}>
        {pad(s.index + 1)} / {pad(SCENES.length)}
      </div>

      <div style={{...text, bottom: edge, right: edge}}>{PLATFORMS.join(' / ')}</div>
    </AbsoluteFill>
  );
};
