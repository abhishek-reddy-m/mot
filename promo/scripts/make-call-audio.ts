// Mixes the "Let me check" ad: voice lines (public/call/vo/*.wav), a
// synthesized score and sound effects, all placed from the cues in
// src/call/timeline.ts. Writes public/call/mix.wav and prints a mix report.
//
//   node scripts/make-call-audio.ts
//
// Score: room tone and a buzzing neon sign for the night call, a lo-fi hold
// loop heard through the phone, a tape rewind, then a warm 100 BPM groove in
// F major that ducks under the narrator, goes quiet for the night, and lands
// on a held chord under the end card.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  at,
  DURATION,
  FPS,
  LINES,
  RING_BURSTS,
  RING_LEN,
  SCENES,
  sceneOf,
  type SceneId,
  wordAt,
} from '../src/call/timeline.ts';
import {VO} from '../src/call/vo.ts';
import {createSynth, dbfs, limit, mtof, peakOf, readWav, rmsOf, upsample2, writeWav} from './lib/dsp.ts';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SR = 48000;
const N = Math.ceil(DURATION * SR);
const S = createSynth(SR, N, 1647);
const {SVF, Saw, Bus, play, noise, rand} = S;
const f = (frames: number) => frames / FPS;
const start = (id: SceneId) => sceneOf(id).from / FPS;

const voice = new Bus();
const music = new Bus();
const phoneMusic = new Bus(); // hold loop, filtered as if heard down the line
const sfx = new Bus();
const ambience = new Bus();
const verbSend = new Bus();
const delaySend = new Bus();

// ----------------------------------------------------------------- voices

const TARGET_SPEECH_RMS = Math.pow(10, -19 / 20);
for (const line of LINES) {
  const vo = VO[line.id];
  const {sr, data} = readWav(path.join(root, 'public', 'call', 'vo', `${line.id}.wav`));
  if (sr !== 24000) throw new Error(`${line.id}: expected 24 kHz voice`);
  const x = upsample2(data);
  // Level-match lines by speech RMS (frames above a gate), not by peak.
  let s = 0;
  let n = 0;
  for (const v of x) if (Math.abs(v) > 0.02) (s += v * v), n++;
  const g = TARGET_SPEECH_RMS / Math.sqrt(s / Math.max(1, n));
  const hp = new SVF();
  const tel1 = new SVF();
  const tel2 = new SVF();
  const tel3 = new SVF();
  const caller = vo.speaker === 'caller';
  const owner = vo.speaker === 'owner';
  const i0 = Math.round(line.at * SR);
  for (let i = 0; i < x.length && i0 + i < N; i++) {
    let v = hp.process(x[i] * g, 90, 0.7, 'hp');
    if (caller) {
      // Telephone: 300 Hz–3.4 kHz, a little drive, a little line hiss.
      v = tel1.process(v, 320, 0.8, 'hp');
      v = tel2.process(v, 3300, 0.8, 'lp');
      v = tel3.process(v, 3300, 0.8, 'lp');
      v = Math.tanh(v * 2.2) / 1.6 + noise() * 0.002;
    }
    voice.L[i0 + i] += v * (caller ? 0.94 : 1);
    voice.R[i0 + i] += v * (caller ? 0.94 : 1);
    if (owner) {
      verbSend.L[i0 + i] += v * 0.08;
      verbSend.R[i0 + i] += v * 0.08;
    }
  }
}

// Tame TTS peaks (about 17 dB crest) so speech can sit forward without the
// master limiter working on every syllable.
limit(voice.L, voice.R, SR, Math.pow(10, -9 / 20));

// Ducking envelope from the voice bus: music drops ~7 dB under speech.
const duck = new Float32Array(N).fill(1);
{
  const atk = Math.exp(-1 / (0.012 * SR));
  const rel = Math.exp(-1 / (0.32 * SR));
  let e = 0;
  for (let i = 0; i < N; i++) {
    const x = Math.abs(voice.L[i]);
    e = x > e ? x + (e - x) * atk : x + (e - x) * rel;
    duck[i] = 1 - 0.56 * Math.min(1, e / 0.05);
  }
}

// ------------------------------------------------------------- instruments

/** FM electric piano: bell-ish attack, warm body, slow tremolo. */
const epiano = (t0: number, notes: number[], dur: number, gain: number, pan = 0) => {
  for (const m of notes) {
    const fr = mtof(m);
    let pc = rand() * 6.28;
    let pm = 0;
    play(music, t0, dur + 1.2, (t) => {
      pm += (2 * Math.PI * fr) / SR;
      const idx = 1.6 * Math.exp(-t / 0.25) + 0.25;
      pc += (2 * Math.PI * fr) / SR;
      const env = Math.min(1, t / 0.004) * Math.exp(-t / 1.1) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.18));
      const trem = 1 + 0.12 * Math.sin(2 * Math.PI * 4.6 * t);
      return Math.sin(pc + idx * Math.sin(pm)) * env * trem * 0.32;
    }, {gain, pan, env: duck, sends: [[verbSend, 0.22], [delaySend, 0.12]]});
  }
};

const pad = (t0: number, notes: number[], dur: number, gain: number, cutoff = 1100, attack = 0.6, release = 0.9, ducked = true) => {
  const oscs = notes.flatMap((m) => [new Saw(mtof(m) * Math.pow(2, 8 / 1200)), new Saw(mtof(m) * Math.pow(2, -8 / 1200))]);
  const lp = new SVF();
  play(music, t0, dur + release * 5, (t) => {
    let s = 0;
    for (const o of oscs) s += o.next();
    s /= oscs.length;
    const env = Math.min(1, t / attack) * (t < dur ? 1 : Math.exp(-(t - dur) / release));
    return lp.process(s, cutoff, 0.7, 'lp') * env;
  }, {gain, env: ducked ? duck : undefined, sends: [[verbSend, 0.35]]});
};

const kick = (t0: number, gain: number) => {
  let ph = 0;
  play(music, t0, 0.45, (t) => {
    const fr = 48 + 95 * Math.exp(-t / 0.035);
    ph += (2 * Math.PI * fr) / SR;
    return Math.tanh(Math.sin(ph) * Math.exp(-t / 0.16) * 1.4) * Math.min(1, t / 0.0015);
  }, {gain});
};

const snap = (t0: number, gain: number) => {
  const bp = new SVF();
  play(music, t0, 0.3, (t) => {
    let env = 0;
    for (const o of [0, 0.009, 0.018]) if (t >= o) env = Math.max(env, Math.exp(-(t - o) / 0.005));
    if (t >= 0.018) env = Math.max(env, 0.5 * Math.exp(-(t - 0.018) / 0.07));
    return bp.process(noise(), 1700, 1.3, 'bp') * env * 2.2;
  }, {gain, env: duck, sends: [[verbSend, 0.25]]});
};

const shaker = (t0: number, gain: number, pan: number) => {
  const hp = new SVF();
  play(music, t0, 0.12, (t) => hp.process(noise(), 7000, 0.8, 'hp') * Math.min(1, t / 0.006) * Math.exp(-t / 0.03), {gain, pan, env: duck});
};

const bass = (t0: number, m: number, dur: number, gain: number) => {
  const fr = mtof(m);
  const saw = new Saw(fr);
  const lp = new SVF();
  let ph = 0;
  play(music, t0, dur + 0.08, (t) => {
    ph += (2 * Math.PI * fr) / SR;
    const x = Math.sin(ph) * 0.8 + lp.process(saw.next(), 420 + 500 * Math.exp(-t / 0.06), 0.9, 'lp') * 0.45;
    const env = Math.min(1, t / 0.004) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.03));
    return Math.tanh(x * 1.3) * env;
  }, {gain, env: duck});
};

const pluck = (t0: number, m: number, gain: number, pan: number) => {
  const fr = mtof(m);
  let ph = rand();
  const lp = new SVF();
  play(music, t0, 0.6, (t) => {
    ph += fr / SR;
    if (ph >= 1) ph -= 1;
    const tri = 1 - 4 * Math.abs(ph - 0.5);
    return lp.process(tri, 900 + 3000 * Math.exp(-t / 0.05), 0.9, 'lp') * Math.exp(-t / 0.16) * Math.min(1, t / 0.002);
  }, {gain, pan, env: duck, sends: [[delaySend, 0.3], [verbSend, 0.15]]});
};

// ------------------------------------------------------------- sound design

const tick = (t0: number, fr = 2400, gain = 0.18, pan = 0) =>
  play(sfx, t0, 0.06, (t) => Math.sin(2 * Math.PI * fr * t) * Math.exp(-t / 0.01) + (t < 0.001 ? noise() * 0.4 : 0), {gain, pan});

const tap = (t0: number, gain = 0.26) => {
  const lp = new SVF();
  play(sfx, t0, 0.06, (t) => Math.sin(2 * Math.PI * 600 * t) * Math.exp(-t / 0.009) * 0.8 + lp.process(noise(), 5000, 0.7, 'lp') * Math.exp(-t / 0.0015), {gain});
};

const ding = (t0: number, notes: number[], gain = 0.14) =>
  notes.forEach((m, i) =>
    play(sfx, t0 + i * 0.07, 0.6, (t) => (Math.sin(2 * Math.PI * mtof(m) * t) + 0.2 * Math.sin(4 * Math.PI * mtof(m) * t)) * Math.exp(-t / 0.14) * Math.min(1, t / 0.002), {gain, sends: [[verbSend, 0.4]]}),
  );

const whoosh = (peak: number, len = 0.26, gain = 0.2, pan = 0) => {
  const bp = new SVF();
  play(sfx, peak - len, len + 0.12, (t) => {
    const p = Math.min(1, t / len);
    const env = t < len ? p * p : Math.exp(-(t - len) / 0.04);
    return bp.process(noise(), 300 * Math.pow(10, p), 1.4, 'bp') * env * 2.4;
  }, {gain, pan});
};

const thud = (t0: number, gain = 0.32) => {
  let ph = 0;
  const lp = new SVF();
  play(sfx, t0, 0.35, (t) => {
    ph += (2 * Math.PI * (60 + 70 * Math.exp(-t / 0.04))) / SR;
    return Math.tanh((Math.sin(ph) * Math.exp(-t / 0.11) + lp.process(noise(), 900, 0.7, 'lp') * Math.exp(-t / 0.02)) * 1.6);
  }, {gain});
};

/** Paper card slapped down on the desk. */
const slap = (t0: number, gain = 0.3) => {
  const bp = new SVF();
  play(sfx, t0, 0.2, (t) => bp.process(noise(), 1800, 0.9, 'bp') * Math.exp(-t / 0.018) * 2 + Math.sin(2 * Math.PI * 140 * t) * Math.exp(-t / 0.05) * 0.6, {gain});
};

/** Marker pen: a scribble (several strokes) or one firm strike. */
const marker = (t0: number, len: number, strokes: number, gain = 0.2) => {
  const bp = new SVF();
  play(sfx, t0, len + 0.03, (t) => {
    const p = Math.min(1, t / len);
    const stroke = Math.abs(Math.sin(Math.PI * strokes * p));
    return bp.process(noise(), 3200 + 1500 * stroke, 1.3, 'bp') * stroke * (t < len ? 1 : 0) * 2.2;
  }, {gain});
};

const ringtone = (t0: number) => {
  // Marimba-ish four-note figure, played twice in a burst.
  const notes = [88, 91, 95, 100];
  for (let rep = 0; rep < 2; rep++) {
    notes.forEach((m, i) => {
      const fr = mtof(m - 12);
      play(sfx, t0 + rep * 0.4 + i * 0.09, 0.35, (t) => (Math.sin(2 * Math.PI * fr * t) + 0.3 * Math.sin(2 * Math.PI * fr * 4 * t) * Math.exp(-t / 0.02)) * Math.exp(-t / 0.09), {gain: 0.13, sends: [[verbSend, 0.25]]});
    });
  }
  // Vibration motor rattling on the desk.
  play(sfx, t0, RING_LEN, (t) => {
    const gate = Math.sin(2 * Math.PI * 28 * t) > 0 ? 1 : 0.15;
    return Math.tanh(Math.sin(2 * Math.PI * 155 * t) * 5) * gate * 0.5;
  }, {gain: 0.09});
};

const busyTone = (t0: number) => {
  for (let k = 0; k < 3; k++) {
    play(sfx, t0 + k * 0.4, 0.22, (t) => (Math.sin(2 * Math.PI * 480 * t) + Math.sin(2 * Math.PI * 620 * t)) * 0.5 * Math.min(1, t / 0.004, (0.22 - t) / 0.004), {gain: 0.12});
  }
};

const tapeRewind = (t0: number, len: number) => {
  const bp = new SVF();
  let ph = 0;
  play(sfx, t0, len, (t) => {
    const p = t / len;
    const fr = 1800 + 2600 * p + 400 * Math.sin(2 * Math.PI * 7 * t);
    ph += (2 * Math.PI * fr) / SR;
    const chirp = Math.sin(ph) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 17 * t)) * 0.35;
    const hiss = bp.process(noise(), fr * 0.9, 2, 'bp') * 1.2;
    const env = Math.min(1, t / 0.05) * Math.min(1, (len - t) / 0.03);
    return (chirp + hiss) * env;
  }, {gain: 0.16});
  // Mechanism clunk as it stops.
  thud(t0 + len, 0.28);
  tick(t0 + len + 0.01, 1100, 0.2);
};

/** "Booking lost.": a low, sour piano-ish chord. */
const sting = (t0: number) => {
  for (const m of [38, 50, 53, 57]) {
    const fr = mtof(m);
    play(sfx, t0, 2.2, (t) => (Math.sin(2 * Math.PI * fr * t) + 0.35 * Math.sin(4 * Math.PI * fr * t) * Math.exp(-t / 0.2)) * Math.exp(-t / 0.7) * Math.min(1, t / 0.003), {gain: 0.07, sends: [[verbSend, 0.5]]});
  }
};

// ---------------------------------------------------------------- the night

const callStart = start('call');
const ambienceEnd = at('rewind');

// Room tone: soft low rumble + faint mains hum, all through the night call.
{
  const lp = new SVF();
  let brown = 0;
  play(ambience, 0, ambienceEnd, (t) => {
    brown = brown * 0.995 + noise() * 0.05;
    const hum = Math.sin(2 * Math.PI * 60 * t) * 0.5 + Math.sin(2 * Math.PI * 120 * t) * 0.25;
    const fade = Math.min(1, t / 0.3, (ambienceEnd - t) / 0.05);
    return (lp.process(brown, 400, 0.7, 'lp') * 1.2 + hum * 0.03) * fade;
  }, {gain: 0.12});
}
// Neon buzz, cutting out on the frames the sign flickers (NightDesk flickerOn).
{
  const flickOff = (frame: number) => [11, 13, 52, 53, 55].includes((frame + 37) % 97);
  const bp = new SVF();
  const saw = new Saw(120);
  play(ambience, 0, ambienceEnd, (t) => {
    const frame = Math.floor((callStart + t) * FPS);
    const on = flickOff(frame) ? 0.1 : 1;
    return bp.process(saw.next(), 1800, 1.2, 'bp') * on;
  }, {gain: 0.018, pan: -0.4});
}

for (const b of RING_BURSTS) ringtone(callStart + b);
tap(at('answer'), 0.3);

// On hold: a cheesy bossa loop, C major, heard through the phone.
{
  const t0 = at('holdStart');
  const t1 = at('holdEnd');
  const spb = 60 / 112;
  const chords = [
    [60, 64, 67, 71],
    [57, 60, 64, 67],
    [62, 65, 69, 72],
    [55, 59, 62, 65],
  ];
  const melody = [76, 74, 72, 74, 76, 79, 76, 74, 72, 71, 72, 74, 72, 69, 67, 69];
  for (let beat = 0; beat * spb < t1 - t0; beat++) {
    const tb = t0 + beat * spb;
    const ch = chords[Math.floor(beat / 4) % 4];
    if (beat % 2 === 0) ch.forEach((m) => playPhone(tb, mtof(m), 0.42, 0.06, 'sine'));
    else ch.forEach((m) => playPhone(tb + spb * 0.5, mtof(m), 0.2, 0.05, 'sine'));
    playPhone(tb, mtof(ch[0] - 24), 0.3, 0.12, 'sine');
    playPhone(tb, mtof(melody[beat % melody.length]), spb * 0.9, 0.09, 'square');
  }
}
function playPhone(t0: number, fr: number, dur: number, gain: number, wave: 'sine' | 'square') {
  const end = at('holdEnd');
  if (t0 >= end) return;
  let ph = rand();
  play(phoneMusic, t0, Math.min(dur + 0.1, end - t0), (t) => {
    ph += fr / SR;
    if (ph >= 1) ph -= 1;
    const v = wave === 'sine' ? Math.sin(2 * Math.PI * ph) : ph < 0.5 ? 0.6 : -0.6;
    return v * Math.min(1, t / 0.005) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.03)) * Math.exp(-t / 1.5);
  }, {gain});
}
tick(at('holdEnd'), 900, 0.16); // line clicks back

// The pile of problems.
slap(at('p1'));
thud(at('p1'), 0.18);
marker(at('p1') + f(8), f(14), 3, 0.18);
slap(at('p2'), 0.2);
[0, 8, 16].forEach((d) => ding(at('p2') + f(d), [83, 88], 0.09));
slap(at('p3'), 0.32);
thud(at('p3'), 0.18);
whoosh(at('holdEnd') + f(2), 0.22, 0.14);
busyTone(at('hangup') + 0.08);
sting(at('lost'));
thud(at('lost'), 0.3);

// --------------------------------------------------------------- the turn

{
  const t0 = start('turn');
  pad(t0, [45, 52, 57, 60, 64], start('rewind') - t0 - 0.2, 0.2, 700, 0.5, 0.3, false);
  thud(t0, 0.26);
}

// ------------------------------------------------------- rewind + the groove

tapeRewind(at('rewind'), at('rewindEnd') - at('rewind'));
thud(wordAt('n_rewind', 'night'), 0.16);
thud(wordAt('n_rewind', 'guest'), 0.16);
whoosh(wordAt('n_rewind', 'But') + f(10), 0.32, 0.18);
tick(wordAt('n_rewind', 'booking'), 1900, 0.12);

const BPM = 100;
const SPB = 60 / BPM;
const BAR = 4 * SPB;
const grooveStart = at('rewindEnd');
const nightStart = start('night');
const ctaStart = start('cta');
const endCard = at('endCard');
const PROG: number[][] = [
  [53, 57, 60, 64], // Fmaj7
  [48, 55, 60, 64], // C
  [50, 57, 62, 65], // Dm
  [46, 53, 58, 62], // Bb
];
const ROOTS = [41, 36, 38, 34];

type Section = {from: number; to: number; drums: boolean; arp: boolean};
const sections: Section[] = [
  {from: grooveStart, to: start('book'), drums: false, arp: false},
  {from: start('book'), to: start('avail'), drums: true, arp: false},
  {from: start('avail'), to: nightStart, drums: true, arp: true},
  {from: ctaStart, to: endCard, drums: true, arp: true},
];

for (const sec of sections) {
  // Bars on a grid anchored at the groove start, so sections stay in time.
  const firstBar = Math.max(0, Math.floor((sec.from - grooveStart) / BAR));
  for (let b = firstBar; grooveStart + b * BAR < sec.to; b++) {
    const tb = grooveStart + b * BAR;
    const chord = PROG[b % 4];
    const root = ROOTS[b % 4];
    for (let beat = 0; beat < 4; beat++) {
      const t = tb + beat * SPB;
      if (t < sec.from - 0.001 || t >= sec.to) continue;
      // Piano on the offbeats, full chord on beat 1.
      if (beat === 0) epiano(t, chord.map((m) => m + 12), SPB * 1.8, 0.5, -0.1);
      epiano(t + SPB * 0.5, chord.slice(1).map((m) => m + 12), SPB * 0.35, 0.32, 0.15);
      if (sec.drums) {
        if (beat === 0 || beat === 2) kick(t, 0.5);
        if (beat === 1 || beat === 3) snap(t, 0.2);
        for (let s = 0; s < 4; s++) shaker(t + (s * SPB) / 4, s % 2 ? 0.04 : 0.065, s % 2 ? 0.35 : -0.35);
        bass(t, root, SPB * 0.45, 0.32);
        if (beat === 1) bass(t + SPB * 0.75, root + 12, SPB * 0.2, 0.18);
      }
      if (sec.arp) {
        const tones = [chord[1] + 24, chord[2] + 24, chord[3] + 24, chord[2] + 24];
        tones.forEach((m, k) => pluck(t + (k * SPB) / 4, m, 0.045, k % 2 ? 0.4 : -0.4));
      }
    }
    if (b === firstBar) pad(Math.max(tb, sec.from), PROG[b % 4], BAR, 0.035, 1400, 0.4, 0.5);
    else pad(tb, chord, BAR, 0.035, 1400, 0.3, 0.5);
  }
}

// Night: everything drops to a soft pad and room tone; morning brings a bright swell.
{
  const morning = at('morning');
  pad(nightStart, [41, 48, 57, 60, 67], morning - nightStart, 0.05, 650, 0.4, 0.4, false);
  const lp = new SVF();
  let brown = 0;
  play(ambience, nightStart, morning - nightStart, (t) => {
    brown = brown * 0.995 + noise() * 0.05;
    return lp.process(brown, 400, 0.7, 'lp') * 1.2 * Math.min(1, t / 0.2, (morning - nightStart - t) / 0.05);
  }, {gain: 0.12});
  thud(nightStart + f(4), 0.18);
  thud(nightStart + f(14), 0.18);
  pad(morning, [46, 53, 58, 62, 65, 69], ctaStart - morning, 0.06, 2400, 0.25, 0.5, false);
  epiano(morning, [65, 69, 72, 77], ctaStart - morning, 0.5);
  whoosh(morning + f(1), 0.3, 0.18);
  thud(morning + f(2), 0.14);
  thud(morning + f(12), 0.14);
  ding(morning + f(18), [81, 84, 88], 0.11);
}

// End card: drums stop, one Fadd9 chord rings out.
{
  kick(endCard, 0.55);
  bass(endCard, 41, 1.6, 0.3);
  epiano(endCard, [65, 69, 72, 76, 79], 2.6, 0.6);
  pad(endCard, [53, 57, 60, 64, 67], DURATION - endCard - 0.6, 0.06, 1800, 0.05, 0.9, false);
}

// ------------------------------------------------- per-scene sound effects

// Whooshes into the explainer scenes and the close.
for (const s of SCENES) {
  if (['avail', 'rates', 'house', 'desk', 'changes', 'roles', 'book', 'cta'].includes(s.id)) whoosh(s.from / FPS, 0.24, 0.13, s.from % 2 ? 0.3 : -0.3);
}

// Book: free -> pick (tap, scroll) -> book (tap, success) -> "No call".
tick(wordAt('n_book', 'free'), 2200, 0.1);
tap(wordAt('n_book', 'pick'));
whoosh(wordAt('n_book', 'pick') + f(10), 0.18, 0.07);
tap(wordAt('n_book', 'book'));
ding(wordAt('n_book', 'book') + f(5), [76, 81]);
thud(wordAt('n_book', 'No'), 0.2);
ding(wordAt('n_book', 'No') + f(2), [88], 0.08);

// Fixed scenes: problem card struck through, then thrown out.
for (const [id, strike, exit] of [
  ['avail', 3, 13],
  ['rates', 3, 12],
  ['house', 3, 12],
] as const) {
  marker(start(id) + f(strike), f(6), 1, 0.22);
  whoosh(start(id) + f(exit + 8), 0.22, 0.12, -0.5);
}

// Avail: night counted -> Not Available; second booking refused.
thud(wordAt('n_avail', 'counted'), 0.22);
tick(wordAt('n_avail', 'counted'), 1500, 0.14);
play(sfx, wordAt('n_avail', 'twice') - f(2), 0.16, (t) => Math.tanh(Math.sin(2 * Math.PI * 110 * t) * 3) * Math.exp(-t / 0.08), {gain: 0.07});

// Rates: tap "Set Weekends", four cells flip, save.
tap(wordAt('n_rates', 'Set'));
for (let k = 0; k < 4; k++) tick(wordAt('n_rates', 'Set') + f(3 + 3 * k), 2300 + k * 180, 0.13, k % 2 ? 0.3 : -0.3);
tap(wordAt('n_rates', 'once'));
ding(wordAt('n_rates', 'once') + f(4), [77, 81]);

// Housekeeping: tap Mark Clean; the front desk count updates.
tap(wordAt('n_house', 'clean'));
ding(wordAt('n_house', 'clean') + f(3), [81], 0.1);
whoosh(wordAt('n_house', 'front') + f(8), 0.2, 0.1, 0.5);
tick(wordAt('n_house', 'ready'), 2000, 0.14);
ding(wordAt('n_house', 'ready') + f(1), [84, 88], 0.09);

// Front desk: numbers count up with a soft rattle.
for (const w of ['Arrivals', 'departures', 'occupancy'] as const) {
  const t0 = wordAt('n_desk', w);
  for (let k = 0; k < 6; k++) tick(t0 + f(k * 2.2), 2600 + k * 90, 0.06);
}

// Changes: dates change, update tapped, success; cancel and policy pointed at.
tap(wordAt('n_changes', 'move') + f(6));
ding(wordAt('n_changes', 'move') + f(10), [76, 81]);
tick(wordAt('n_changes', 'cancel'), 1800, 0.1);
tick(wordAt('n_changes', 'day'), 2000, 0.1);

// Roles: each card slides in.
for (const w of ['whole', 'team', 'login', 'need'] as const) whoosh(wordAt('n_roles', w) + f(6), 0.16, 0.08, 0.5);

// CTA: card build, chips, URL.
for (let i = 0; i < 6; i++) tick(at('n_cta') + f(22 + i * 5), 2100 + i * 120, 0.08);
thud(wordAt('n_cta', 'See'), 0.16);
ding(wordAt('n_cta', 'See') + f(2), [84, 89], 0.1);

// --------------------------------------------------------------------- mix

// Phone-quality filter on the hold loop.
{
  const a = new SVF();
  const b = new SVF();
  const c = new SVF();
  for (let i = 0; i < N; i++) {
    let v = phoneMusic.L[i];
    v = a.process(v, 380, 0.8, 'hp');
    v = b.process(v, 3000, 0.8, 'lp');
    v = c.process(v, 3000, 0.8, 'lp');
    v = Math.tanh(v * 3) / 2.2;
    phoneMusic.L[i] = v;
    phoneMusic.R[i] = v;
  }
}

S.delay(delaySend, music, SPB * 0.75, 0.32, 0.5);
S.reverb(verbSend, music, 0.9);

// Bus gains: speech on top, music ~11 dB under it, room tone barely there.
const MUSIC = 0.2;
const HOLD = 0.75;
const SFX = 0.85;
const AMB = 0.2;
const L = new Float32Array(N);
const R = new Float32Array(N);
for (let i = 0; i < N; i++) {
  L[i] = voice.L[i] + music.L[i] * MUSIC + phoneMusic.L[i] * HOLD + sfx.L[i] * SFX + ambience.L[i] * AMB;
  R[i] = voice.R[i] + music.R[i] * MUSIC + phoneMusic.R[i] * HOLD + sfx.R[i] * SFX + ambience.R[i] * AMB;
}

if (process.env.MIX_REPORT) {
  const buses: Array<[string, InstanceType<typeof Bus>, number]> = [
    ['voice', voice, 1],
    ['music', music, MUSIC],
    ['hold', phoneMusic, HOLD],
    ['sfx', sfx, SFX],
    ['amb', ambience, AMB],
  ];
  console.log('scene      ' + buses.map(([n]) => n.padStart(8)).join('') + '   (RMS dBFS / peak dBFS, pre-master)');
  for (const sc of SCENES) {
    const a = Math.round((sc.from / FPS) * SR);
    const b = Math.min(N, Math.round(((sc.from + sc.duration) / FPS) * SR));
    const cells = buses.map(([, bus, g]) => {
      let s2 = 0;
      let pk = 0;
      for (let i = a; i < b; i++) {
        const v = bus.L[i] * g;
        s2 += v * v;
        pk = Math.max(pk, Math.abs(v));
      }
      const r = dbfs(Math.sqrt(s2 / (b - a)));
      return `${Number.isFinite(r) ? r.toFixed(0) : '-'}/${Number.isFinite(dbfs(pk)) ? dbfs(pk).toFixed(0) : '-'}`.padStart(8);
    });
    console.log(sc.id.padEnd(11) + cells.join(''));
  }
}

const rawPeak = peakOf(L, R);
const CEILING = Math.pow(10, -1.5 / 20);
const PRE_DB = 5.5;
// Speech sets the level: bring the narration up to a consistent loudness.
const pre = Math.pow(10, PRE_DB / 20);
for (let i = 0; i < N; i++) {
  L[i] *= pre;
  R[i] *= pre;
}
const touched = limit(L, R, SR, CEILING);
{
  const fade = Math.round(0.5 * SR);
  for (let i = N - fade; i < N; i++) {
    const k = (N - i) / fade;
    L[i] *= k;
    R[i] *= k;
  }
}

const out = path.join(root, 'public', 'call', 'mix.wav');
writeWav(out, L, R, SR);
let clipped = 0;
for (let i = 0; i < N; i++) if (Math.abs(L[i]) >= 1 || Math.abs(R[i]) >= 1) clipped++;
console.log(`wrote ${path.relative(root, out)}: ${DURATION.toFixed(2)} s, ${SR} Hz stereo`);
console.log(`raw peak ${dbfs(rawPeak).toFixed(2)} dBFS, limiter touched ${(100 * touched).toFixed(2)}%`);
console.log(`final peak ${dbfs(peakOf(L, R)).toFixed(2)} dBFS, RMS ${dbfs(rmsOf(L, R)).toFixed(2)} dBFS, clipped ${clipped}`);
