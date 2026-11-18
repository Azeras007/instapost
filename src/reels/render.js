// Rendu d'un Reel : scènes animées (satori, en parallèle) + musique générée -> MP4 1080x1920 H.264/AAC.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import { ROOT } from '../content.js';
import { PALETTES, FONTS, BACKGROUNDS, W, H, bgAsSatori, paletteFill } from './look.js';
import { SCENES, ease, clamp, esc } from './scenes.js';
import { renderMusic, toWav, hashString } from './music.js';

export const FPS = 30;
const TRANSITION = 0.45;
const DEFAULT_DURATION = {
  title: 3.2, bigword: 3.6, count: 3.6, list: 6, versus: 7, glass: 4.8, quote: 4.5, quiz: 7, myth: 6.5, timeline: 7,
  map: 4.8, bars: 6.5, cards: 9, define: 6, split: 4.5, steps: 8, marquee: 3.5, bottle: 7, chat: 8, search: 6,
  notifs: 6.5, pairing: 9, orbit: 6, grid: 7, flash: 4, photo: 4, cta: 3.6,
};

const FFMPEG = process.env.FFMPEG || 'ffmpeg';

export function timeline(reel) {
  let t = 0;
  const scenes = reel.scenes.map((s) => {
    if (!SCENES[s.type]) throw new Error(`${reel.id} : scène inconnue "${s.type}" (dispo : ${Object.keys(SCENES).join(', ')})`);
    const d = s.duration ?? DEFAULT_DURATION[s.type] ?? 4;
    const out = { ...s, start: t, d };
    t += d;
    return out;
  });
  return { scenes, total: Number(t.toFixed(3)) };
}

export function lookOf(reel) {
  const look = { palette: 'bordeaux', font: 'classic', bg: 'flat', transition: 'fade', brand: 'top', ...(reel.look || {}) };
  const p = PALETTES[look.palette];
  const F = FONTS[look.font];
  if (!p) throw new Error(`${reel.id} : palette inconnue "${look.palette}" (dispo : ${Object.keys(PALETTES).join(', ')})`);
  if (!F) throw new Error(`${reel.id} : police inconnue "${look.font}" (dispo : ${Object.keys(FONTS).join(', ')})`);
  if (!BACKGROUNDS[look.bg]) throw new Error(`${reel.id} : fond inconnu "${look.bg}" (dispo : ${Object.keys(BACKGROUNDS).join(', ')})`);
  return { look, p, F };
}

function musicOf(reel) {
  const m = reel.music || {};
  return { style: m.style || 'lofi', seed: m.seed ?? hashString(reel.id), bpm: m.bpm, key: m.key, mode: m.mode, file: m.file };
}

// Une scène, éventuellement avec sa propre palette (fond plein).
function sceneHtml(s, t, base, brand, beat) {
  const p = s.palette ? PALETTES[s.palette] : base.p;
  if (!p) throw new Error(`palette inconnue "${s.palette}"`);
  const c = { t, d: s.d, p, F: s.font ? FONTS[s.font] : base.F, look: base.look, beat };
  const inner = SCENES[s.type](s, c, brand);
  const bg = s.palette ? `background:${p.bg};` : '';
  const deco = s.palette && s.bg ? bgAsSatori(BACKGROUNDS[s.bg](t, p)) : '';
  return { inner: `${deco}${inner}`, bg };
}

function layer(content, style) {
  return `<div style="display:flex;position:absolute;top:0;left:0;width:${W}px;height:${H}px;${style}">${content}</div>`;
}

export function frameMarkup(reel, ctx, T) {
  const { scenes, total } = ctx.tl;
  const { look, p } = ctx;
  let i = scenes.findIndex((s) => T < s.start + s.d);
  if (i < 0) i = scenes.length - 1;
  const cur = scenes[i];
  const lt = T - cur.start;
  const tr = cur.transition ?? look.transition;
  const e = i > 0 && tr !== 'cut' ? ease.inOut(clamp(lt / TRANSITION)) : 1;

  const a = sceneHtml(cur, lt, ctx, ctx.brand, ctx.beat);
  let layers;
  if (e < 1) {
    const prev = scenes[i - 1];
    const b = sceneHtml(prev, T - prev.start, ctx, ctx.brand, ctx.beat);
    const P = (st) => layer(b.inner, b.bg + st);
    const C = (st) => layer(a.inner, a.bg + st);
    const f = (x) => x.toFixed(3);
    switch (tr) {
      case 'slide':
        layers = P(`transform:translateX(${f(-e * W)}px);`) + C(`transform:translateX(${f((1 - e) * W)}px);`);
        break;
      case 'up':
        layers = P(`transform:translateY(${f(-e * H * 0.4)}px);opacity:${f(1 - e)};`) + C(`transform:translateY(${f((1 - e) * H)}px);${a.bg || `background:${p.bg};`}`);
        break;
      case 'zoom':
        layers = P(`transform:scale(${f(1 + e * 0.5)});opacity:${f(1 - e)};`) + C(`transform:scale(${f(0.6 + 0.4 * e)});opacity:${f(e)};`);
        break;
      case 'spin':
        layers = P(`transform:rotate(${f(e * 12)}deg) scale(${f(1 - e * 0.3)});opacity:${f(1 - e)};`) + C(`transform:rotate(${f((1 - e) * -12)}deg) scale(${f(0.7 + 0.3 * e)});opacity:${f(e)};`);
        break;
      case 'wipe': {
        // un panneau de couleur balaie l'écran : il recouvre l'ancienne scène puis découvre la nouvelle
        const x = e < 0.5 ? -W + e * 2 * W : (e - 0.5) * 2 * W;
        layers = (e < 0.5 ? P('') : C('')) + `<div style="display:flex;position:absolute;top:0;left:${f(x)}px;width:${W}px;height:${H}px;background:${p.accent};"></div>`;
        break;
      }
      case 'flash': {
        const k = 1 - Math.abs(e * 2 - 1);
        layers = (e < 0.5 ? P('') : C('')) + `<div style="display:flex;position:absolute;top:0;left:0;width:${W}px;height:${H}px;background:${p.fg};opacity:${f(k)};"></div>`;
        break;
      }
      default: // fade
        layers = P(`opacity:${f(1 - e)};`) + C(`opacity:${f(e)};`);
    }
  } else layers = layer(a.inner, a.bg);

  let overlay = '';
  const NO_BRAND = ['split', 'flash', 'cta', 'photo'];
  if (look.brand !== 'none' && cur.brand !== false && !NO_BRAND.includes(cur.type) && !(e < 1 && NO_BRAND.includes(scenes[i - 1].type))) {
    const top = look.brand === 'bottom' ? 1500 : 150;
    const col = cur.palette ? PALETTES[cur.palette].fg : p.fg;
    overlay += `<div style="display:flex;position:absolute;top:${top}px;left:0;width:${W}px;justify-content:center;"><div style="display:flex;font-family:'Fraunces';font-weight:600;font-size:40px;color:${col};opacity:0.75;letter-spacing:1px;">${esc(ctx.brand.name)}</div></div>`;
  }
  if (look.progress) {
    overlay += `<div style="display:flex;position:absolute;top:120px;left:90px;width:900px;height:8px;border-radius:4px;background:${p.fg}33;"><div style="display:flex;width:${((T / total) * 900).toFixed(1)}px;height:8px;border-radius:4px;background:${p.accent};"></div></div>`;
  }
  return {
    markup: `<div style="display:flex;position:relative;width:${W}px;height:${H}px;">${layers}${overlay}</div>`,
    under: paletteFill(p.bg) + BACKGROUNDS[look.bg](T, p),
  };
}

// --- Pool de workers ------------------------------------------------------------

class Pool {
  constructor(n) {
    this.workers = Array.from({ length: n }, () => new Worker(new URL('./frame-worker.js', import.meta.url), { workerData: { root: ROOT } }));
    this.jobs = new Map();
    this.next = 0;
    this.id = 0;
    for (const w of this.workers)
      w.on('message', ({ id, buf, error }) => {
        const job = this.jobs.get(id);
        this.jobs.delete(id);
        if (error) job.reject(new Error(error));
        else job.resolve(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength));
      });
  }
  render({ markup, under }, png = false) {
    const id = this.id++;
    const w = this.workers[this.next++ % this.workers.length];
    return new Promise((resolve, reject) => {
      this.jobs.set(id, { resolve, reject });
      w.postMessage({ id, markup, under, png });
    });
  }
  close() {
    return Promise.all(this.workers.map((w) => w.terminate()));
  }
}

let pool;
function getPool() {
  pool ??= new Pool(Number(process.env.REEL_WORKERS) || Math.max(1, Math.min(8, os.availableParallelism?.() ?? os.cpus().length)));
  return pool;
}
export async function closePool() {
  if (pool) await pool.close();
  pool = null;
}

// --- Rendu complet ----------------------------------------------------------------

function imageToDataUri(rel) {
  const file = path.join(ROOT, rel);
  const ext = path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg');
  return `data:image/${ext};base64,${fs.readFileSync(file).toString('base64')}`;
}

export function reelContext(reel, config) {
  const { look, p, F } = lookOf(reel);
  const prepared = { ...reel, scenes: reel.scenes.map((s) => (s.image ? { ...s, bgImage: imageToDataUri(s.image) } : s)) };
  const tl = timeline(prepared);
  const music = musicOf(reel);
  return { reel: prepared, tl, look, p, F, brand: config.brand, music };
}

// Rend le Reel : outDir/reel.mp4 + outDir/cover.jpg. Options : { frames: [t...] } pour n'exporter que des images.
export async function renderCover(reel, config, file) {
  const ctx = reelContext(reel, config);
  ctx.beat = 0.5;
  const coverT = reel.cover ?? ctx.tl.scenes[0].d - 0.1;
  const tmp = `${file}.png`;
  fs.writeFileSync(tmp, await getPool().render(frameMarkup(reel, ctx, coverT), true));
  spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', tmp, '-q:v', '3', file]);
  fs.rmSync(tmp);
}

export async function renderReel(reel, config, outDir, { log = () => {} } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const ctx = reelContext(reel, config);
  const { total } = ctx.tl;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'));

  // 1. Musique
  let audioArgs;
  if (ctx.music.file) {
    audioArgs = ['-stream_loop', '-1', '-i', path.join(ROOT, ctx.music.file)];
  } else {
    const m = renderMusic({ ...ctx.music, duration: total });
    ctx.beat = 60 / m.bpm;
    const wav = path.join(tmp, 'music.wav');
    fs.writeFileSync(wav, toWav(m));
    audioArgs = ['-i', wav];
    log(`  musique : ${m.style}, ${m.bpm} bpm, tonalité ${m.key}`);
  }
  ctx.beat ??= 0.5;

  // 2. Images -> ffmpeg
  const mp4 = path.join(outDir, 'reel.mp4');
  const ff = spawn(
    FFMPEG,
    [
      '-y', '-loglevel', 'error',
      '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
      ...audioArgs,
      '-map', '0:v', '-map', '1:a',
      '-c:v', 'libx264', '-preset', process.env.REEL_PRESET || 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
      '-profile:v', 'high', '-level', '4.2', '-g', String(FPS * 2), '-r', String(FPS),
      '-af', `loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=${Math.max(0, total - 1.2).toFixed(2)}:d=1.2`,
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-t', total.toFixed(3), '-movflags', '+faststart', mp4,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] }
  );
  const done = new Promise((res, rej) => ff.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg a échoué (code ${code})`)))));
  const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));

  const p = getPool();
  const n = Math.round(total * FPS);
  const window = p.workers.length * 3;
  const queue = [];
  let last = null;
  let lastPromise = null;
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    const frame = frameMarkup(reel, ctx, f / FPS);
    const key = frame.markup + frame.under;
    const pr = key === last ? lastPromise : p.render(frame);
    last = key;
    lastPromise = pr;
    queue.push(pr);
    if (queue.length >= window) await write(await queue.shift());
  }
  while (queue.length) await write(await queue.shift());
  ff.stdin.end();
  await done;

  // 3. Couverture (image d'aperçu)
  // Couverture : fin de la 1re scène (texte entièrement affiché), ou `cover: <secondes>` dans le YAML
  const coverT = reel.cover ?? ctx.tl.scenes[0].d - 0.1;
  const png = await p.render(frameMarkup(reel, ctx, coverT), true);
  const coverPng = path.join(tmp, 'cover.png');
  fs.writeFileSync(coverPng, png);
  spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', coverPng, '-q:v', '3', path.join(outDir, 'cover.jpg')]);
  fs.rmSync(tmp, { recursive: true, force: true });
  log(`  ${n} images en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  return { video: mp4, cover: path.join(outDir, 'cover.jpg'), duration: total };
}

// Planche de contrôle : quelques images clés en PNG (relecture rapide sans vidéo)
export async function renderStills(reel, config, outDir, times) {
  fs.mkdirSync(outDir, { recursive: true });
  const ctx = reelContext(reel, config);
  ctx.beat = 0.5;
  const ts = times ?? ctx.tl.scenes.flatMap((s) => [s.start + Math.min(s.d * 0.5, 1.5), s.start + s.d - 0.05]);
  const p = getPool();
  const files = [];
  await Promise.all(
    ts.map(async (t, k) => {
      const f = path.join(outDir, `still-${String(k).padStart(2, '0')}-${t.toFixed(1)}s.png`);
      fs.writeFileSync(f, await p.render(frameMarkup(reel, ctx, t), true));
      files.push(f);
    })
  );
  return files.sort();
}
