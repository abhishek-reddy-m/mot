import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';


/** Deterministic per-frame PRNG so every render of a frame is identical. */
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * Animated film grain over everything. Noise is drawn at 1/`size` resolution
 * and scaled up, so grains are chunkier, like film, and the encoder has less
 * random detail to spend bits on.
 */
export const Grain: React.FC<{opacity?: number; size?: number; hold?: number}> = ({
  opacity = 0.11,
  size = 2,
  hold = 1,
}) => {
  // `hold` > 1 refreshes the pattern every `hold` frames ("on twos").
  const frame = Math.floor(useCurrentFrame() / hold);
  const ref = useRef<HTMLCanvasElement>(null);
  const W = Math.round(1080 / size);
  const H = Math.round(1920 / size);

  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(W, H);
    const rand = mulberry32(frame * 7919 + 17);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = rand() * 255;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [frame, W, H]);

  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity}}>
      <canvas ref={ref} width={W} height={H} style={{width: '100%', height: '100%'}} />
    </AbsoluteFill>
  );
};
