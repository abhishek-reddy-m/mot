import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {HEADLINE, INK, LIME, MARGIN} from '../theme.ts';
import {BUT, prog} from '../timeline.ts';

/** Full-bleed lime card. One word. */
export const But: React.FC = () => {
  const frame = useCurrentFrame();
  const p = prog(frame, BUT.punch, BUT.punchLen);
  return (
    <AbsoluteFill style={{background: LIME}}>
      <div
        style={{
          position: 'absolute',
          left: MARGIN,
          bottom: 300,
          ...HEADLINE,
          fontSize: 500,
          color: INK,
          transformOrigin: 'left bottom',
          transform: `scale(${1.22 - 0.22 * p})`,
        }}
      >
        But.
      </div>
    </AbsoluteFill>
  );
};
