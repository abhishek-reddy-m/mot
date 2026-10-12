import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Rise, Rule} from '../components/Kinetic.tsx';
import {HEADLINE, LIME, MARGIN, MONO, SERIF, SERIF_SCALE, SURFACE} from '../theme.ts';
import {type Bg, DIFF} from '../timeline.ts';

/** Top of the area each differentiator's signature visual may use. */
export const VISUAL_TOP = 790;
/** Baseline area for the closing mono note. */
const NOTE_TOP = 1694;

/**
 * Magazine layout shared by the four differentiators: "0N / LABEL" in mono
 * over a hairline, then a two-line headline (sans word, serif-italic word).
 */
export const DiffLayout: React.FC<{
  n: number;
  label: string;
  sans: string;
  serif: string;
  bg: Bg;
  headSize?: number;
  /** One string per line; lines are broken by hand, never by the browser. */
  note: string | string[];
  noteAt: number;
  children: React.ReactNode;
}> = ({n, label, sans, serif, bg, headSize = 214, note, noteAt, children}) => {
  const s = SURFACE[bg];
  const serifColor = bg === 'ink' ? LIME : s.fg;
  return (
    <AbsoluteFill style={{background: s.bg, color: s.fg}}>
      <div style={{position: 'absolute', left: MARGIN, right: MARGIN, top: 196}}>
        <Rise at={DIFF.label}>
          <div style={{...MONO, fontSize: 30, lineHeight: 1}}>
            {String(n).padStart(2, '0')} / {label}
          </div>
        </Rise>
        <Rule at={DIFF.rule} dur={DIFF.ruleLen} color={s.fg} style={{marginTop: 26}} />
        <div style={{...HEADLINE, fontSize: headSize, marginTop: 44}}>
          <Rise at={DIFF.head[0]}>{sans}</Rise>
          <Rise at={DIFF.head[1]}>
            <span style={{...SERIF, fontSize: `${SERIF_SCALE}em`, color: serifColor}}>{serif}</span>
          </Rise>
        </div>
      </div>

      {children}

      <div style={{position: 'absolute', left: MARGIN, right: MARGIN, top: NOTE_TOP}}>
        <Rise at={noteAt}>
          <div style={{...MONO, fontSize: 27, lineHeight: 1.35, color: s.fg, whiteSpace: 'nowrap'}}>
            {(Array.isArray(note) ? note : [note]).map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </Rise>
      </div>
    </AbsoluteFill>
  );
};
