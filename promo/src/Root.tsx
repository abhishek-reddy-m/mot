import React from 'react';
import {Composition} from 'remotion';
import {CallAd} from './call/CallAd.tsx';
import * as Call from './call/timeline.ts';
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
    <Composition
      id="CallAd"
      component={CallAd}
      durationInFrames={Call.TOTAL_FRAMES}
      fps={Call.FPS}
      width={Call.WIDTH}
      height={Call.HEIGHT}
      defaultProps={{withAudio: true}}
    />
  </>
);
