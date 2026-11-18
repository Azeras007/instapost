// Musique originale générée par code : 100 % libre de droits, chaque Reel a son morceau.
// Un "style" (lofi, house, bossa, musette...) + une graine (seed) => un morceau unique.
// Synthèse maison : FM (piano électrique), Karplus-Strong (cordes pincées), oscillateurs filtrés,
// batterie synthétique, réverbération type Freeverb. Sortie : WAV stéréo 44,1 kHz.

export const SR = 44100;
const TAU = Math.PI * 2;

// --- Utilitaires -------------------------------------------------------------

export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s) {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

// Filtre biquad (RBJ).
class Biquad {
  constructor(type, freq, q = 0.707) {
    const w = (TAU * Math.min(freq, SR * 0.45)) / SR;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
    else if (type === 'hp') [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
    else [b0, b1, b2] = [alpha, 0, -alpha]; // bp
    const a0 = 1 + alpha;
    this.b = [b0 / a0, b1 / a0, b2 / a0];
    this.a = [(-2 * cos) / a0, (1 - alpha) / a0];
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
  run(x) {
    const y = this.b[0] * x + this.b[1] * this.x1 + this.b[2] * this.x2 - this.a[0] * this.y1 - this.a[1] * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
  process(buf) {
    for (let i = 0; i < buf.length; i++) buf[i] = this.run(buf[i]);
    return buf;
  }
}

// Saw / carré à bande limitée (polyBLEP) pour éviter le son "numérique" agressif.
function polyblep(t, dt) {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}
const saw = (ph, dt) => 2 * ph - 1 - polyblep(ph, dt);
const square = (ph, dt, pw = 0.5) => (ph < pw ? 1 : -1) + polyblep(ph, dt) - polyblep((ph + 1 - pw) % 1, dt);

function env(t, dur, a, d, s, r) {
  if (t < 0) return 0;
  let v;
  if (t < a) v = t / a;
  else if (t < a + d) v = 1 - ((t - a) / d) * (1 - s);
  else v = s;
  if (t > dur) v *= Math.max(0, 1 - (t - dur) / r);
  return v;
}

// --- Mixeur ------------------------------------------------------------------

class Track {
  constructor(len, { gain = 1, pan = 0, send = 0.2 } = {}) {
    this.buf = new Float32Array(len);
    Object.assign(this, { gain, pan, send });
  }
  // Ajoute un signal généré sample par sample : fn(t, i) -> valeur
  write(start, length, fn) {
    const i0 = Math.max(0, Math.round(start * SR));
    const n = Math.min(Math.round(length * SR), this.buf.length - i0);
    for (let i = 0; i < n; i++) this.buf[i0 + i] += fn(i / SR, i);
  }
  addBuffer(start, data, gain = 1) {
    const i0 = Math.round(start * SR);
    for (let i = 0; i < data.length && i0 + i < this.buf.length; i++) if (i0 + i >= 0) this.buf[i0 + i] += data[i] * gain;
  }
}

// Réverbération stéréo type Freeverb.
function reverb(input, { room = 0.84, damp = 0.3, spread = 23 } = {}) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const alls = [556, 441, 341, 225];
  const channel = (offset) => {
    const out = new Float32Array(input.length);
    for (const L of combs) {
      const len = Math.round(((L + offset) * SR) / 44100);
      const b = new Float32Array(len);
      let idx = 0;
      let store = 0;
      for (let i = 0; i < input.length; i++) {
        const y = b[idx];
        store = y * (1 - damp) + store * damp;
        b[idx] = input[i] * 0.015 + store * room;
        out[i] += y;
        if (++idx >= len) idx = 0;
      }
    }
    for (const L of alls) {
      const len = Math.round(((L + offset) * SR) / 44100);
      const b = new Float32Array(len);
      let idx = 0;
      for (let i = 0; i < out.length; i++) {
        const bo = b[idx];
        const y = -out[i] + bo;
        b[idx] = out[i] + bo * 0.5;
        out[i] = y;
        if (++idx >= len) idx = 0;
      }
    }
    return out;
  };
  return [channel(0), channel(spread)];
}

// --- Instruments -------------------------------------------------------------

const I = {
  // Piano électrique (FM, type Rhodes)
  epiano(tr, t0, m, dur, vel = 0.5) {
    const f = mtof(m);
    tr.write(t0, dur + 1.2, (t) => {
      const e = env(t, dur, 0.004, 1.5, 0.35, 0.6) * Math.exp(-t * 0.6);
      const mod = Math.sin(TAU * f * t) * (1.6 * Math.exp(-t * 6) + 0.25);
      const tine = Math.sin(TAU * f * 7.1 * t) * 0.08 * Math.exp(-t * 18);
      return (Math.sin(TAU * f * t + mod) + tine) * e * vel * (1 + 0.12 * Math.sin(TAU * 4.5 * t));
    });
  },
  // Piano acoustique (additif, partiels légèrement inharmoniques)
  piano(tr, t0, m, dur, vel = 0.5) {
    const f = mtof(m);
    const parts = [1, 2, 3, 4, 5, 6].map((n) => ({ f: f * n * Math.sqrt(1 + 0.0004 * n * n), a: 1 / n ** 1.4, d: 0.5 + n * 0.9 + m / 40 }));
    const bright = Math.min(1, vel * 1.6);
    tr.write(t0, dur + 1.5, (t) => {
      let s = 0;
      for (const p of parts) s += Math.sin(TAU * p.f * t) * p.a * Math.exp(-t * p.d * (1.2 - bright * 0.4));
      const rel = t > dur ? Math.max(0, 1 - (t - dur) / 0.35) : 1;
      return s * vel * 0.55 * Math.min(1, t / 0.002) * rel;
    });
  },
  // Corde pincée (Karplus-Strong) : guitare nylon, folk, clavecin...
  pluck(tr, t0, m, dur, vel = 0.5, { bright = 0.5, decay = 0.996 } = {}, r = Math.random) {
    const f = mtof(m);
    const N = Math.max(2, Math.round(SR / f));
    const line = new Float32Array(N);
    let prev = 0;
    for (let i = 0; i < N; i++) {
      const n = r() * 2 - 1;
      prev = prev + (n - prev) * (0.2 + bright * 0.8);
      line[i] = prev;
    }
    const len = Math.round((dur + 0.8) * SR);
    const out = new Float32Array(len);
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const nxt = (idx + 1) % N;
      const v = line[idx];
      line[idx] = (v + line[nxt]) * 0.5 * decay;
      out[i] = v * vel * (i / SR > dur ? Math.max(0, 1 - (i / SR - dur) / 0.15) : 1);
      idx = nxt;
    }
    tr.addBuffer(t0, out);
  },
  // Nappe : 3 dents de scie désaccordées, filtrées, attaque lente
  pad(tr, t0, m, dur, vel = 0.3, { cutoff = 1400, attack = 0.6 } = {}) {
    const f = mtof(m);
    const det = [0.994, 1, 1.006];
    const ph = [Math.random(), Math.random(), Math.random()];
    const lp = new Biquad('lp', cutoff, 0.8);
    tr.write(t0, dur + 1.2, (t) => {
      let s = 0;
      for (let k = 0; k < 3; k++) {
        const ff = f * det[k];
        ph[k] = (ph[k] + ff / SR) % 1;
        s += saw(ph[k], ff / SR);
      }
      return lp.run(s / 3) * env(t, dur, attack, 0.4, 0.85, 1) * vel;
    });
  },
  // Cordes (ensemble) avec vibrato
  strings(tr, t0, m, dur, vel = 0.3) {
    const f = mtof(m);
    const ph = [0, 0.33, 0.66, 0.1];
    const det = [0.996, 1.004, 0.999, 1.002];
    const lp = new Biquad('lp', 2200, 0.6);
    tr.write(t0, dur + 1, (t) => {
      const vib = 1 + 0.004 * Math.sin(TAU * 5.2 * t) * Math.min(1, t / 0.6);
      let s = 0;
      for (let k = 0; k < 4; k++) {
        const ff = f * det[k] * vib;
        ph[k] = (ph[k] + ff / SR) % 1;
        s += saw(ph[k], ff / SR);
      }
      return lp.run(s / 4) * env(t, dur, 0.35, 0.3, 0.9, 0.8) * vel;
    });
  },
  // Accordéon / orgue de musette : anches désaccordées + vibrato
  accordion(tr, t0, m, dur, vel = 0.3) {
    const f = mtof(m);
    const ph = [0, 0.5, 0.25];
    const det = [1, 1.0045, 0.9955];
    const lp = new Biquad('lp', 3200, 0.7);
    tr.write(t0, dur + 0.3, (t) => {
      let s = 0;
      for (let k = 0; k < 3; k++) {
        const ff = f * det[k];
        ph[k] = (ph[k] + ff / SR) % 1;
        s += square(ph[k], ff / SR, 0.42) * 0.6 + saw(ph[k], ff / SR) * 0.4;
      }
      return lp.run(s / 3) * env(t, dur, 0.02, 0.1, 0.85, 0.08) * vel * (1 + 0.15 * Math.sin(TAU * 6 * t));
    });
  },
  // Lead (carré / triangle) pour chiptune et synthpop
  lead(tr, t0, m, dur, vel = 0.25, { wave = 'square', pw = 0.5, cutoff = 5000, vibrato = 0.003 } = {}) {
    const f = mtof(m);
    let ph = 0;
    const lp = new Biquad('lp', cutoff, 0.9);
    tr.write(t0, dur + 0.2, (t) => {
      const ff = f * (1 + vibrato * Math.sin(TAU * 5.5 * t) * Math.min(1, t / 0.25));
      ph = (ph + ff / SR) % 1;
      const s = wave === 'tri' ? 1 - 4 * Math.abs(ph - 0.5) : wave === 'saw' ? saw(ph, ff / SR) : square(ph, ff / SR, pw);
      return lp.run(s) * env(t, dur, 0.008, 0.08, 0.7, 0.08) * vel;
    });
  },
  // Flûte / sifflement : sinus + souffle
  flute(tr, t0, m, dur, vel = 0.25) {
    const f = mtof(m);
    let ph = 0;
    const bp = new Biquad('bp', f * 2, 2);
    tr.write(t0, dur + 0.2, (t) => {
      const ff = f * (1 + 0.006 * Math.sin(TAU * 5 * t) * Math.min(1, t / 0.3));
      ph = (ph + ff / SR) % 1;
      const breath = bp.run(Math.random() * 2 - 1) * 0.25;
      return (Math.sin(TAU * ph) + 0.2 * Math.sin(2 * TAU * ph) + breath) * env(t, dur, 0.06, 0.1, 0.8, 0.12) * vel;
    });
  },
  // Cloche / mailloche (FM)
  bell(tr, t0, m, dur, vel = 0.25, ratio = 3.5) {
    const f = mtof(m);
    tr.write(t0, dur + 2, (t) => {
      const e = Math.exp(-t * 2.2) * Math.min(1, t / 0.002);
      return Math.sin(TAU * f * t + Math.sin(TAU * f * ratio * t) * 2.2 * Math.exp(-t * 3)) * e * vel;
    });
  },
  // Basse (sinus + harmonique), pour lofi / jazz / bossa
  bass(tr, t0, m, dur, vel = 0.6, { tone = 0.3 } = {}) {
    const f = mtof(m);
    tr.write(t0, dur + 0.1, (t) => {
      const s = Math.sin(TAU * f * t) + tone * Math.sin(2 * TAU * f * t) + tone * 0.4 * Math.sin(3 * TAU * f * t);
      return s * env(t, dur, 0.005, 0.25, 0.6, 0.06) * vel;
    });
  },
  // Basse synthé (dent de scie filtrée, enveloppe de filtre)
  synthbass(tr, t0, m, dur, vel = 0.5, { cutoff = 900, q = 1.4 } = {}) {
    const f = mtof(m);
    let ph = 0;
    let lp = new Biquad('lp', cutoff, q);
    tr.write(t0, dur + 0.05, (t, i) => {
      if (i % 64 === 0) {
        const c = 120 + cutoff * Math.exp(-t * 9);
        const keep = lp;
        lp = new Biquad('lp', c, q);
        Object.assign(lp, { x1: keep.x1, x2: keep.x2, y1: keep.y1, y2: keep.y2 });
      }
      ph = (ph + f / SR) % 1;
      return lp.run(saw(ph, f / SR) * 0.7 + Math.sin(TAU * ph) * 0.5) * env(t, dur, 0.004, 0.1, 0.8, 0.04) * vel;
    });
  },
  // 808 : sinus long, glissando, saturé
  bass808(tr, t0, m, dur, vel = 0.7, glideFrom = null) {
    const f = mtof(m);
    const f0 = glideFrom ? mtof(glideFrom) : f;
    let ph = 0;
    tr.write(t0, dur + 0.1, (t) => {
      const ff = f + (f0 - f) * Math.exp(-t * 18) + f * 1.5 * Math.exp(-t * 60);
      ph = (ph + ff / SR) % 1;
      return Math.tanh(Math.sin(TAU * ph) * 1.8) * env(t, dur, 0.002, 0.4, 0.7, 0.12) * vel;
    });
  },
};

// --- Batterie ------------------------------------------------------------------

const noise = () => Math.random() * 2 - 1;
const D = {
  kick(tr, t0, vel = 0.9, { punch = 1, len = 0.38 } = {}) {
    let ph = 0;
    tr.write(t0, len + 0.05, (t) => {
      const f = 45 + 110 * punch * Math.exp(-t * 28);
      ph += f / SR;
      return (Math.sin(TAU * ph) * Math.exp(-t / (len * 0.4)) + (t < 0.004 ? noise() * 0.3 : 0)) * vel;
    });
  },
  snare(tr, t0, vel = 0.5, { tone = 190, len = 0.18 } = {}) {
    const hp = new Biquad('hp', 1200, 0.7);
    tr.write(t0, len + 0.05, (t) => (hp.run(noise()) * Math.exp(-t / (len * 0.35)) + Math.sin(TAU * tone * t) * 0.5 * Math.exp(-t * 30)) * vel);
  },
  clap(tr, t0, vel = 0.45) {
    const bp = new Biquad('bp', 1300, 1.2);
    tr.write(t0, 0.3, (t) => {
      const bursts = t < 0.03 ? (Math.floor(t / 0.01) % 2 ? 0.4 : 1) : 1;
      const e = t < 0.03 ? Math.exp(-(t % 0.01) * 300) : Math.exp(-(t - 0.03) * 18);
      return bp.run(noise()) * e * bursts * vel * 2.2;
    });
  },
  hat(tr, t0, vel = 0.2, open = false) {
    const hp = new Biquad('hp', 7500, 0.8);
    const d = open ? 0.12 : 0.018;
    tr.write(t0, open ? 0.4 : 0.08, (t) => hp.run(noise()) * Math.exp(-t / d) * vel);
  },
  rim(tr, t0, vel = 0.3) {
    tr.write(t0, 0.05, (t) => (Math.sin(TAU * 1700 * t) * 0.7 + noise() * 0.3) * Math.exp(-t * 160) * vel);
  },
  shaker(tr, t0, vel = 0.12) {
    const bp = new Biquad('bp', 6000, 1.5);
    tr.write(t0, 0.09, (t) => bp.run(noise()) * Math.min(1, t / 0.02) * Math.exp(-t * 45) * vel * 2.5);
  },
  tom(tr, t0, m = 45, vel = 0.6) {
    let ph = 0;
    const f = mtof(m);
    tr.write(t0, 0.6, (t) => {
      ph += (f * (1 + 0.5 * Math.exp(-t * 20))) / SR;
      return Math.sin(TAU * ph) * Math.exp(-t * 6) * vel;
    });
  },
  ride(tr, t0, vel = 0.12) {
    const ratios = [1, 1.47, 1.79, 2.31, 2.87, 3.41];
    const hp = new Biquad('hp', 5000, 0.7);
    tr.write(t0, 0.9, (t) => {
      let s = 0;
      for (const r of ratios) s += Math.sign(Math.sin(TAU * 420 * r * t));
      return hp.run(s / 6 + noise() * 0.4) * Math.exp(-t * 4) * vel;
    });
  },
  tambourine(tr, t0, vel = 0.15) {
    const hp = new Biquad('hp', 6500, 1);
    tr.write(t0, 0.2, (t) => hp.run(noise() * (1 + Math.sin(TAU * 60 * t))) * Math.exp(-t * 18) * vel);
  },
  crackle(tr, duration, density = 6, r = Math.random) {
    const n = Math.round(duration * density);
    for (let k = 0; k < n; k++) {
      const t0 = r() * duration;
      const a = (r() * 0.5 + 0.2) * (r() < 0.1 ? 2 : 1);
      tr.write(t0, 0.004, (t) => noise() * a * Math.exp(-t * 2000));
    }
    tr.write(0, duration, () => noise() * 0.006); // souffle de vinyle
  },
  riser(tr, t0, len = 2, vel = 0.25) {
    const bp = new Biquad('bp', 800, 1.5);
    tr.write(t0, len, (t, i) => {
      if (i % 128 === 0) {
        const keep = bp;
        const nb = new Biquad('bp', 400 + 6000 * (t / len) ** 2, 1.5);
        Object.assign(nb, { x1: keep.x1, x2: keep.x2, y1: keep.y1, y2: keep.y2 });
        Object.assign(bp, nb);
      }
      return bp.run(noise()) * (t / len) ** 2 * vel;
    });
  },
};

// --- Harmonie ------------------------------------------------------------------

function makeHarmony(key = 'C', mode = 'major') {
  const root = 48 + (NOTE[key] ?? 0); // octave 3
  const scale = SCALES[mode] || SCALES.major;
  const deg = (d) => root + scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  // Accord diatonique sur le degré d (0 = I) : triade ou 7e, renversements proches
  const chord = (d, size = 4) => Array.from({ length: size }, (_, k) => deg(d + 2 * k));
  return { root, scale, deg, chord };
}

// Accord rapproché autour d'un centre (évite les sauts)
function voice(notes, center = 62) {
  return notes
    .map((n) => {
      let x = n;
      while (x < center - 6) x += 12;
      while (x > center + 6) x -= 12;
      return x;
    })
    .sort((a, b) => a - b);
}

// Mélodie : motif répété (A A' B A), notes de l'accord sur les temps forts.
function melody(h, prog, bars, beats, r, { rhythms, low = 67, high = 81 }) {
  const notes = [];
  const motifs = [0, 1].map(() => rhythms[Math.floor(r() * rhythms.length)]);
  const shape = Array.from({ length: 16 }, () => Math.floor(r() * 5) - 2);
  for (let b = 0; b < bars; b++) {
    const ch = h.chord(prog[b % prog.length], 4);
    const rhythm = motifs[[0, 0, 1, 0][b % 4]];
    let lastPitch = null;
    rhythm.forEach(([pos, len], k) => {
      if (pos >= beats) return;
      const strong = Number.isInteger(pos);
      let target;
      if (strong || lastPitch === null) {
        const c = ch[(k + (b % 2)) % ch.length];
        target = c;
        while (target < low) target += 12;
        while (target > high) target -= 12;
      } else {
        const step = shape[(k + b) % shape.length] || 1;
        const idx = h.scale.findIndex((s) => (((lastPitch - h.root) % 12) + 12) % 12 === s);
        const d = (idx < 0 ? 0 : idx) + step + 7 * Math.floor((lastPitch - h.root) / 12);
        target = h.deg(d);
        while (target < low) target += 12;
        while (target > high) target -= 12;
      }
      lastPitch = target;
      notes.push({ bar: b, pos, len, m: target });
    });
  }
  return notes;
}

// --- Styles ------------------------------------------------------------------
// Chaque style reçoit un contexte et écrit dans des pistes.

const PROGS = {
  jazzy: [[1, 4, 0, 5], [0, 5, 1, 4], [3, 2, 1, 4], [5, 1, 4, 0]],
  pop: [[0, 4, 5, 3], [5, 3, 0, 4], [0, 5, 3, 4], [3, 0, 4, 5]],
  minor: [[0, 5, 2, 6], [0, 3, 6, 2], [0, 6, 5, 4], [5, 6, 0, 0]],
  folk: [[0, 3, 0, 4], [0, 4, 5, 3], [0, 3, 4, 0]],
  waltz: [[0, 4, 4, 0], [0, 3, 4, 0], [0, 5, 1, 4]],
};
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];

const STYLES = {
  // Lo-fi : piano électrique, beat poussiéreux, vinyle
  lofi: { bpm: [72, 88], mode: 'major', prog: 'jazzy', swing: 0.16 },
  // House légère : 4 temps, stabs, basse sur contretemps
  house: { bpm: [118, 124], mode: 'minor', prog: 'minor' },
  // Bossa nova : guitare nylon, rim, shaker
  bossa: { bpm: [128, 140], mode: 'major', prog: 'jazzy' },
  // Ambient : nappes, cloches, grande réverb
  ambient: { bpm: [60, 72], mode: 'major', prog: 'pop' },
  // Musette : valse à 3 temps, accordéon (très "terroir")
  musette: { bpm: [150, 172], mode: 'minor', prog: 'waltz', beats: 3 },
  // Cinématique : cordes, toms, piano
  cinematic: { bpm: [84, 96], mode: 'minor', prog: 'minor' },
  // Jazz : contrebasse marchante, ride, piano
  jazz: { bpm: [120, 150], mode: 'major', prog: 'jazzy', swing: 0.33 },
  // Chiptune : carrés, arpèges, bonne humeur
  chiptune: { bpm: [124, 140], mode: 'major', prog: 'pop' },
  // Folk : guitare grattée, tambourin, flûte
  folk: { bpm: [96, 112], mode: 'major', prog: 'folk' },
  // Hip-hop / trap : 808, charleston en rafales
  trap: { bpm: [136, 148], mode: 'minor', prog: 'minor' },
  // Synthwave : nappes, basse arpégée, grosse caisse claire
  synthwave: { bpm: [96, 108], mode: 'minor', prog: 'minor' },
  // Funk / disco : basse octaviée, clav, claps
  funk: { bpm: [108, 118], mode: 'dorian', prog: 'jazzy' },
  // Piano solo : arpèges doux
  piano: { bpm: [70, 84], mode: 'major', prog: 'pop' },
  // Reggae : skank sur contretemps, basse ronde
  reggae: { bpm: [74, 82], mode: 'major', prog: 'folk' },
};
export const MUSIC_STYLES = Object.keys(STYLES);

export function renderMusic({ style = 'lofi', seed = 1, bpm, key, duration = 15, mode } = {}) {
  const S = STYLES[style];
  if (!S) throw new Error(`Style musical inconnu : "${style}" (dispo : ${MUSIC_STYLES.join(', ')})`);
  const r = rng(seed);
  const keys = ['C', 'D', 'Eb', 'E', 'F', 'G', 'A', 'Bb'];
  key ??= pick(keys, r);
  bpm ??= Math.round(S.bpm[0] + r() * (S.bpm[1] - S.bpm[0]));
  const h = makeHarmony(key, mode || S.mode);
  const prog = pick(PROGS[S.prog], r);
  const beats = S.beats || 4;
  const spb = 60 / bpm;
  const barLen = spb * beats;
  const total = duration + 0.5;
  const len = Math.ceil(total * SR);
  const bars = Math.ceil(total / barLen);
  const swing = S.swing || 0;
  // position (en temps) -> secondes, avec swing sur les croches de contretemps
  const at = (bar, pos) => {
    const frac = pos % 1;
    const sw = Math.abs(frac - 0.5) < 1e-6 ? swing * spb * 0.5 : 0;
    return bar * barLen + pos * spb + sw;
  };
  const T = (opts) => new Track(len, opts);
  const tracks = [];
  const add = (opts) => {
    const t = T(opts);
    tracks.push(t);
    return t;
  };
  const ctx = { r, h, prog, beats, spb, barLen, bars, at, add, total, bpm, duration };
  const build = BUILD[style];
  const master = build(ctx) || {};

  // Mixage
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  const send = new Float32Array(len);
  for (const t of tracks) {
    const gl = t.gain * Math.cos(((t.pan + 1) * Math.PI) / 4);
    const gr = t.gain * Math.sin(((t.pan + 1) * Math.PI) / 4);
    for (let i = 0; i < len; i++) {
      const v = t.buf[i];
      L[i] += v * gl;
      R[i] += v * gr;
      send[i] += v * t.gain * t.send;
    }
  }
  const [rl, rr] = reverb(send, master.reverb);
  const wet = master.wet ?? 1;
  for (let i = 0; i < len; i++) {
    L[i] += rl[i] * wet;
    R[i] += rr[i] * wet;
  }
  if (master.lowpass) {
    new Biquad('lp', master.lowpass, 0.6).process(L);
    new Biquad('lp', master.lowpass, 0.6).process(R);
  }
  // HP à 30 Hz (nettoie), normalisation, saturation douce, fondus
  new Biquad('hp', 30).process(L);
  new Biquad('hp', 30).process(R);
  let peak = 1e-9;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 1.1 / peak;
  const fadeOut = 1.6;
  const n = Math.round(duration * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const fade = Math.min(1, t / 0.03) * Math.max(0, Math.min(1, (duration - t) / fadeOut));
    L[i] = Math.tanh(L[i] * g) * 0.89 * fade;
    R[i] = Math.tanh(R[i] * g) * 0.89 * fade;
  }
  return { left: L.subarray(0, n), right: R.subarray(0, n), bpm, key, style };
}

const BUILD = {
  lofi({ r, h, prog, bars, beats, at, add, total, spb }) {
    const keys = add({ gain: 0.5, pan: -0.1, send: 0.3 });
    const bass = add({ gain: 0.55, send: 0.02 });
    const drums = add({ gain: 0.6, send: 0.08 });
    const hats = add({ gain: 0.5, pan: 0.25, send: 0.05 });
    const vinyl = add({ gain: 0.6, send: 0 });
    const mel = add({ gain: 0.32, pan: 0.2, send: 0.4 });
    for (let b = 0; b < bars; b++) {
      const ch = voice(h.chord(prog[b % prog.length], 4), 60);
      ch.forEach((m, k) => I.epiano(keys, at(b, 0) + k * 0.012, m, spb * 2.6, 0.32));
      if (r() < 0.6) ch.slice(1).forEach((m) => I.epiano(keys, at(b, 2.5), m, spb * 1.2, 0.18));
      const root = h.chord(prog[b % prog.length])[0] - 12;
      I.bass(bass, at(b, 0), root, spb * 1.4, 0.7);
      I.bass(bass, at(b, 2.5), root + (r() < 0.5 ? 7 : 12), spb * 0.9, 0.55);
      D.kick(drums, at(b, 0), 0.9, { punch: 0.8 });
      D.kick(drums, at(b, 2.5), 0.7, { punch: 0.8 });
      D.snare(drums, at(b, 1), 0.38, { len: 0.22 });
      D.snare(drums, at(b, 3), 0.38, { len: 0.22 });
      for (let k = 0; k < beats * 2; k++) D.hat(hats, at(b, k / 2), k % 2 ? 0.12 : 0.2);
    }
    melody(h, prog, bars, beats, r, { rhythms: [[[0, 1], [1.5, 0.5], [2, 1.5]], [[0.5, 0.5], [1, 1], [2.5, 1]], [[0, 2], [3, 0.5], [3.5, 0.5]]] })
      .filter((n) => n.bar >= 2)
      .forEach((n) => I.bell(mel, at(n.bar, n.pos), n.m, n.len * spb, 0.2, 2));
    D.crackle(vinyl, total, 7, r);
    return { lowpass: 6500, reverb: { room: 0.8, damp: 0.5 } };
  },

  house({ r, h, prog, bars, beats, at, add, spb }) {
    const drums = add({ gain: 0.75, send: 0.03 });
    const hats = add({ gain: 0.45, pan: 0.2, send: 0.05 });
    const stabs = add({ gain: 0.32, pan: -0.15, send: 0.35 });
    const bass = add({ gain: 0.55, send: 0 });
    const pad = add({ gain: 0.22, send: 0.4 });
    const stabPattern = pick([[0.5, 1.5, 2.75, 3.5], [0.75, 1.5, 2.5, 3.25], [0, 1.5, 3]], r);
    for (let b = 0; b < bars; b++) {
      const ch = voice(h.chord(prog[b % prog.length], 4), 64);
      const root = h.chord(prog[b % prog.length])[0] - 12;
      for (let k = 0; k < beats; k++) {
        D.kick(drums, at(b, k), 0.95, { punch: 1.1, len: 0.3 });
        D.hat(hats, at(b, k + 0.5), 0.3, true);
        D.hat(hats, at(b, k + 0.25), 0.1);
        D.hat(hats, at(b, k + 0.75), 0.1);
        I.synthbass(bass, at(b, k + 0.5), root, spb * 0.4, 0.55, { cutoff: 700 });
      }
      D.clap(drums, at(b, 1), 0.5);
      D.clap(drums, at(b, 3), 0.5);
      if (b >= 1) stabPattern.forEach((p) => ch.forEach((m) => I.pad(stabs, at(b, p), m, spb * 0.22, 0.35, { cutoff: 2600, attack: 0.005 })));
      ch.forEach((m) => I.pad(pad, at(b, 0), m - 12, spb * 4, 0.2, { cutoff: 900, attack: 0.8 }));
    }
    return { reverb: { room: 0.75, damp: 0.4 } };
  },

  bossa({ r, h, prog, bars, beats, at, add, spb }) {
    const gtr = add({ gain: 0.7, pan: -0.15, send: 0.25 });
    const bass = add({ gain: 0.55, send: 0.05 });
    const perc = add({ gain: 0.45, pan: 0.2, send: 0.1 });
    const fl = add({ gain: 0.3, pan: 0.25, send: 0.45 });
    const comp = [0, 1.5, 3, 4.5, 6, 7]; // en croches sur 2 mesures -> on utilise par mesure
    const rhythm = [[0, 0.75], [1.5, 0.5], [2.5, 0.75], [3.5, 0.5]];
    for (let b = 0; b < bars; b++) {
      const ch = voice(h.chord(prog[b % prog.length], 4), 59);
      const root = h.chord(prog[b % prog.length])[0] - 12;
      I.bass(bass, at(b, 0), root, spb * 1.4, 0.7, { tone: 0.2 });
      I.bass(bass, at(b, 1.5), root + 7, spb * 0.5, 0.5, { tone: 0.2 });
      I.bass(bass, at(b, 2), root + 7, spb * 1.4, 0.6, { tone: 0.2 });
      I.bass(bass, at(b, 3.5), root, spb * 0.5, 0.5, { tone: 0.2 });
      I.pluck(gtr, at(b, 0), ch[0] - 12, spb * 0.9, 0.45, { bright: 0.35, decay: 0.997 }, r);
      I.pluck(gtr, at(b, 2), ch[0] - 5, spb * 0.9, 0.4, { bright: 0.35, decay: 0.997 }, r);
      (b % 2 ? rhythm.slice().reverse().map(([p, l], i) => [rhythm[i][0], l]) : rhythm).forEach(([p, l]) =>
        ch.slice(1).forEach((m, k) => I.pluck(gtr, at(b, p) + k * 0.008, m, spb * l, 0.3, { bright: 0.4, decay: 0.996 }, r))
      );
      [0, 0.75, 1.5, 2.5, 3.25].forEach((p) => D.rim(perc, at(b, b % 2 ? (p + 0.5) % 4 : p), 0.25));
      for (let k = 0; k < beats * 4; k++) D.shaker(perc, at(b, k / 4), k % 2 ? 0.08 : 0.14);
    }
    void comp;
    melody(h, prog, bars, beats, r, { rhythms: [[[0, 1.5], [1.5, 1], [2.5, 1.5]], [[0, 0.5], [0.5, 0.5], [1, 2]], [[1, 1], [2, 0.5], [2.5, 1.5]]], low: 69, high: 83 })
      .filter((n) => n.bar >= 2)
      .forEach((n) => I.flute(fl, at(n.bar, n.pos), n.m, n.len * spb * 0.95, 0.28));
    return { reverb: { room: 0.8, damp: 0.35 } };
  },

  ambient({ r, h, prog, bars, beats, at, add, spb }) {
    const pad = add({ gain: 0.4, send: 0.7 });
    const bells = add({ gain: 0.3, pan: 0.3, send: 0.8 });
    const low = add({ gain: 0.35, send: 0.3 });
    const notes = [];
    for (let b = 0; b < bars; b++) {
      const ch = voice(h.chord(prog[b % prog.length], 4), 62);
      ch.forEach((m) => I.pad(pad, at(b, 0), m, spb * beats + 0.3, 0.25, { cutoff: 1100 + 500 * r(), attack: 1.2 }));
      I.pad(low, at(b, 0), h.chord(prog[b % prog.length])[0] - 12, spb * beats, 0.4, { cutoff: 400, attack: 0.9 });
      const arp = [0, 1, 2, 3, 2, 1].map((k) => ch[k % 4] + 12);
      for (let k = 0; k < beats * 2; k++) if (r() < 0.55) notes.push([at(b, k / 2), arp[k % arp.length]]);
    }
    notes.forEach(([t, m]) => I.bell(bells, t, m, spb, 0.16, 3.5));
    return { reverb: { room: 0.9, damp: 0.2 }, wet: 1.3 };
  },

  musette({ r, h, prog, bars, beats, at, add, spb }) {
    const acc = add({ gain: 0.42, pan: 0.1, send: 0.2 });
    const chords = add({ gain: 0.3, pan: -0.2, send: 0.15 });
    const bass = add({ gain: 0.5, send: 0.05 });
    const perc = add({ gain: 0.3, send: 0.1 });
    for (let b = 0; b < bars; b++) {
      const ch = voice(h.chord(prog[b % prog.length], 3), 60);
      const root = h.chord(prog[b % prog.length])[0] - 12;
      I.bass(bass, at(b, 0), b % 2 ? root + 7 : root, spb * 0.8, 0.75, { tone: 0.45 });
      [1, 2].forEach((p) => ch.forEach((m) => I.accordion(chords, at(b, p), m, spb * 0.45, 0.25)));
      D.rim(perc, at(b, 1), 0.15);
      D.rim(perc, at(b, 2), 0.15);
    }
    // Mélodie en croches tournoyantes typique de la valse musette
    melody(h, prog, bars, beats, r, {
      rhythms: [[[0, 1], [1, 0.5], [1.5, 0.5], [2, 1]], [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 1]], [[0, 2], [2, 1]]],
      low: 67,
      high: 84,
    })
      .filter((n) => n.bar >= 1)
      .forEach((n) => I.accordion(acc, at(n.bar, n.pos), n.m, n.len * spb * 0.92, 0.32));
    return { reverb: { room: 0.7, damp: 0.5 } };
  },

  cinematic({ r, h, prog, bars, beats, at, add, spb }) {
    const str = add({ gain: 0.38, send: 0.5 });
    const lowstr = add({ gain: 0.42, send: 0.3 });
    const pno = add({ gain: 0.38, pan: 0.15, send: 0.5 });
    const drums = add({ gain: 0.7, send: 0.35 });
    for (let b = 0; b < bars; b++) {
      const ch = voice(h.chord(prog[b % prog.length], 3), 64);
      const root = h.chord(prog[b % prog.length])[0];
      ch.forEach((m) => I.strings(str, at(b, 0), m, spb * beats, 0.24));
      I.strings(lowstr, at(b, 0), root - 24, spb * beats, 0.35);
      I.strings(lowstr, at(b, 0), root - 12, spb * beats, 0.25);
      for (let k = 0; k < beats * 2; k++) I.piano(pno, at(b, k / 2), ch[[0, 1, 2, 1][k % 4]] + 12, spb * 0.5, 0.3);
      D.tom(drums, at(b, 0), 38, 0.9);
      if (b >= 1) {
        D.tom(drums, at(b, 2.5), 41, 0.55);
        D.tom(drums, at(b, 3), 43, 0.6);
      }
      if (b % 2 === 1) D.tom(drums, at(b, 3.5), 45, 0.6);
    }
    return { reverb: { room: 0.88, damp: 0.25 } };
  },

  jazz({ r, h, prog, bars, beats, at, add, spb }) {
    const bass = add({ gain: 0.6, send: 0.05 });
    const ride = add({ gain: 0.45, pan: 0.3, send: 0.1 });
    const pno = add({ gain: 0.45, pan: -0.2, send: 0.25 });
    const kit = add({ gain: 0.4, send: 0.1 });
    let prev = h.chord(prog[0])[0] - 12;
    for (let b = 0; b < bars; b++) {
      const chordNotes = h.chord(prog[b % prog.length], 4);
      const nextRoot = h.chord(prog[(b + 1) % prog.length])[0] - 12;
      // Basse marchante : fondamentale, notes d'accord, note d'approche chromatique
      const walk = [chordNotes[0] - 12, chordNotes[1 + Math.floor(r() * 2)] - 12, chordNotes[2] - 12, nextRoot + (r() < 0.5 ? -1 : 1)];
      walk.forEach((m, k) => {
        let x = m;
        while (x - prev > 7) x -= 12;
        while (prev - x > 7) x += 12;
        if (x < 33) x += 12;
        I.bass(bass, at(b, k), x, spb * 0.92, 0.7, { tone: 0.35 });
        prev = x;
      });
      [0, 1, 1.5, 2, 3, 3.5].forEach((p) => D.ride(ride, at(b, p), Number.isInteger(p) ? 0.13 : 0.08));
      D.hat(kit, at(b, 1), 0.15);
      D.hat(kit, at(b, 3), 0.15);
      const ch = voice(chordNotes.slice(1).concat(chordNotes[0] + 12), 64);
      const comp = pick([[1.5, 3.5], [0.5, 2], [1, 2.5], [2.5]], r);
      comp.forEach((p) => ch.forEach((m) => I.piano(pno, at(b, p), m, spb * 0.4, 0.22)));
    }
    melody(h, prog, bars, beats, r, { rhythms: [[[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 1], [3, 0.5], [3.5, 0.5]], [[0.5, 1], [2, 0.5], [2.5, 0.5], [3, 1]]], low: 70, high: 86 })
      .filter((n) => n.bar >= 2)
      .forEach((n) => I.piano(pno, at(n.bar, n.pos), n.m, n.len * spb, 0.42));
    return { reverb: { room: 0.7, damp: 0.5 } };
  },

  chiptune({ r, h, prog, bars, beats, at, add, spb }) {
    const lead = add({ gain: 0.22, pan: 0.1, send: 0.12 });
    const arp = add({ gain: 0.14, pan: -0.25, send: 0.1 });
    const bass = add({ gain: 0.3, send: 0 });
    const drums = add({ gain: 0.5, send: 0.05 });
    for (let b = 0; b < bars; b++) {
      const ch = voice(h.chord(prog[b % prog.length], 3), 66);
      const root = h.chord(prog[b % prog.length])[0] - 12;
      for (let k = 0; k < beats * 4; k++) I.lead(arp, at(b, k / 4), ch[k % 3] + 12, spb * 0.22, 0.5, { pw: 0.25 });
      for (let k = 0; k < beats * 2; k++) I.lead(bass, at(b, k / 2), root + (k % 2 ? 12 : 0), spb * 0.4, 0.7, { wave: 'tri' });
      D.kick(drums, at(b, 0), 0.8, { len: 0.18 });
      D.kick(drums, at(b, 2), 0.8, { len: 0.18 });
      D.snare(drums, at(b, 1), 0.3, { len: 0.1 });
      D.snare(drums, at(b, 3), 0.3, { len: 0.1 });
      for (let k = 0; k < beats * 2; k++) D.hat(drums, at(b, k / 2), 0.12);
    }
    melody(h, prog, bars, beats, r, { rhythms: [[[0, 0.5], [0.5, 0.5], [1, 1], [2, 0.5], [2.5, 0.5], [3, 1]], [[0, 1.5], [1.5, 0.5], [2, 2]], [[0, 0.75], [0.75, 0.75], [1.5, 0.5], [2, 2]]], low: 72, high: 88 })
      .filter((n) => n.bar >= 1)
      .forEach((n) => I.lead(lead, at(n.bar, n.pos), n.m, n.len * spb * 0.9, 0.5, { pw: 0.5, vibrato: 0.006 }));
    return { reverb: { room: 0.5, damp: 0.6 }, wet: 0.6 };
  },

  folk({ r, h, prog, bars, beats, at, add, spb }) {
    const gtr = add({ gain: 0.55, pan: -0.2, send: 0.2 });
    const gtr2 = add({ gain: 0.4, pan: 0.35, send: 0.2 });
    const perc = add({ gain: 0.5, send: 0.1 });
    const fl = add({ gain: 0.3, pan: 0.1, send: 0.4 });
    const bass = add({ gain: 0.45, send: 0.05 });
    const strum = [[0, 1], [1, -1], [1.5, 1], [2.5, -1], [3, 1], [3.5, -1]];
    for (let b = 0; b < bars; b++) {
      const triad = h.chord(prog[b % prog.length], 3);
      const shape = [triad[0] - 12, triad[2] - 12, triad[0], triad[1], triad[2], triad[0] + 12];
      strum.forEach(([p, dir]) => {
        const order = dir > 0 ? shape : shape.slice().reverse();
        order.forEach((m, k) => I.pluck(gtr, at(b, p) + k * 0.011, m, spb * 0.9, dir > 0 ? 0.22 : 0.15, { bright: 0.75, decay: 0.995 }, r));
      });
      for (let k = 0; k < beats * 2; k++) I.pluck(gtr2, at(b, k / 2), shape[[2, 4, 3, 5, 2, 4, 3, 5][k]] + 12, spb * 0.5, 0.18, { bright: 0.6, decay: 0.996 }, r);
      I.bass(bass, at(b, 0), triad[0] - 24, spb * 1.8, 0.6);
      I.bass(bass, at(b, 2), triad[2] - 24, spb * 1.8, 0.5);
      D.kick(perc, at(b, 0), 0.6, { punch: 0.6 });
      D.kick(perc, at(b, 2), 0.5, { punch: 0.6 });
      D.tambourine(perc, at(b, 1), 0.28);
      D.tambourine(perc, at(b, 3), 0.28);
    }
    melody(h, prog, bars, beats, r, { rhythms: [[[0, 1], [1, 1], [2, 2]], [[0, 1.5], [1.5, 0.5], [2, 1], [3, 1]], [[0, 0.5], [0.5, 0.5], [1, 3]]], low: 72, high: 86 })
      .filter((n) => n.bar >= 2)
      .forEach((n) => I.flute(fl, at(n.bar, n.pos), n.m, n.len * spb * 0.95, 0.24));
    return { reverb: { room: 0.75, damp: 0.4 } };
  },

  trap({ r, h, prog, bars, beats, at, add, spb }) {
    const b8 = add({ gain: 0.6, send: 0 });
    const drums = add({ gain: 0.6, send: 0.08 });
    const hats = add({ gain: 0.42, pan: 0.2, send: 0.04 });
    const keys = add({ gain: 0.3, pan: -0.2, send: 0.5 });
    let last = null;
    for (let b = 0; b < bars; b++) {
      const ch = voice(h.chord(prog[b % prog.length], 3), 67);
      const root = h.chord(prog[b % prog.length])[0] - 24;
      // demi-tempo : caisse claire sur le 3
      D.kick(drums, at(b, 0), 0.9, { len: 0.25 });
      if (r() < 0.6) D.kick(drums, at(b, 1.75), 0.7, { len: 0.25 });
      D.clap(drums, at(b, 2), 0.55);
      I.bass808(b8, at(b, 0), root, spb * 1.6, 0.7, last);
      I.bass808(b8, at(b, 2.5), root + (r() < 0.5 ? 12 : 7), spb * 1.2, 0.55, root);
      last = root;
      for (let k = 0; k < beats * 2; k++) {
        if (r() < 0.25) for (let j = 0; j < 3; j++) D.hat(hats, at(b, k / 2) + (j * spb) / 6, 0.14);
        else D.hat(hats, at(b, k / 2), k % 2 ? 0.12 : 0.18);
      }
      ch.forEach((m) => I.bell(keys, at(b, 0), m, spb * 2, 0.12, 1));
      [1, 1.5, 3].forEach((p, k) => I.bell(keys, at(b, p), ch[(k + b) % 3] + 12, spb * 0.5, 0.12, 2));
    }
    return { reverb: { room: 0.8, damp: 0.3 } };
  },

  synthwave({ r, h, prog, bars, beats, at, add, spb }) {
    const pad = add({ gain: 0.3, send: 0.5 });
    const bass = add({ gain: 0.42, send: 0.05 });
    const drums = add({ gain: 0.65, send: 0.3 });
    const lead = add({ gain: 0.22, pan: 0.15, send: 0.4 });
    for (let b = 0; b < bars; b++) {
      const ch = voice(h.chord(prog[b % prog.length], 4), 62);
      const root = h.chord(prog[b % prog.length])[0] - 12;
      ch.forEach((m) => I.pad(pad, at(b, 0), m, spb * beats, 0.24, { cutoff: 1800, attack: 0.3 }));
      for (let k = 0; k < beats * 4; k++) I.synthbass(bass, at(b, k / 4), root + (k % 4 === 2 ? 12 : 0), spb * 0.2, 0.5, { cutoff: 1200 });
      D.kick(drums, at(b, 0), 0.9);
      D.kick(drums, at(b, 2), 0.9);
      D.snare(drums, at(b, 1), 0.55, { len: 0.35, tone: 170 });
      D.snare(drums, at(b, 3), 0.55, { len: 0.35, tone: 170 });
      for (let k = 0; k < beats * 2; k++) D.hat(drums, at(b, k / 2), 0.1);
    }
    melody(h, prog, bars, beats, r, { rhythms: [[[0, 1.5], [1.5, 1.5], [3, 1]], [[0, 3], [3, 0.5], [3.5, 0.5]]], low: 69, high: 84 })
      .filter((n) => n.bar >= 2)
      .forEach((n) => I.lead(lead, at(n.bar, n.pos), n.m, n.len * spb * 0.9, 0.45, { wave: 'saw', cutoff: 2600, vibrato: 0.005 }));
    return { reverb: { room: 0.86, damp: 0.3 } };
  },

  funk({ r, h, prog, bars, beats, at, add, spb }) {
    const bass = add({ gain: 0.55, send: 0.02 });
    const clav = add({ gain: 0.35, pan: -0.3, send: 0.1 });
    const drums = add({ gain: 0.65, send: 0.06 });
    const hats = add({ gain: 0.4, pan: 0.25, send: 0.04 });
    const brass = add({ gain: 0.22, pan: 0.2, send: 0.25 });
    const groove = pick([[0, 0.75, 1.5, 2, 2.75, 3.5], [0, 0.5, 1.75, 2.5, 3, 3.75]], r);
    for (let b = 0; b < bars; b++) {
      const ch = voice(h.chord(prog[b % prog.length], 4), 64);
      const root = h.chord(prog[b % prog.length])[0] - 24;
      groove.forEach((p, k) => I.synthbass(bass, at(b, p), root + (k % 3 === 1 ? 12 : 0), spb * 0.3, 0.6, { cutoff: 1500, q: 2 }));
      [0.5, 1.25, 2.5, 3.25].forEach((p) => ch.forEach((m) => I.pluck(clav, at(b, p), m, spb * 0.15, 0.18, { bright: 0.95, decay: 0.99 }, r)));
      D.kick(drums, at(b, 0), 0.9);
      D.kick(drums, at(b, 2.5), 0.75);
      D.clap(drums, at(b, 1), 0.45);
      D.snare(drums, at(b, 3), 0.45);
      for (let k = 0; k < beats * 4; k++) D.hat(hats, at(b, k / 4), k % 2 ? 0.07 : 0.15, k === 14);
      if (b % 2 === 1) ch.forEach((m) => I.lead(brass, at(b, 3.5), m + 12, spb * 0.4, 0.2, { wave: 'saw', cutoff: 2400 }));
    }
    return { reverb: { room: 0.6, damp: 0.5 } };
  },

  piano({ r, h, prog, bars, beats, at, add, spb }) {
    const lh = add({ gain: 0.5, pan: -0.15, send: 0.45 });
    const rh = add({ gain: 0.5, pan: 0.15, send: 0.45 });
    for (let b = 0; b < bars; b++) {
      const triad = h.chord(prog[b % prog.length], 3);
      const pat = [triad[0] - 12, triad[2] - 12, triad[1], triad[2] - 12];
      for (let k = 0; k < beats * 2; k++) I.piano(lh, at(b, k / 2), pat[k % 4], spb * 1.5, 0.28);
    }
    melody(h, prog, bars, beats, r, { rhythms: [[[0, 1.5], [1.5, 0.5], [2, 2]], [[0, 1], [1, 1], [2, 1], [3, 1]], [[0, 3], [3, 1]]], low: 67, high: 84 })
      .filter((n) => n.bar >= 1)
      .forEach((n) => I.piano(rh, at(n.bar, n.pos), n.m, n.len * spb, 0.45));
    return { reverb: { room: 0.88, damp: 0.3 } };
  },

  reggae({ r, h, prog, bars, beats, at, add, spb }) {
    const skank = add({ gain: 0.4, pan: 0.2, send: 0.2 });
    const organ = add({ gain: 0.18, pan: -0.2, send: 0.2 });
    const bass = add({ gain: 0.7, send: 0.02 });
    const drums = add({ gain: 0.55, send: 0.15 });
    for (let b = 0; b < bars; b++) {
      const ch = voice(h.chord(prog[b % prog.length], 3), 66);
      const root = h.chord(prog[b % prog.length])[0] - 12;
      [0.5, 1.5, 2.5, 3.5].forEach((p) => {
        ch.forEach((m) => I.pluck(skank, at(b, p), m, spb * 0.12, 0.22, { bright: 0.9, decay: 0.985 }, r));
        ch.forEach((m) => I.accordion(organ, at(b, p + 0.02), m, spb * 0.18, 0.18));
      });
      [[0, root, 1], [1.5, root + 7, 0.5], [2, root + 12, 0.75], [3, root + 7, 0.5], [3.5, root + 4, 0.5]].forEach(([p, m, l]) =>
        I.bass(bass, at(b, p), m - 12, spb * l, 0.75, { tone: 0.15 })
      );
      D.kick(drums, at(b, 2), 0.85, { punch: 0.7 }); // "one drop"
      D.rim(drums, at(b, 2), 0.4);
      for (let k = 0; k < beats * 2; k++) D.hat(drums, at(b, k / 2), k % 2 ? 0.14 : 0.08);
    }
    return { reverb: { room: 0.7, damp: 0.4 } };
  },
};

// WAV 16 bits stéréo
export function toWav({ left, right }) {
  const n = left.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), 46 + i * 4);
  }
  return buf;
}
