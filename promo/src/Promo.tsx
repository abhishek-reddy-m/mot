import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile} from 'remotion';
import {Grain} from './components/Grain.tsx';
import {Hud} from './components/Hud.tsx';
import {loadFonts} from './fonts.ts';
import {Availability} from './scenes/Availability.tsx';
import {But} from './scenes/But.tsx';
import {Changes} from './scenes/Changes.tsx';
import {ColdOpen} from './scenes/ColdOpen.tsx';
import {Cta} from './scenes/Cta.tsx';
import {FrontDesk} from './scenes/FrontDesk.tsx';
import {Hook} from './scenes/Hook.tsx';
import {Rates} from './scenes/Rates.tsx';
import {type SceneId, SCENES} from './timeline.ts';

loadFonts();

const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  coldOpen: ColdOpen,
  hook: Hook,
  but: But,
  rates: Rates,
  availability: Availability,
  changes: Changes,
  frontDesk: FrontDesk,
  cta: Cta,
};

export type PromoProps = {withAudio?: boolean; grainOpacity?: number; grainSize?: number; grainHold?: number};

export const Promo: React.FC<PromoProps> = ({
  withAudio = true,
  // 3px grains at 9%, refreshed on twos: reads as film grain, and keeps the
  // delivery file a sane size (per-pixel grain every frame is ~4x the bitrate).
  grainOpacity = 0.09,
  grainSize = 3,
  grainHold = 2,
}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {/* Hard cuts: each scene owns its frames, nothing overlaps. */}
    {SCENES.map((s) => {
      const Scene = SCENE_COMPONENTS[s.id];
      return (
        <Sequence key={s.id} from={s.from} durationInFrames={s.duration} name={s.id}>
          <Scene />
        </Sequence>
      );
    })}
    <Hud />
    <Grain opacity={grainOpacity} size={grainSize} hold={grainHold} />
    {withAudio ? <Html5Audio src={staticFile('audio/soundtrack.wav')} /> : null}
  </AbsoluteFill>
);
