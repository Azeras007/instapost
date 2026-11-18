// Mesure exacte du texte (opentype.js) pour couper les lignes nous-mêmes :
// indispensable pour animer ligne par ligne / mot par mot sans débordement.
import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';
import { ROOT } from '../content.js';
import { FONT_FILES } from './look.js';

const cache = new Map();
function fontFor(family, weight, style = 'normal') {
  const key = `${family}|${weight}|${style}`;
  if (!cache.has(key)) {
    const cands = FONT_FILES.filter(([f]) => f === family);
    const file =
      cands.find(([, , w, s = 'normal']) => w === weight && s === style) ||
      cands.find(([, , , s = 'normal']) => s === style) ||
      cands[0];
    if (!file) throw new Error(`Police inconnue : ${family}`);
    const buf = fs.readFileSync(path.join(ROOT, 'assets', 'fonts', file[1]));
    cache.set(key, opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)));
  }
  return cache.get(key);
}

export function measure(text, { family, weight = 400, style = 'normal', size, ls = 0 }) {
  return fontFor(family, weight, style).getAdvanceWidth(text, size) + ls * [...text].length;
}

// Coupe en lignes (respecte les "\n" du YAML).
// Espaces insécables à la française (avant ? ! : ; » et après «) : jamais de "?" seul en début de ligne.
export const nbsp = (s) => String(s).replace(/ ([?!:;»])/g, '\u00A0$1').replace(/« /g, '«\u00A0');

export function wrap(text, font, maxW) {
  const out = [];
  for (const para of nbsp(text).split('\n')) {
    const words = para.split(/[ \t]+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (line && measure(test, font) > maxW) {
        out.push(line);
        line = w;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

// Plus grande taille (<= max) pour que le texte tienne dans la boîte maxW x maxH.
export function fit(text, font, { maxW, maxH, max = 200, min = 28, lh = 1.1 }) {
  for (let size = max; size >= min; size -= 2) {
    const f = { ...font, size };
    const lines = wrap(text, f, maxW);
    const widest = Math.max(...lines.map((l) => measure(l, f)));
    if (widest <= maxW && lines.length * size * lh <= maxH) return { size, lines: balance(text, f, maxW, lines) };
  }
  const f = { ...font, size: min };
  return { size: min, lines: wrap(text, f, maxW) };
}

// Lignes équilibrées : on cherche la largeur la plus étroite qui garde le même nombre de lignes
// (évite un mot orphelin sur la dernière ligne).
function balance(text, f, maxW, lines) {
  if (lines.length < 2 || String(text).includes('\n')) return lines;
  let lo = maxW * 0.5;
  let hi = maxW;
  for (let k = 0; k < 12; k++) {
    const mid = (lo + hi) / 2;
    const l = wrap(text, f, mid);
    if (l.length > lines.length || Math.max(...l.map((x) => measure(x, f))) > mid) lo = mid;
    else hi = mid;
  }
  return wrap(text, f, hi);
}
