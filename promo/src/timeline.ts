// Single source of truth for timing. The video (src/) and the soundtrack
// synth (scripts/make-audio.ts) both import this file, so every sound effect
// is scheduled on the same frame as the visual it belongs to.
//
// This module must stay dependency-free (no React, no Remotion): it is also
// executed directly by Node.

import {CTA_URL, HOOK_ASIDE} from './facts.ts';

export const FPS = 30;
export const BPM = 120;
/** One beat in frames: 60 / 120 BPM * 30 fps = 15. */
export const BEAT = (60 / BPM) * FPS;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export type Bg = 'paper' | 'ink' | 'lime';

const SCENE_DEFS = [
  {id: 'coldOpen', beats: 4, bg: 'ink'},
  {id: 'hook', beats: 4, bg: 'paper'},
  {id: 'but', beats: 2, bg: 'lime'},
  {id: 'rates', beats: 8, bg: 'ink'},
  {id: 'availability', beats: 8, bg: 'paper'},
  {id: 'changes', beats: 8, bg: 'lime'},
  {id: 'frontDesk', beats: 8, bg: 'ink'},
  {id: 'cta', beats: 8, bg: 'paper'},
] as const satisfies ReadonlyArray<{id: string; beats: number; bg: Bg}>;

export type SceneId = (typeof SCENE_DEFS)[number]['id'];

export type Scene = {
  id: SceneId;
  index: number;
  beats: number;
  bg: Bg;
  /** First frame of the scene. */
  from: number;
  /** Length in frames, always a whole number of beats. */
  duration: number;
};

export const SCENES: Scene[] = (() => {
  let from = 0;
  return SCENE_DEFS.map((s, index) => {
    const scene = {...s, index, from, duration: s.beats * BEAT};
    from += scene.duration;
    return scene;
  });
})();

export const TOTAL_FRAMES = SCENES.reduce((n, s) => n + s.duration, 0);

export const scene = (id: SceneId): Scene => {
  const s = SCENES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown scene ${id}`);
  return s;
};

export const sceneAt = (frame: number): Scene =>
  SCENES.find((s) => frame >= s.from && frame < s.from + s.duration) ??
  SCENES[SCENES.length - 1];

// ---------------------------------------------------------------------------
// Easing. The whole film uses one curve: cubic-bezier(0.16, 1, 0.3, 1).

export const cubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-7) return sampleY(t);
      const d = slopeX(t);
      if (Math.abs(d) < 1e-7) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 40; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-7) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
};

export const expoOut = cubicBezier(0.16, 1, 0.3, 1);

/** Constant speed, for scanner-style wipes that should read as they cross the frame. */
export const linear = (x: number) => x;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Eased 0→1 progress of an animation that starts at `start` and lasts `dur` frames. */
export const prog = (frame: number, start: number, dur: number, ease = expoOut) =>
  ease(clamp01((frame - start) / dur));

// ---------------------------------------------------------------------------
// Per-scene cue sheets. All frames are relative to the scene's first frame.

/** Lines rise from their masks this many frames apart. */
export const STAGGER = 5;
/** Frames a masked line takes to rise. */
export const RISE = 16;

export const COLD = {
  tilt: 0,
  tiltLen: 22,
  tapSelect: 22,
  scroll: 25,
  scrollLen: 14,
  tapBook: 43,
  success: 46,
};

export const HOOK = {
  lines: [0, 4, 8, 12],
  swipe: 13,
  swipeLen: 10,
  typeStart: 25,
  /** Frames per typed character. */
  typeRate: 1,
};

export const BUT = {punch: 0, punchLen: 9};

/** Shared layout cues for the four differentiator scenes. */
export const DIFF = {
  label: 0,
  rule: 2,
  ruleLen: 20,
  head: [4, 9],
};

export const RATES = {
  rows: [30, 45, 60],
  rollLen: 18,
  totalRule: 72,
  total: 78,
  totalRollLen: 22,
  note: 100,
};

export const AVAIL = {
  roomTag: 22,
  steps: [30, 45, 60, 75],
  stepLen: 9,
  stamp: 90,
  note: 100,
};

export const CHANGES = {
  card: 20,
  split: 40,
  splitLen: 28,
  banner: 70,
  note: 96,
};

export const DESK = {
  grid: 20,
  scan: 30,
  scanLen: 36,
  flips: [74, 78, 82, 86],
  note: 98,
};

export const CTA = {
  lines: [0, 5, 10],
  swipe: 10,
  swipeLen: 10,
  rule: 22,
  ruleLen: 18,
  wordmark: 26,
  price: 38,
  pills: [46, 50],
  typeStart: 58,
  typeRate: 1,
};

// ---------------------------------------------------------------------------
// Derived cue helpers used by both the visuals and the sound design.

/** Absolute frames of each typed character of the hook aside. */
export const hookTypeFrames = (): number[] =>
  [...HOOK_ASIDE].map((_, i) => scene('hook').from + HOOK.typeStart + i * HOOK.typeRate);

/** Absolute frames of each typed character of the CTA URL. */
export const ctaTypeFrames = (): number[] =>
  [...CTA_URL].map((_, i) => scene('cta').from + CTA.typeStart + i * CTA.typeRate);

/**
 * An odometer column travels `steps` digit positions over `len` frames on the
 * expo-out curve. Returns the (fractional) frames at which it passes each
 * digit, which is when a mechanical counter clicks.
 */
export const odometerClickFrames = (start: number, len: number, steps: number): number[] => {
  const out: number[] = [];
  const samples = 2000;
  let last = 0;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const pos = Math.floor(expoOut(t) * steps + 1e-9);
    if (pos > last) {
      for (let k = last + 1; k <= pos; k++) out.push(start + t * len);
      last = pos;
    }
  }
  return out;
};

/** How many digit positions each odometer column spins through (rightmost spins most). */
export const odometerSteps = (digit: number, indexFromRight: number) =>
  digit + 10 * Math.max(0, 3 - indexFromRight);
