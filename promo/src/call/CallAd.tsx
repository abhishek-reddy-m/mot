import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, staticFile} from 'remotion';
import {loadFonts} from '../fonts.ts';
import {Captions} from './components/Captions.tsx';
import {BookScene} from './scenes/BookScene.tsx';
import {CallScene} from './scenes/CallScene.tsx';
import {CtaScene} from './scenes/CtaScene.tsx';
import {AvailScene, ChangesScene, DeskScene, HouseScene, RatesScene, RolesScene} from './scenes/Features.tsx';
import {HoldScene} from './scenes/HoldScene.tsx';
import {NightScene} from './scenes/NightScene.tsx';
import {RewindScene} from './scenes/RewindScene.tsx';
import {TurnScene} from './scenes/TurnScene.tsx';
import {type SceneId, SCENES} from './timeline.ts';

loadFonts();

const SCENE: Record<SceneId, React.FC> = {
  call: CallScene,
  hold: HoldScene,
  turn: TurnScene,
  rewind: RewindScene,
  book: BookScene,
  avail: AvailScene,
  rates: RatesScene,
  house: HouseScene,
  desk: DeskScene,
  changes: ChangesScene,
  roles: RolesScene,
  night: NightScene,
  cta: CtaScene,
};

export const CallAd: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {SCENES.map((s) => {
      const Scene = SCENE[s.id];
      return (
        <Sequence key={s.id} from={s.from} durationInFrames={s.duration} name={s.id}>
          <Scene />
        </Sequence>
      );
    })}
    <Captions />
    {withAudio ? <Html5Audio src={staticFile('call/mix.wav')} /> : null}
  </AbsoluteFill>
);
