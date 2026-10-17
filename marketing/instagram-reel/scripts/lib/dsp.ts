// Small DSP toolkit for the synthesized soundtracks: oscillators, filters,
// buses, reverb, delay, a look-ahead limiter and WAV I/O. Plain TypeScript,
// run directly by Node.
import fs from 'node:fs';

export const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const dbfs = (x: number) => (x <= 0 ? -Infinity : 20 * Math.log10(x));

export type Synth = ReturnType<typeof createSynth>;

/** Everything bound to one sample rate, length and random seed. */
export const createSynth = (SR: number, N: number, seed: number) => {
  const rand = mulberry32(seed);
  const noise = () => rand() * 2 - 1;

  /** Topology-preserving state-variable filter; cutoff may move per sample. */
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
    add(other: Bus, gain = 1) {
      for (let i = 0; i < N; i++) {
        this.L[i] += other.L[i] * gain;
        this.R[i] += other.R[i] * gain;
      }
    }
  }

  type PlayOpts = {pan?: number; gain?: number; sends?: Array<[Bus, number]>; env?: Float32Array};

  /** Render a mono generator into a bus at time t0 (seconds). */
  const play = (bus: Bus, t0: number, dur: number, gen: (t: number) => number, o: PlayOpts = {}) => {
    const start = Math.max(0, Math.round(t0 * SR));
    const end = Math.min(N, Math.round((t0 + dur) * SR));
    const pan = o.pan ?? 0;
    const gain = o.gain ?? 1;
    const pl = Math.cos(((pan + 1) * Math.PI) / 4);
    const pr = Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = start; i < end; i++) {
      let x = gen(i / SR - t0) * gain;
      if (o.env) x *= o.env[i];
      bus.L[i] += x * pl;
      bus.R[i] += x * pr;
      if (o.sends) {
        for (const [b, amt] of o.sends) {
          b.L[i] += x * pl * amt;
          b.R[i] += x * pr * amt;
        }
      }
    }
  };

  /** Freeverb: 8 damped combs + 4 allpasses per channel, added to dst. */
  const reverb = (src: Bus, dst: Bus, wet: number, room = 0.84, damp = 0.25) => {
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

  /** Stereo ping-pong delay with darkened feedback, added to dst. */
  const delay = (src: Bus, dst: Bus, time: number, fb: number, wet: number) => {
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
    }
  };

  return {SR, N, rand, noise, SVF, Saw, Bus, play, reverb, delay};
};

/** Look-ahead peak limiter in place; returns the share of samples it touched. */
export const limit = (L: Float32Array, R: Float32Array, SR: number, ceiling: number) => {
  const N = L.length;
  const look = Math.round(0.004 * SR);
  const release = Math.exp(-1 / (0.08 * SR));
  const need = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    need[i] = p > ceiling ? ceiling / p : 1;
  }
  const target = new Float32Array(N).fill(1);
  const dq: number[] = [];
  let head = 0;
  for (let i = 0; i < N + look; i++) {
    if (i < N) {
      while (dq.length > head && need[dq[dq.length - 1]] >= need[i]) dq.pop();
      dq.push(i);
    }
    const j = i - look;
    if (j >= 0) {
      while (dq.length > head && dq[head] < j - look) head++;
      target[j] = dq.length > head ? need[dq[head]] : 1;
    }
  }
  let g = 1;
  let touched = 0;
  for (let i = 0; i < N; i++) {
    g = target[i] < g ? target[i] : target[i] + (g - target[i]) * release;
    if (g < 0.999) touched++;
    L[i] = Math.max(-ceiling, Math.min(ceiling, L[i] * g));
    R[i] = Math.max(-ceiling, Math.min(ceiling, R[i] * g));
  }
  return touched / N;
};

export const peakOf = (L: Float32Array, R: Float32Array) => {
  let p = 0;
  for (let i = 0; i < L.length; i++) p = Math.max(p, Math.abs(L[i]), Math.abs(R[i]));
  return p;
};

export const rmsOf = (L: Float32Array, R: Float32Array, from = 0, to = L.length) => {
  let s = 0;
  for (let i = from; i < to; i++) s += L[i] * L[i] + R[i] * R[i];
  return Math.sqrt(s / (2 * Math.max(1, to - from)));
};

/** Reads a 16-bit PCM WAV (mono or stereo) as mono float samples. */
export const readWav = (file: string): {sr: number; data: Float32Array} => {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${file}: not a WAV`);
  let off = 12;
  let sr = 0;
  let channels = 1;
  let bits = 16;
  while (off < b.length) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') {
      channels = b.readUInt16LE(off + 10);
      sr = b.readUInt32LE(off + 12);
      bits = b.readUInt16LE(off + 22);
    } else if (id === 'data') {
      if (bits !== 16) throw new Error(`${file}: expected 16-bit PCM`);
      const frames = size / (2 * channels);
      const data = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let v = 0;
        for (let c = 0; c < channels; c++) v += b.readInt16LE(off + 8 + (i * channels + c) * 2);
        data[i] = v / channels / 32768;
      }
      return {sr, data};
    }
    off += 8 + size + (size % 2);
  }
  throw new Error(`${file}: no data chunk`);
};

/** 2x upsampling with a Hann-windowed sinc interpolator (for 24 kHz voice into a 48 kHz mix). */
export const upsample2 = (x: Float32Array): Float32Array => {
  const taps = 24;
  const h: number[] = [];
  for (let k = -taps + 1; k <= taps; k++) {
    const t = k - 0.5;
    const sinc = Math.sin(Math.PI * t) / (Math.PI * t);
    const w = 0.5 + 0.5 * Math.cos((Math.PI * t) / taps);
    h.push(sinc * w);
  }
  const y = new Float32Array(x.length * 2);
  for (let n = 0; n < x.length; n++) {
    y[2 * n] = x[n];
    let s = 0;
    for (let k = -taps + 1, j = 0; k <= taps; k++, j++) {
      const idx = n + k;
      if (idx >= 0 && idx < x.length) s += x[idx] * h[j];
    }
    y[2 * n + 1] = s;
  }
  return y;
};

export const writeWav = (file: string, L: Float32Array, R: Float32Array, SR: number) => {
  const N = L.length;
  const data = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), i * 4);
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), i * 4 + 2);
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
  fs.writeFileSync(file, Buffer.concat([header, data]));
};
