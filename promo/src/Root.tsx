import React from 'react';
import {Composition} from 'remotion';
import {Promo} from './Promo.tsx';
import {FPS, HEIGHT, TOTAL_FRAMES, WIDTH} from './timeline.ts';

export const Root: React.FC = () => (
  <>
    <Composition
      id="Promo"
      component={Promo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{withAudio: true}}
    />
  </>
);
