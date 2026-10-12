import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, F} from '../theme.ts';
import {FPS, LINES, type SceneId, SCENES} from '../timeline.ts';
import {type LineId, VO} from '../vo.ts';

type Word = {word: string; start: number; end: number};

/** Lines whose words are already on screen as kinetic type. */
const NO_CAPTION: ReadonlySet<LineId> = new Set<LineId>(['n_turn', 'n_close']);

const SPEAKER_TAG: Record<string, string | null> = {
  owner: 'Front desk',
  caller: 'Guest · on the phone',
  narrator: null,
};

/** Where captions sit, and on what, in each scene. */
const PLACE: Record<SceneId, {y: number; tone: 'night' | 'day'}> = {
  call: {y: 580, tone: 'night'},
  hold: {y: 1600, tone: 'night'},
  turn: {y: 1600, tone: 'night'},
  rewind: {y: 1600, tone: 'night'},
  book: {y: 1610, tone: 'night'},
  avail: {y: 1620, tone: 'day'},
  rates: {y: 1620, tone: 'day'},
  house: {y: 1620, tone: 'day'},
  desk: {y: 1620, tone: 'day'},
  changes: {y: 1620, tone: 'day'},
  roles: {y: 1620, tone: 'day'},
  night: {y: 1600, tone: 'night'},
  cta: {y: 1640, tone: 'night'},
};

/** Two to three words per caption, never across a sentence or clause break. */
const chunk = (words: readonly Word[]): Word[][] => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    const chars = cur.reduce((n, x) => n + x.word.length + 1, 0);
    if (cur.length >= 3 || chars > 17 || /[.,!?]["”]?$/.test(w.word)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
};

/** Social-style burned-in captions with the spoken word lit. */
export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const line = LINES.find((l) => t >= l.at && t < l.at + VO[l.id].duration + 0.12);
  if (!line || NO_CAPTION.has(line.id)) return null;

  const scene = [...SCENES].reverse().find((s) => frame >= s.from) ?? SCENES[0];
  const place = PLACE[scene.id];
  const vo = VO[line.id];
  const local = t - line.at;
  const chunks = chunk(vo.words);
  let ci = chunks.findIndex((c) => local < c[c.length - 1].end + 0.04);
  if (ci < 0) ci = chunks.length - 1;
  const current = chunks[ci];
  const chunkStartFrame = Math.round((line.at + current[0].start) * FPS);
  const pop = Math.min(1, (frame - chunkStartFrame + 1) / 4);
  const tag = SPEAKER_TAG[vo.speaker];
  const night = place.tone === 'night';

  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top: place.y,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
        pointerEvents: 'none',
      }}
    >
      {tag ? (
        <div
          style={{
            fontFamily: F.display,
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '8px 20px',
            borderRadius: 999,
            background: vo.speaker === 'owner' ? C.amber : 'rgba(255,255,255,0.14)',
            color: vo.speaker === 'owner' ? C.navy : C.white,
            border: vo.speaker === 'owner' ? 'none' : '2px solid rgba(255,255,255,0.5)',
          }}
        >
          {tag}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: F.display,
          fontWeight: 800,
          fontSize: 82,
          lineHeight: 1.04,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          color: night ? C.white : C.navy,
          transform: `scale(${0.9 + 0.1 * pop})`,
          paintOrder: 'stroke fill',
          WebkitTextStroke: night ? `10px ${C.nightDeep}` : `14px ${C.cream}`,
          background: night ? 'rgba(7,13,27,0.82)' : 'transparent',
          borderRadius: 30,
          padding: night ? '14px 30px 20px' : 0,
        }}
      >
        {current.map((w, i) => {
          const active = local >= w.start - 0.03 && local < (current[i + 1]?.start ?? w.end + 0.2);
          return (
            <span key={i} style={{color: active ? C.amber : undefined}}>
              {w.word.replace(/"/g, '')}
              {i < current.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
};
