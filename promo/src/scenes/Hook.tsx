import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Highlight, Rise, Rule, Typed} from '../components/Kinetic.tsx';
import {HOOK_ASIDE} from '../facts.ts';
import {HEADLINE, INK, MARGIN, MONO, PAPER, SERIF, SERIF_SCALE} from '../theme.ts';
import {HOOK} from '../timeline.ts';

/** "Yes, it's another booking site." — the honest hook. */
export const Hook: React.FC = () => {
  const [l1, l2, l3, l4] = HOOK.lines;
  return (
    <AbsoluteFill style={{background: PAPER, color: INK}}>
      <div style={{position: 'absolute', left: MARGIN, right: MARGIN, top: 330, ...HEADLINE, fontSize: 228}}>
        <Rise at={l1}>Yes, it’s</Rise>
        <Rise at={l2}>
          <span style={{...SERIF, fontSize: `${SERIF_SCALE}em`}}>
            <Highlight at={HOOK.swipe} dur={HOOK.swipeLen}>
              another
            </Highlight>
          </span>
        </Rise>
        <Rise at={l3}>booking</Rise>
        <Rise at={l4}>site.</Rise>
      </div>

      <div style={{position: 'absolute', left: MARGIN, right: MARGIN, top: 1330}}>
        <Rule at={HOOK.swipe} dur={14} color={INK} />
        <div style={{...MONO, fontSize: 38, marginTop: 30, lineHeight: 1.3}}>
          <Typed text={HOOK_ASIDE.toUpperCase()} at={HOOK.typeStart} rate={HOOK.typeRate} cursorColor={INK} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
