// Vérification des reels avant rendu : scènes, looks, musique, et surtout caractères affichables
// (un emoji ou un symbole absent de la police apparaîtrait comme un carré vide dans la vidéo).
import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';
import { ROOT } from '../content.js';
import { PALETTES, FONTS, BACKGROUNDS, FONT_FILES } from './look.js';
import { SCENES } from './scenes.js';
import { MUSIC_STYLES } from './music.js';

const HIDDEN = new Set(['type', 'duration', 'palette', 'font', 'bg', 'transition', 'anim', 'align', 'style', 'wine', 'colors', 'textA', 'textB', 'image', 'role', 'brand']);
const TRANSITIONS = ['fade', 'slide', 'up', 'zoom', 'spin', 'wipe', 'flash', 'cut'];

const fonts = new Map();
function font(family, weight, style = 'normal') {
  const file = FONT_FILES.find(([f, , w, s = 'normal']) => f === family && w === weight && s === style) || FONT_FILES.find(([f]) => f === family);
  if (!fonts.has(file[1])) {
    const buf = fs.readFileSync(path.join(ROOT, 'assets', 'fonts', file[1]));
    fonts.set(file[1], opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)));
  }
  return fonts.get(file[1]);
}

function texts(obj, out = []) {
  if (typeof obj === 'string') out.push(obj);
  else if (Array.isArray(obj)) obj.forEach((x) => texts(x, out));
  else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) if (!HIDDEN.has(k)) texts(v, out);
  return out;
}

export function checkReels(reels) {
  const problems = [];
  for (const r of reels) {
    const look = r.look || {};
    const err = (m) => problems.push(`${r.id} : ${m}`);
    if (look.palette && !PALETTES[look.palette]) err(`palette inconnue "${look.palette}"`);
    if (look.font && !FONTS[look.font]) err(`police inconnue "${look.font}"`);
    if (look.bg && !BACKGROUNDS[look.bg]) err(`fond inconnu "${look.bg}"`);
    if (look.transition && !TRANSITIONS.includes(look.transition)) err(`transition inconnue "${look.transition}"`);
    if (r.music?.style && !MUSIC_STYLES.includes(r.music.style)) err(`style musical inconnu "${r.music.style}"`);
    if (r.music?.file && !fs.existsSync(path.join(ROOT, r.music.file))) err(`fichier musique introuvable ${r.music.file}`);
    for (const [i, s] of (r.scenes || []).entries()) {
      if (!SCENES[s.type]) {
        err(`scène ${i + 1} : type inconnu "${s.type}"`);
        continue;
      }
      if (s.palette && !PALETTES[s.palette]) err(`scène ${i + 1} : palette inconnue "${s.palette}"`);
      if (s.image && !fs.existsSync(path.join(ROOT, s.image))) err(`scène ${i + 1} : image introuvable ${s.image}`);
      const F = FONTS[s.font || look.font || 'classic'];
      if (!F) continue;
      const faces = [
        [F.display, F.dw, 'normal', F.case === 'upper'],
        [F.body, 400, 'normal'],
        [F.body, 700, 'normal'],
        [F.alt, F.altW || 400, F.altStyle || 'normal'],
      ];
      const missing = new Set();
      for (const t of texts(s)) {
        for (const [fam, w, st, upper] of faces) {
          const f = font(fam, w, st);
          for (const ch of (upper ? t.toUpperCase() : t).replace(/[*\s ]/g, '')) if (f.charToGlyphIndex(ch) === 0) missing.add(`"${ch}" (${fam})`);
        }
      }
      if (missing.size) err(`scène ${i + 1} (${s.type}) : caractères absents des polices ${[...missing].join(', ')} (les emojis ne vont que dans la légende)`);
    }
  }
  return problems;
}
