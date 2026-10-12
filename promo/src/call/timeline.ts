// Timing for the "Let me check" ad. Everything is derived from the measured
// length of each voice line (src/call/vo.ts), so re-recording a line re-times
// the whole film. The video (src/call/) and the mixer
// (scripts/make-call-audio.ts) both read these cues.
//
// Dependency-free: Node runs this file directly.

import {type LineId, VO} from './vo.ts';

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export type SceneId =
  | 'call'
  | 'hold'
  | 'turn'
  | 'rewind'
  | 'book'
  | 'avail'
  | 'rates'
  | 'house'
  | 'desk'
  | 'changes'
  | 'roles'
  | 'night'
  | 'cta';

export type PlacedLine = {id: LineId; at: number};

const snap = (s: number) => Math.round(s * FPS) / FPS;

const lines: PlacedLine[] = [];
const starts: Array<{id: SceneId; at: number}> = [];
const marks: Record<string, number> = {};
let t = 0;

const scene = (id: SceneId) => {
  t = snap(t);
  starts.push({id, at: t});
};
const say = (id: LineId, after = 0.3) => {
  t = snap(t);
  lines.push({id, at: t});
  marks[id] = t;
  t += VO[id].duration + after;
};
const wait = (s: number) => {
  t += s;
};
const mark = (name: string) => {
  t = snap(t);
  marks[name] = t;
};

/** The owner's phone rings in two bursts (seconds into the film, 0.8 s each). */
export const RING_BURSTS = [0.15, 1.15];
export const RING_LEN = 0.8;

// 1. 11:47 PM. The phone rings; the owner answers.
scene('call');
mark('ring');
wait(2.1);
mark('answer');
wait(0.2);
say('owner_hello', 0.35);
say('caller_ask', 0.4);
say('owner_check', 0.25);

// 2. On hold. Three problems pile up; the caller gives up.
scene('hold');
mark('holdStart');
wait(0.3);
mark('p1');
wait(1.75);
mark('p2');
wait(1.75);
mark('p3');
wait(1.75);
mark('holdEnd');
say('caller_bail', 0.05);
mark('hangup');
wait(1.25);
mark('lost');
wait(1.3);

// 3. The point.
scene('turn');
wait(0.2);
say('n_turn', 0.6);

// 4. Rewind to 11:47 PM: this time the hotel has its own booking site.
scene('rewind');
mark('rewind');
wait(1.3);
mark('rewindEnd');
say('n_rewind', 0.3);

// 5. The guest books without calling.
scene('book');
say('n_book', 0.6);

// 6–11. Each problem from the hold, fixed; then what else comes with it.
scene('avail');
wait(0.55);
say('n_avail', 0.65);
scene('rates');
wait(0.45);
say('n_rates', 0.6);
scene('house');
wait(0.45);
say('n_house', 0.6);
scene('desk');
wait(0.2);
say('n_desk', 0.55);
scene('changes');
wait(0.2);
say('n_changes', 0.55);
scene('roles');
wait(0.2);
say('n_roles', 0.6);

// 12. Same hour, no call. Next morning, the booking is waiting.
scene('night');
mark('quiet');
wait(2.1);
mark('morning');
wait(2.3);

// 13. Close.
scene('cta');
say('n_close', 0.4);
say('n_cta', 0.3);
mark('endCard');
wait(3.2);

export const DURATION = snap(t);
export const TOTAL_FRAMES = Math.round(DURATION * FPS);
export const LINES: readonly PlacedLine[] = lines;
export const MARKS: Readonly<Record<string, number>> = marks;

export type Scene = {id: SceneId; from: number; duration: number; at: number};

/** Scenes in frames; each runs until the next one starts (hard cuts). */
export const SCENES: Scene[] = starts.map((s, i) => {
  const from = Math.round(s.at * FPS);
  const to = i + 1 < starts.length ? Math.round(starts[i + 1].at * FPS) : TOTAL_FRAMES;
  return {id: s.id, at: s.at, from, duration: to - from};
});

export const sceneOf = (id: SceneId): Scene => {
  const s = SCENES.find((x) => x.id === id);
  if (!s) throw new Error(`no scene ${id}`);
  return s;
};

/** Absolute seconds of a named mark or line start. */
export const at = (name: string): number => {
  const v = marks[name];
  if (v === undefined) throw new Error(`no mark ${name}`);
  return v;
};

/**
 * Absolute seconds at which `word` (case-insensitive, punctuation ignored) is
 * spoken in a line; `nth` picks a later occurrence.
 */
export const wordAt = (id: LineId, word: string, nth = 0): number => {
  const bare = (w: string) => w.toLowerCase().replace(/[^\w']/g, '');
  const hits = VO[id].words.filter((w) => bare(w.word) === bare(word));
  const hit = hits[nth];
  if (!hit) throw new Error(`"${word}" not in ${id}`);
  return at(id) + hit.start;
};

/** Seconds → frame, relative to a scene's first frame. */
export const rel = (seconds: number, s: SceneId): number => Math.round(seconds * FPS) - sceneOf(s).from;

// ---------------------------------------------------------------------------
// Easing shared with the first ad's motion language, but this film moves on a
// softer curve: quick out, gentle settle.

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const cubicOut = (x: number) => 1 - Math.pow(1 - x, 3);
const backOut = (x: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const EASE = {cubicOut, backOut, linear: (x: number) => x};

export const prog = (frame: number, start: number, dur: number, ease = cubicOut) =>
  ease(clamp01((frame - start) / Math.max(1, dur)));
