// Synthesizes the whole soundtrack (music + sound effects) from code and
// writes public/audio/soundtrack.wav. No samples, no stock audio.
//
// Music: 120 BPM, A minor. Sparse pluck/pad intro, a hard stop with a sub
// impact on "But.", the beat drops on the first differentiator, and the last
// chord rings out over the CTA. Every sound effect is scheduled from the cue
// sheets in src/timeline.ts, the same numbers the visuals animate from.
//
//   node scripts/make-audio.ts
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CTA_URL, fmtMoney, HOOK_ASIDE, STAY_NIGHTS, STAY_TOTAL} from '../src/facts.ts';
import {
  AVAIL,
  BPM,
  BUT,
  CHANGES,
  COLD,
  CTA,
  ctaTypeFrames,
  DESK,
  FPS,
  HOOK,
  hookTypeFrames,
  odometerClickFrames,
  odometerSteps,
  RATES,
  SCENES,
  scene,
  TOTAL_FRAMES,
} from '../src/timeline.ts';

const SR = 48000;
const DURATION = TOTAL_FRAMES / FPS;
const N = Math.ceil(DURATION * SR);
const SPB = 60 / BPM; // seconds per beat
const STEP = SPB / 4; // one 16th note
const sec = (frame: number) => frame / FPS;

// ---------------------------------------------------------------- utilities

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rand = mulberry32(20261012);
const noise = () => rand() * 2 - 1;
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Topology-preserving state-variable filter (Zavalishin), cutoff can move per sample. */
class SVF {
  private ic1 = 0;
  private ic2 = 0;
  process(x: number, fc: number, q: number, mode: 'lp' | 'bp' | 'hp'): number {
    const g = Math.tan((Math.PI * Math.min(Math.max(fc, 10), SR * 0.45)) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - this.ic2;
    const v1 = a1 * this.ic1 + a2 * v3;
    const v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    if (mode === 'lp') return v2;
    if (mode === 'bp') return v1;
    return x - k * v1 - v2;
  }
}

/** Band-limited saw step correction. */
const polyblep = (t: number, dt: number) => {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
};

class Saw {
  private ph: number;
  private f: number;
  constructor(f: number) {
    this.f = f;
    this.ph = rand();
  }
  next() {
    const dt = this.f / SR;
    this.ph += dt;
    if (this.ph >= 1) this.ph -= 1;
    return 2 * this.ph - 1 - polyblep(this.ph, dt);
  }
}

class Bus {
  L = new Float32Array(N);
  R = new Float32Array(N);
}

const music = new Bus(); // gated during the "But." silence
const impactBus = new Bus(); // the sub hit, lives through the silence
const sfx = new Bus();
const reverbSend = new Bus();
const delaySend = new Bus();
const impactReverb = new Bus();

/** Sidechain gain, pulled down by every kick. Filled in before music voices render. */
const duck = new Float32Array(N).fill(1);

type PlayOpts = {pan?: number; gain?: number; rev?: number; dly?: number; duck?: boolean; revBus?: Bus};

const play = (bus: Bus, t0: number, dur: number, gen: (t: number) => number, o: PlayOpts = {}) => {
  const start = Math.max(0, Math.round(t0 * SR));
  const end = Math.min(N, Math.round((t0 + dur) * SR));
  const pan = o.pan ?? 0;
  const gain = o.gain ?? 1;
  const pl = Math.cos(((pan + 1) * Math.PI) / 4);
  const pr = Math.sin(((pan + 1) * Math.PI) / 4);
  const rb = o.revBus ?? reverbSend;
  for (let i = start; i < end; i++) {
    let x = gen(i / SR - t0) * gain;
    if (o.duck) x *= duck[i];
    bus.L[i] += x * pl;
    bus.R[i] += x * pr;
    if (o.rev) {
      rb.L[i] += x * pl * o.rev;
      rb.R[i] += x * pr * o.rev;
    }
    if (o.dly) {
      delaySend.L[i] += x * pl * o.dly;
      delaySend.R[i] += x * pr * o.dly;
    }
  }
};

// ------------------------------------------------------------- instruments

const kick = (t0: number, gain = 1) => {
  let ph = 0;
  play(music, t0, 0.5, (t) => {
    const f = 46 + 120 * Math.exp(-t / 0.03);
    ph += (2 * Math.PI * f) / SR;
    const body = Math.sin(ph) * Math.min(1, t / 0.001) * Math.exp(-t / 0.17);
    const click = t < 0.004 ? noise() * (1 - t / 0.004) * 0.35 : 0;
    return Math.tanh((body + click) * 1.6) * 0.9;
  }, {gain});
};

const clap = (t0: number, gain = 1) => {
  const bp = new SVF();
  play(music, t0, 0.35, (t) => {
    let env = 0;
    for (const o of [0, 0.011, 0.022]) if (t >= o) env = Math.max(env, Math.exp(-(t - o) / 0.006));
    if (t >= 0.022) env = Math.max(env, 0.6 * Math.exp(-(t - 0.022) / 0.11));
    return bp.process(noise(), 1400, 1.2, 'bp') * env * 2.4;
  }, {gain, rev: 0.22});
};

const hat = (t0: number, gain: number, open = false, pan = 0) => {
  const hp = new SVF();
  const decay = open ? 0.11 : 0.02;
  play(music, t0, open ? 0.4 : 0.1, (t) => hp.process(noise(), 8000, 0.9, 'hp') * Math.exp(-t / decay), {gain, pan});
};

const bass = (t0: number, midi: number, dur: number, gain: number) => {
  const f = mtof(midi);
  const saw = new Saw(f);
  const lp = new SVF();
  let sub = 0;
  play(music, t0, dur + 0.06, (t) => {
    sub += (2 * Math.PI * f) / SR;
    const fc = 140 + 1100 * Math.exp(-t / 0.07);
    const x = lp.process(saw.next(), fc, 1.4, 'lp') * 0.8 + Math.sin(sub) * 0.6;
    const env = Math.min(1, t / 0.003) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.012)) * (0.75 + 0.25 * Math.exp(-t / 0.1));
    return Math.tanh(x * 1.4) * env;
  }, {gain, duck: true});
};

const stab = (t0: number, notes: number[], gain: number, decay = 0.2, o: PlayOpts = {}) => {
  const oscs = notes.flatMap((n) => [new Saw(mtof(n) * Math.pow(2, 7 / 1200)), new Saw(mtof(n) * Math.pow(2, -7 / 1200))]);
  const lp = new SVF();
  play(music, t0, Math.min(decay * 7, 4.2), (t) => {
    let s = 0;
    for (const osc of oscs) s += osc.next();
    s /= oscs.length;
    const fc = 600 + 3000 * Math.exp(-t / Math.max(0.06, decay * 0.35));
    return lp.process(s, fc, 0.9, 'lp') * Math.exp(-t / decay) * Math.min(1, t / 0.002) * 1.7;
  }, {rev: 0.3, dly: 0.22, duck: true, ...o, gain});
};

const pad = (t0: number, dur: number, notes: number[], gain: number, cutoff = 900, attack = 0.3, release = 0.35, o: PlayOpts = {}) => {
  const oscs = notes.flatMap((n) => [new Saw(mtof(n) * Math.pow(2, 9 / 1200)), new Saw(mtof(n) * Math.pow(2, -9 / 1200))]);
  const lp = new SVF();
  play(music, t0, dur + release * 5, (t) => {
    let s = 0;
    for (const osc of oscs) s += osc.next();
    s /= oscs.length;
    const env = Math.min(1, t / attack) * (t < dur ? 1 : Math.exp(-(t - dur) / release));
    return lp.process(s, cutoff, 0.7, 'lp') * env;
  }, {rev: 0.35, duck: true, ...o, gain});
};

const pluck = (t0: number, midi: number, gain: number, pan: number, decay = 0.13) => {
  const f = mtof(midi);
  let ph = rand();
  const lp = new SVF();
  play(music, t0, decay * 6, (t) => {
    ph += f / SR;
    if (ph >= 1) ph -= 1;
    const pulse = ph < 0.32 ? 1 : -1;
    const fc = 400 + 4200 * Math.exp(-t / 0.04);
    return lp.process(pulse, fc, 1.1, 'lp') * Math.exp(-t / decay) * Math.min(1, t / 0.002) * 0.6;
  }, {gain, pan, dly: 0.35, rev: 0.15, duck: true});
};

// ------------------------------------------------------------ sound effects

const tick = (t0: number, freq = 2600, gain = 0.25, pan = 0) => {
  play(sfx, t0, 0.08, (t) => {
    const click = t < 0.001 ? noise() * 0.5 : 0;
    return Math.sin(2 * Math.PI * freq * t) * Math.exp(-t / 0.012) + click;
  }, {gain, pan});
};

const tap = (t0: number, gain = 0.32) => {
  const lp = new SVF();
  play(sfx, t0, 0.06, (t) => {
    const thock = Math.sin(2 * Math.PI * 520 * t) * Math.exp(-t / 0.01);
    const click = lp.process(noise(), 5000, 0.7, 'lp') * Math.exp(-t / 0.0015);
    return thock * 0.8 + click;
  }, {gain});
};

const key = (t0: number, space: boolean) => {
  const bp = new SVF();
  const center = 1800 + rand() * 2200;
  const g = (space ? 0.14 : 0.2) * (0.7 + rand() * 0.6);
  const pan = (rand() - 0.5) * 0.4;
  play(sfx, t0, 0.05, (t) => {
    const clack = bp.process(noise(), center, 2, 'bp') * Math.exp(-t / 0.007) * 2.2;
    const thock = Math.sin(2 * Math.PI * (space ? 140 : 190) * t) * Math.exp(-t / 0.012) * 0.45;
    return clack + thock;
  }, {gain: g, pan});
};

const odoClick = (t0: number, gain: number) => {
  const hp = new SVF();
  play(sfx, t0, 0.03, (t) => {
    const n = hp.process(noise(), 3000, 0.8, 'hp') * Math.exp(-t / 0.0012);
    return n + Math.sin(2 * Math.PI * 3300 * t) * Math.exp(-t / 0.004) * 0.6;
  }, {gain, pan: (rand() - 0.5) * 0.3});
};

/** Odometer rattle: one click per digit the lead column passes, thinned to >= 11 ms apart. */
const odometer = (startFrame: number, len: number, value: string, gain: number) => {
  const digits = [...value].filter((c) => /\d/.test(c));
  const lead = odometerSteps(Number(digits[digits.length - 1]), 0);
  let last = -1;
  for (const f of odometerClickFrames(startFrame, len, lead)) {
    const t = sec(f);
    if (t - last < 0.011) continue;
    last = t;
    odoClick(t, gain);
  }
  // Mechanical clack as the wheels lock.
  tick(sec(startFrame + len * 0.72), 1400, gain * 1.1);
};

/** Filtered-noise whoosh peaking exactly at a cut. */
const whoosh = (peak: number, len = 0.3, gain = 0.3, panFrom = -0.5) => {
  const bp = new SVF();
  const t0 = peak - len;
  play(sfx, t0, len + 0.12, (t) => {
    const p = Math.min(1, t / len);
    const fc = 300 * Math.pow(12, p);
    const env = t < len ? p * p : Math.exp(-(t - len) / 0.035);
    return bp.process(noise(), fc, 1.6, 'bp') * env * 2.5;
  }, {gain, pan: panFrom});
};

/** Felt marker dragged across paper. */
const marker = (t0: number, len: number, gain = 0.22) => {
  const bp = new SVF();
  play(sfx, t0, len + 0.03, (t) => {
    const p = Math.min(1, t / len);
    const env = Math.sin(Math.PI * Math.min(1, p * 1.05)) * (t < len ? 1 : Math.exp(-(t - len) / 0.01));
    const grain = 0.7 + 0.3 * Math.sin(2 * Math.PI * 38 * t);
    return bp.process(noise(), 3600 + 1400 * p, 1.4, 'bp') * env * grain * 2.4;
  }, {gain, pan: -0.2 + 0.4 * 0.5});
};

/** Scanner sweep: sine and band noise rising together at constant speed. */
const scan = (t0: number, len: number, gain = 0.2) => {
  const bp = new SVF();
  let ph = 0;
  play(sfx, t0, len + 0.05, (t) => {
    const p = Math.min(1, t / len);
    const f = 380 + 1500 * p;
    ph += (2 * Math.PI * f) / SR;
    const env = Math.min(1, t / 0.02) * (t < len ? 1 : Math.exp(-(t - len) / 0.015));
    const hum = Math.sin(ph) * 0.35 + Math.sin(ph * 2.01) * 0.12;
    return (hum + bp.process(noise(), f * 2.2, 5, 'bp') * 1.6) * env;
  }, {gain});
};

/** The before/after divider sliding across the booking card. */
const slide = (t0: number, len: number, gain = 0.16) => {
  const bp = new SVF();
  play(sfx, t0, len + 0.05, (t) => {
    const p = Math.min(1, t / len);
    const env = Math.min(1, t / 0.03) * (t < len ? 1 : Math.exp(-(t - len) / 0.02));
    return bp.process(noise(), 700 + 2000 * p, 2.2, 'bp') * env * 2.2;
  }, {gain, pan: -0.6 + 1.2 * 0.5});
};

const stamp = (t0: number, gain = 0.5) => {
  let ph = 0;
  const lp = new SVF();
  play(sfx, t0, 0.3, (t) => {
    const f = 55 + 90 * Math.exp(-t / 0.03);
    ph += (2 * Math.PI * f) / SR;
    const body = Math.sin(ph) * Math.exp(-t / 0.09);
    const slap = lp.process(noise(), 1200, 0.7, 'lp') * Math.exp(-t / 0.025) * 1.4;
    return Math.tanh((body + slap) * 1.5);
  }, {gain});
};

const blip = (t0: number, midi: number, gain = 0.16) => {
  const f = mtof(midi);
  play(sfx, t0, 0.5, (t) => {
    const s = Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t);
    return s * Math.exp(-t / 0.12) * Math.min(1, t / 0.002);
  }, {gain, rev: 0.4});
};

/** Sub impact under "But.": a pitch-dropping sine, saturated so phones can hear it. */
const impact = (t0: number) => {
  let ph = 0;
  const lp = new SVF();
  play(impactBus, t0, 2.4, (t) => {
    const f = 28 + 64 * Math.exp(-t / 0.22);
    ph += (2 * Math.PI * f) / SR;
    const env = Math.min(1, t / 0.002) * Math.exp(-t / 0.42);
    const thump = lp.process(noise(), 180, 0.7, 'lp') * Math.exp(-t / 0.05) * 1.6;
    return Math.tanh((Math.sin(ph) * env + thump) * 2.2) * 0.95;
  }, {gain: 0.9, rev: 0.12, revBus: impactReverb});
};

// -------------------------------------------------------------- arrangement

const A_MINOR = {
  Am: {chord: [57, 60, 64], root: 33},
  F: {chord: [57, 60, 65], root: 29},
  C: {chord: [55, 60, 64], root: 36},
  G: {chord: [55, 59, 62], root: 31},
  Dm: {chord: [57, 62, 65], root: 38},
  E: {chord: [56, 59, 64], root: 28},
};
type ChordName = keyof typeof A_MINOR;

const tBut = sec(scene('but').from);
const tDrop = sec(scene('rates').from);
const tCta = sec(scene('cta').from);

// Intro (cold open + hook): pad + pluck arpeggio, hats creep in on the hook.
const introBars: Array<{name: ChordName; arp: number[]}> = [
  {name: 'Am', arp: [57, 64, 60, 64, 69, 64, 60, 64]},
  {name: 'F', arp: [53, 60, 57, 60, 65, 60, 57, 60]},
];
introBars.forEach((bar, b) => {
  const t0 = b * 4 * SPB;
  pad(t0, 4 * SPB - 0.05, A_MINOR[bar.name].chord, 0.15, 700, 0.35, 0.2, {duck: false});
  bar.arp.forEach((m, i) => pluck(t0 + i * 2 * STEP, m + 12, 0.19, i % 2 ? 0.3 : -0.3));
});
for (let i = 0; i < 8; i++) hat(sec(scene('hook').from) + (i + 0.5) * (SPB / 2) * 2, 0.07, false, 0.25);

// The drop: 8 bars, a bar per half differentiator.
const dropBars: ChordName[] = ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E'];
const kicks: number[] = [];
dropBars.forEach((_, b) => {
  for (let beat = 0; beat < 4; beat++) kicks.push(tDrop + (b * 4 + beat) * SPB);
});
kicks.push(tCta);

// Sidechain from every kick.
for (const k of kicks) {
  const start = Math.round(k * SR);
  for (let i = start; i < Math.min(N, start + Math.round(0.4 * SR)); i++) {
    const t = (i - start) / SR;
    const d = 1 - 0.62 * Math.exp(-t / 0.085) * Math.min(1, t / 0.004 + 0.4);
    duck[i] = Math.min(duck[i], d);
  }
}

dropBars.forEach((name, b) => {
  const t0 = tDrop + b * 4 * SPB;
  const {chord, root} = A_MINOR[name];
  for (let beat = 0; beat < 4; beat++) {
    const tb = t0 + beat * SPB;
    kick(tb, 0.95);
    if (beat % 2 === 1) clap(tb, 0.42);
    hat(tb + 2 * STEP, 0.13, true, 0.15);
    hat(tb + STEP, 0.07, false, -0.2);
    hat(tb + 3 * STEP, 0.08, false, 0.2);
  }
  for (const s of [2, 6, 10, 14]) bass(t0 + s * STEP, root, 0.17, 0.4);
  bass(t0 + 11 * STEP, root + 12, 0.08, 0.26);
  for (const s of [0, 3, 10]) stab(t0 + s * STEP, chord, s === 0 ? 0.24 : 0.17);
  pad(t0, 4 * SPB - 0.02, chord, 0.06, 1200, 0.08, 0.12);
  if (b >= 2) {
    const tones = [...chord, chord[0] + 12];
    for (let s = 0; s < 16; s++) pluck(t0 + s * STEP, tones[(s * 3) % 4] + 12, 0.055, s % 2 ? 0.45 : -0.45, 0.07);
  }
});
// Lift into the CTA: a clap roll on the last beat.
for (let s = 0; s < 4; s++) clap(tCta - SPB + s * STEP, 0.16 + s * 0.07);

// CTA: everything stops but one Am(add9) chord, left to ring out.
kick(tCta, 1);
{
  // A1 sub that decays with the chord instead of being cut off.
  let ph = 0;
  const f = mtof(33);
  play(music, tCta, DURATION - tCta, (t) => {
    ph += (2 * Math.PI * f) / SR;
    return Math.tanh(Math.sin(ph) * 1.6) * Math.min(1, t / 0.004) * Math.exp(-t / 0.9);
  }, {gain: 0.4});
}
stab(tCta, [45, 52, 57, 60, 64, 71], 0.42, 1.5, {rev: 0.55, dly: 0.2, duck: false});
pad(tCta, 1.2, [57, 60, 64, 71], 0.12, 1500, 0.01, 1.1, {rev: 0.6, duck: false});

// ------------------------------------------------------------ sound design

// Whooshes on every cut except into "But." (that cut gets the sub impact).
for (const s of SCENES) {
  if (s.from === 0 || s.id === 'but') continue;
  whoosh(sec(s.from), 0.28, s.id === 'rates' ? 0.34 : 0.26, s.index % 2 ? 0.4 : -0.4);
}

// 01 Cold open
{
  const f0 = scene('coldOpen').from;
  whoosh(sec(f0 + COLD.tilt + 9), 0.3, 0.24, 0);
  tap(sec(f0 + COLD.tapSelect));
  whoosh(sec(f0 + COLD.scroll + 6), 0.2, 0.12, 0.2);
  tap(sec(f0 + COLD.tapBook));
  blip(sec(f0 + COLD.success), 76);
  blip(sec(f0 + COLD.success + 2), 81);
}

// 02 Hook
{
  const f0 = scene('hook').from;
  marker(sec(f0 + HOOK.swipe), sec(HOOK.swipeLen));
  hookTypeFrames().forEach((f, i) => key(sec(f), HOOK_ASIDE[i] === ' '));
}

// 03 But.
impact(sec(scene('but').from + BUT.punch));

// 04 Rates
{
  const f0 = scene('rates').from;
  STAY_NIGHTS.forEach((n, i) => odometer(f0 + RATES.rows[i], RATES.rollLen, fmtMoney(n.rate), 0.16));
  tick(sec(f0 + RATES.totalRule), 1900, 0.14);
  odometer(f0 + RATES.total, RATES.totalRollLen, fmtMoney(STAY_TOTAL), 0.2);
}

// 05 Availability
{
  const f0 = scene('availability').from;
  tick(sec(f0 + AVAIL.roomTag), 2200, 0.12);
  AVAIL.steps.forEach((f, i) => tick(sec(f0 + f), 3000 - i * 320, 0.3, i % 2 ? 0.25 : -0.25));
  stamp(sec(f0 + AVAIL.stamp));
}

// 06 Changes
{
  const f0 = scene('changes').from;
  whoosh(sec(f0 + CHANGES.card + 4), 0.16, 0.12, 0);
  slide(sec(f0 + CHANGES.split), sec(CHANGES.splitLen));
  tick(sec(f0 + CHANGES.split + CHANGES.splitLen), 1500, 0.2);
  blip(sec(f0 + CHANGES.banner), 81, 0.1);
}

// 07 Front desk
{
  const f0 = scene('frontDesk').from;
  scan(sec(f0 + DESK.scan), sec(DESK.scanLen));
  DESK.flips.forEach((f, i) => tick(sec(f0 + f), 2100 + i * 260, 0.24, i % 2 ? 0.3 : -0.3));
}

// 08 CTA
{
  const f0 = scene('cta').from;
  marker(sec(f0 + CTA.swipe), sec(CTA.swipeLen));
  CTA.pills.forEach((f, i) => tick(sec(f0 + f), 2400 + i * 400, 0.2));
  ctaTypeFrames().forEach((f, i) => key(sec(f), CTA_URL[i] === '.'));
}

// ------------------------------------------------------------------ effects

/** Stereo ping-pong delay, dotted eighth, darkened feedback. */
const applyDelay = (src: Bus, dst: Bus, time: number, fb: number, wet: number) => {
  const d = Math.round(time * SR);
  const bufL = new Float32Array(N);
  const bufR = new Float32Array(N);
  const lpL = new SVF();
  const lpR = new SVF();
  for (let i = 0; i < N; i++) {
    const dl = i >= d ? bufR[i - d] : 0;
    const dr = i >= d ? bufL[i - d] : 0;
    bufL[i] = src.L[i] + lpL.process(dl, 3500, 0.7, 'lp') * fb;
    bufR[i] = lpR.process(dr, 3500, 0.7, 'lp') * fb;
    dst.L[i] += dl * wet;
    dst.R[i] += dr * wet;
    reverbSend.L[i] += dl * wet * 0.3;
    reverbSend.R[i] += dr * wet * 0.3;
  }
};

/** Freeverb: 8 damped combs + 4 allpasses per channel. */
const applyReverb = (src: Bus, dst: Bus, wet: number, room = 0.84, damp = 0.25) => {
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const allps = [556, 441, 341, 225];
  for (const [ch, spread] of [['L', 0], ['R', 23]] as const) {
    const input = src[ch];
    const out = new Float32Array(N);
    for (const len0 of combs) {
      const len = Math.round((len0 + spread) * scale);
      const buf = new Float32Array(len);
      let idx = 0;
      let store = 0;
      for (let i = 0; i < N; i++) {
        const y = buf[idx];
        store = y * (1 - damp) + store * damp;
        buf[idx] = input[i] * 0.015 + store * room;
        out[i] += y;
        if (++idx >= len) idx = 0;
      }
    }
    for (const len0 of allps) {
      const len = Math.round((len0 + spread) * scale);
      const buf = new Float32Array(len);
      let idx = 0;
      for (let i = 0; i < N; i++) {
        const b = buf[idx];
        const y = -out[i] + b;
        buf[idx] = out[i] + b * 0.5;
        out[i] = y;
        if (++idx >= len) idx = 0;
      }
    }
    const d = dst[ch];
    for (let i = 0; i < N; i++) d[i] += out[i] * wet;
  }
};

applyDelay(delaySend, music, SPB * 0.75, 0.38, 0.55);
applyReverb(reverbSend, music, 1.0);
applyReverb(impactReverb, impactBus, 1.0, 0.8, 0.4);

// Hard stop for "But.": music is muted from the cut to the drop, tails and all.
{
  const a = Math.round(tBut * SR);
  const b = Math.round(tDrop * SR);
  const ramp = Math.round(0.012 * SR);
  for (let i = a; i < Math.min(N, b + ramp); i++) {
    let g = 0;
    if (i < a + ramp) g = 1 - (i - a) / ramp;
    else if (i >= b) g = (i - b) / ramp;
    music.L[i] *= g;
    music.R[i] *= g;
  }
}

// ---------------------------------------------------------------- master

const MUSIC_GAIN = 0.62;
const SFX_GAIN = 0.9;
// The sub hit should land about as loud as the drop, not above it.
const IMPACT_GAIN = 0.36;
const L = new Float32Array(N);
const R = new Float32Array(N);
for (let i = 0; i < N; i++) {
  L[i] = music.L[i] * MUSIC_GAIN + impactBus.L[i] * IMPACT_GAIN + sfx.L[i] * SFX_GAIN;
  R[i] = music.R[i] * MUSIC_GAIN + impactBus.R[i] * IMPACT_GAIN + sfx.R[i] * SFX_GAIN;
}

const dbfs = (x: number) => (x <= 0 ? -Infinity : 20 * Math.log10(x));
const peakOf = (a: Float32Array, b: Float32Array) => {
  let p = 0;
  for (let i = 0; i < a.length; i++) p = Math.max(p, Math.abs(a[i]), Math.abs(b[i]));
  return p;
};
const rmsOf = (a: Float32Array, b: Float32Array, from = 0, to = a.length) => {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i] * a[i] + b[i] * b[i];
  return Math.sqrt(s / (2 * (to - from)));
};

const rawPeak = peakOf(L, R);

// Bring the drop up to a consistent level, then a look-ahead peak limiter
// holds everything under the ceiling. Ceiling leaves room for AAC overshoot.
const CEILING = Math.pow(10, -1.5 / 20);
const TARGET_DROP_RMS = Math.pow(10, -15 / 20);
const dropRms = rmsOf(L, R, Math.round(tDrop * SR), Math.round(tCta * SR));
const pre = TARGET_DROP_RMS / dropRms;
for (let i = 0; i < N; i++) {
  L[i] *= pre;
  R[i] *= pre;
}

const LOOKAHEAD = Math.round(0.004 * SR);
const RELEASE = Math.exp(-1 / (0.08 * SR));
const need = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
  need[i] = p > CEILING ? CEILING / p : 1;
}
// Minimum over the look-ahead window (so gain is down before the peak arrives).
const target = new Float32Array(N);
{
  const dq: number[] = [];
  for (let i = 0; i < N + LOOKAHEAD; i++) {
    if (i < N) {
      while (dq.length && need[dq[dq.length - 1]] >= need[i]) dq.pop();
      dq.push(i);
    }
    const j = i - LOOKAHEAD;
    if (j >= 0) {
      while (dq.length && dq[0] < j - LOOKAHEAD) dq.shift();
      target[j] = dq.length ? need[dq[0]] : 1;
    }
  }
}
let g = 1;
let limited = 0;
for (let i = 0; i < N; i++) {
  g = target[i] < g ? target[i] : target[i] + (g - target[i]) * RELEASE;
  if (g < 0.999) limited++;
  L[i] *= g;
  R[i] *= g;
}
// Safety: nothing may exceed the ceiling.
for (let i = 0; i < N; i++) {
  L[i] = Math.max(-CEILING, Math.min(CEILING, L[i]));
  R[i] = Math.max(-CEILING, Math.min(CEILING, R[i]));
}
// Fade the last 300 ms so the reverb tail ends cleanly with the video.
{
  const fade = Math.round(0.3 * SR);
  for (let i = N - fade; i < N; i++) {
    const k = (N - i) / fade;
    L[i] *= k;
    R[i] *= k;
  }
}

// ------------------------------------------------------------------- write

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outFile = path.join(root, 'public', 'audio', 'soundtrack.wav');
fs.mkdirSync(path.dirname(outFile), {recursive: true});

const data = Buffer.alloc(N * 4);
let clipped = 0;
for (let i = 0; i < N; i++) {
  for (const [c, v] of [[0, L[i]], [1, R[i]]] as const) {
    if (Math.abs(v) >= 1) clipped++;
    const s = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
    data.writeInt16LE(s, i * 4 + c * 2);
  }
}
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);
fs.writeFileSync(outFile, Buffer.concat([header, data]));

const finalPeak = peakOf(L, R);
console.log(`wrote ${path.relative(root, outFile)}: ${DURATION.toFixed(2)} s, ${SR} Hz stereo 16-bit`);
console.log(`raw mix peak      ${dbfs(rawPeak).toFixed(2)} dBFS (before gain staging)`);
console.log(`drop RMS target   ${dbfs(TARGET_DROP_RMS).toFixed(1)} dBFS, pre-gain ${dbfs(pre).toFixed(2)} dB`);
console.log(`limiter active    ${((100 * limited) / N).toFixed(2)}% of samples`);
console.log(`final sample peak ${dbfs(finalPeak).toFixed(2)} dBFS (ceiling ${dbfs(CEILING).toFixed(1)})`);
console.log(`overall RMS       ${dbfs(rmsOf(L, R)).toFixed(2)} dBFS`);
console.log(`clipped samples   ${clipped}`);
