import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {headline} from '../components/Type.tsx';
import {C, M} from '../theme.ts';
import {at, EASE, FPS, prog, rel, type SceneId} from '../timeline.ts';
import {type LineId, VO} from '../vo.ts';

const curly = (w: string) => w.replace(/^"/, '“').replace(/"([.,!?]?)$/, '”$1');

/**
 * Word-by-word kinetic type locked to a voice line: each word lands as it is
 * spoken. `lines` groups word indices into hand-set lines; `hot` words are amber.
 */
export const SpokenType: React.FC<{
  id: LineId;
  scene: SceneId;
  lines: number[][];
  hot: number[];
  size: number;
  top: number;
}> = ({id, scene, lines, hot, size, top}) => {
  const frame = useCurrentFrame();
  const words = VO[id].words;
  const lineStart = rel(at(id), scene);
  return (
    <div style={{position: 'absolute', left: M, right: M, top, ...headline, fontSize: size, color: C.white}}>
      {lines.map((idxs, li) => (
        <div key={li} style={{whiteSpace: 'nowrap'}}>
          {idxs.map((wi, k) => {
            const f = lineStart + Math.round(words[wi].start * FPS) - 1;
            if (frame < f) return <span key={wi} style={{opacity: 0}}>{curly(words[wi].word)} </span>;
            const p = prog(frame, f, 7, EASE.backOut);
            return (
              <span
                key={wi}
                style={{
                  display: 'inline-block',
                  color: hot.includes(wi) ? C.amber : undefined,
                  transform: `translateY(${(1 - p) * 0.3}em) scale(${0.8 + 0.2 * p})`,
                  opacity: Math.min(1, (frame - f + 1) / 2),
                  marginRight: k < idxs.length - 1 ? '0.24em' : 0,
                }}
              >
                {curly(words[wi].word)}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** "Every 'let me check' is a guest booking somewhere else." */
export const TurnScene: React.FC = () => (
  <AbsoluteFill style={{background: C.night}}>
    <SpokenType
      id="n_turn"
      scene="turn"
      size={112}
      top={560}
      hot={[1, 2, 3]}
      lines={[[0], [1, 2, 3], [4, 5, 6], [7], [8, 9]]}
    />
  </AbsoluteFill>
);
