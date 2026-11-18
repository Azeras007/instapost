// Scènes animées des Reels. Chaque scène : (s = données YAML, c = contexte) -> HTML (satori) pour l'instant c.t.
// c = { t: secondes depuis le début de la scène, d: durée, p: palette, F: polices, look, beat }
// Zone sûre Reels : on garde le contenu entre y≈230 et y≈1560 (l'interface Instagram couvre le reste).
import { W, H } from './look.js';
import { fit, measure, nbsp } from './text.js';

// --- Outils -------------------------------------------------------------------

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = {
  out: (x) => 1 - (1 - clamp(x)) ** 3,
  inOut: (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
  },
  back: (x) => {
    x = clamp(x);
    const c1 = 1.9;
    return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2;
  },
  bounce: (x) => {
    x = clamp(x);
    const n = 7.5625;
    const d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  },
};
const ph = (t, start, dur) => clamp((t - start) / dur);
const f2 = (x) => Number(x.toFixed(2));

// satori-html ne décode pas les entités HTML : on remplace seulement les chevrons.
export const esc = (s = '') => String(s).replace(/</g, '‹').replace(/>/g, '›');
const up = (F, s) => (F.case === 'upper' ? String(s).toUpperCase() : String(s));
const fam = (f) => `font-family:'${f}'`;

const spec = (F, role) =>
  role === 'display'
    ? { family: F.display, weight: F.dw, style: 'normal', ls: F.ls || 0 }
    : role === 'alt'
      ? { family: F.alt, weight: F.altW || 400, style: F.altStyle || 'normal', ls: 0 }
      : role === 'bodyBold'
        ? { family: F.body, weight: F.body === 'Inter' ? 700 : 700, style: 'normal', ls: 0 }
        : { family: F.body, weight: 400, style: 'normal', ls: 0 };

const css = (sp, size, color) =>
  `${fam(sp.family)};font-weight:${sp.weight};font-style:${sp.style};font-size:${size}px;color:${color};letter-spacing:${sp.ls}px;`;

// Bloc de texte animé. Les mots entre *astérisques* sont mis en valeur (couleur d'accent ou surlignage).
// anim : rise | words | type | fade | zoom | slide | drop | none
export function textBlock(text, c, o = {}) {
  const { F, p, look } = c;
  const role = o.role || 'display';
  const sp = spec(F, role);
  const raw = nbsp(role === 'display' ? up(F, text) : String(text));
  const clean = raw.replace(/\*/g, '');
  const lh = o.lh ?? (role === 'display' ? F.lh : 1.38);
  const boxed = (o.hlMode ?? look.hl) === 'box' && raw.includes('*');
  const { size, lines } = fit(clean, sp, { maxW: (o.maxW ?? 900) * (boxed ? 0.93 : 1), maxH: o.maxH ?? 700, max: o.max ?? 170, min: o.min ?? 34, lh });
  // drapeaux de mise en valeur, mot par mot
  const flags = [];
  let on = false;
  for (const w of raw.split(/[ \t\n]+/).filter(Boolean)) {
    const starts = w.startsWith('*');
    const ends = w.endsWith('*') && (w.length > 1 || !starts);
    if (starts) on = true;
    flags.push(on);
    if (ends) on = false;
  }
  const color = o.color ?? p.fg;
  const hlColor = o.hl ?? p.accent;
  const hlMode = o.hlMode ?? look.hl ?? 'color';
  const anim = o.anim ?? 'rise';
  const lt = c.t - (o.delay ?? 0);
  const speed = o.speed ?? 1;
  const align = o.align ?? 'left';
  const space = measure(' ', { ...sp, size }) + sp.ls;
  const totalChars = clean.replace(/\n/g, ' ').length;
  const typed = anim === 'type' ? Math.floor(Math.max(0, lt) * 30 * speed) : Infinity;
  const lineH = Math.round(size * lh);
  let wi = 0;
  let ci = 0;
  const html = lines
    .map((line, li) => {
      const words = line.split(' ').filter(Boolean);
      const wordsHtml = words
        .map((w, k) => {
          const idx = wi++;
          const hl = flags[idx];
          let txt = w;
          let cursor = '';
          if (anim === 'type') {
            const left = typed - ci;
            ci += w.length + 1;
            if (left <= 0) return '';
            txt = w.slice(0, left);
            const isLast = left <= w.length + 1 || ci >= totalChars;
            if (isLast && (left <= w.length || Math.floor(c.t * 2.4) % 2 === 0))
              cursor = `<div style="display:flex;flex-shrink:0;width:${Math.max(4, Math.round(size * 0.07))}px;height:${Math.round(size * 0.82)}px;background:${p.accent};margin-left:${Math.round(size * 0.06)}px;"></div>`;
          }
          const joinNext = hl && hlMode === 'box' && k < words.length - 1 && flags[idx + 1];
          const prevHl = hl && hlMode === 'box' && k > 0 && flags[idx - 1];
          let st = `display:flex;flex-shrink:0;white-space:nowrap;height:${lineH}px;align-items:center;line-height:${lh};${css(sp, size, hl && hlMode === 'color' ? hlColor : color)}margin-right:${k < words.length - 1 && !joinNext ? space : 0}px;`;
          if (hl && hlMode === 'box')
            st += `background:${hlColor};color:${o.onHl ?? p.base};padding:0 ${f2(joinNext ? space : size * 0.12)}px 0 ${f2(prevHl ? 0 : size * 0.12)}px;margin-left:${prevHl ? 0 : -f2(size * 0.04)}px;`;
          if (hl && hlMode === 'underline') st += `border-bottom:${Math.max(4, Math.round(size * 0.07))}px solid ${hlColor};`;
          if (anim === 'words' || anim === 'drop') {
            const e = anim === 'words' ? ease.back(ph(lt, idx * 0.085 / speed, 0.4)) : ease.bounce(ph(lt, idx * 0.1 / speed, 0.6));
            const tr = anim === 'words' ? `scale(${f2(0.3 + 0.7 * e)})` : `translateY(${f2((1 - e) * -500)}px)`;
            st += `opacity:${f2(clamp(e * 1.5))};transform:${tr};`;
          }
          return `<div style="${st}">${esc(txt)}</div>${cursor}`;
        })
        .join('');
      let lineSt = `display:flex;flex-direction:row;height:${lineH}px;align-items:center;justify-content:${align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'};`;
      if (anim === 'rise') {
        const e = ease.out(ph(lt, li * 0.13 / speed, 0.6));
        lineSt += `overflow:hidden;`;
        return `<div style="${lineSt}"><div style="display:flex;flex-direction:row;transform:translateY(${f2((1 - e) * lineH * 1.05)}px);">${wordsHtml}</div></div>`;
      }
      if (anim === 'slide') {
        const e = ease.out(ph(lt, li * 0.14 / speed, 0.7));
        lineSt += `opacity:${f2(e)};transform:translateX(${f2((1 - e) * (li % 2 ? 700 : -700))}px);`;
      }
      return `<div style="${lineSt}">${wordsHtml}</div>`;
    })
    .join('');
  let blockSt = `display:flex;flex-direction:column;align-items:${align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'};`;
  if (anim === 'fade') {
    const e = ease.out(ph(lt, 0, 0.7));
    blockSt += `opacity:${f2(e)};transform:translateY(${f2((1 - e) * 40)}px);`;
  }
  if (anim === 'zoom') {
    const e = ease.out(ph(lt, 0, 0.8));
    blockSt += `opacity:${f2(e)};transform:scale(${f2(1.6 - 0.6 * e)});`;
  }
  if (lt < 0 && anim !== 'none') blockSt += 'opacity:0;';
  const ends = { rise: 0.6 + lines.length * 0.13, words: 0.4 + wi * 0.085, type: totalChars / 30, fade: 0.7, zoom: 0.8, slide: 0.7 + lines.length * 0.14, drop: 0.6 + wi * 0.1, none: 0 };
  return { html: `<div style="${blockSt}">${html}</div>`, size, lines, height: lines.length * lineH, end: (o.delay ?? 0) + (ends[anim] ?? 0.7) / speed };
}

function kicker(text, c, o = {}) {
  if (!text) return '';
  const { p, F } = c;
  const e = ease.out(ph(c.t, o.delay ?? 0, 0.5));
  const color = o.color ?? p.accent;
  const style = o.style ?? c.look.kicker ?? 'bar';
  const label = `<div style="display:flex;${fam(F.body)};font-weight:700;font-size:${o.size ?? 30}px;letter-spacing:${F.body === 'Space Mono' ? 3 : 6}px;color:${style === 'pill' ? p.base : color};">${esc(String(text).toUpperCase())}</div>`;
  const inner =
    style === 'pill'
      ? `<div style="display:flex;background:${color};border-radius:60px;padding:12px 30px;">${label}</div>`
      : style === 'bar'
        ? `<div style="display:flex;align-items:center;"><div style="display:flex;width:${f2(60 * e)}px;height:6px;background:${color};margin-right:22px;"></div>${label}</div>`
        : label;
  return `<div style="display:flex;opacity:${f2(e)};transform:translateY(${f2((1 - e) * 20)}px);margin-bottom:${o.mb ?? 40}px;">${inner}</div>`;
}

const box = (inner, o = {}) =>
  `<div style="display:flex;flex-direction:column;position:absolute;top:0;left:0;width:${W}px;height:${H}px;padding:${o.pad ?? '250px 90px 380px 90px'};justify-content:${o.justify ?? 'center'};align-items:${o.align ?? 'flex-start'};">${inner}</div>`;

const svg = (w, h, vb, inner, st = '') => `<svg width="${w}" height="${h}" viewBox="${vb}" style="${st}">${inner}</svg>`;
const ICONS = {
  check: (col, sw = 3.2) => `<path d="M4.5 12.5l4.8 4.8L19.5 7" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  cross: (col, sw = 3.2) => `<path d="M6 6L18 18M18 6L6 18" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`,
  arrow: (col, sw = 3) => `<path d="M4 12h15M13 6l6 6-6 6" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  dot: (col) => `<circle cx="12" cy="12" r="6" fill="${col}"/>`,
};
const icon = (name, col, size = 40, sw) => svg(size, size, '0 0 24 24', ICONS[name](col, sw));

// Répartit n éléments sur la durée de la scène (en laissant le temps de lire le dernier).
const stagger = (c, n, start = 0.6, tail = 1.6) => Math.min(1.6, Math.max(0.35, (c.d - start - tail) / Math.max(1, n)));

// --- Scènes -------------------------------------------------------------------

export const SCENES = {
  // Gros titre animé (accroche). anim: rise | words | type | zoom | slide | drop | fade
  title(s, c) {
    const align = s.align ?? 'left';
    const k = kicker(s.kicker, c, { mb: 44 });
    const main = textBlock(s.text, c, { anim: s.anim ?? 'rise', max: s.size ?? 170, maxH: s.sub ? 760 : 980, align, delay: s.kicker ? 0.25 : 0 });
    const sub = s.sub ? textBlock(s.sub, c, { role: 'body', anim: 'fade', max: 46, min: 30, maxH: 330, align, delay: main.end + 0.1, color: c.p.fg }) : null;
    return box(`${k}${main.html}${sub ? `<div style="display:flex;margin-top:46px;opacity:0.92;">${sub.html}</div>` : ''}`, { align: align === 'center' ? 'center' : 'flex-start' });
  },

  // Un mot géant (ex : "Terroir") + explication
  bigword(s, c) {
    const { p, F } = c;
    const e = ease.back(ph(c.t, 0, 0.7));
    const sp = spec(F, 'display');
    const word = up(F, s.word);
    const { size } = fit(word, sp, { maxW: 940, maxH: 520, max: s.size ?? 380, lh: 1 });
    const sub = textBlock(s.text, c, { role: 'body', anim: 'fade', max: 50, maxH: 420, align: 'center', delay: 0.8 });
    const k = kicker(s.kicker, c, { style: 'plain', mb: 30 });
    return box(
      `${k}<div style="display:flex;${css(sp, size, p.accent)}line-height:1;transform:scale(${f2(0.5 + 0.5 * e)}) rotate(${f2((1 - e) * -8)}deg);opacity:${f2(clamp(e * 2))};">${esc(word)}</div>
       <div style="display:flex;width:${f2(300 * ease.out(ph(c.t, 0.5, 0.6)))}px;height:6px;background:${p.fg};margin:46px 0 46px 0;opacity:0.7;"></div>${sub.html}`,
      { align: 'center' }
    );
  },

  // Compteur qui défile (0 -> 20 min)
  count(s, c) {
    const { p, F } = c;
    const e = ease.out(ph(c.t, 0.3, s.speed ?? 1.4));
    const from = Number(s.from ?? 0);
    const to = Number(s.to);
    const v = from + (to - from) * e;
    const dec = String(s.to).includes('.') ? 1 : 0;
    const num = `${s.prefix ?? ''}${v.toFixed(dec).replace('.', ',')}`;
    const sp = spec(F, 'display');
    const size = Math.min(s.size ?? 420, fit(`${s.prefix ?? ''}${to}`, sp, { maxW: 700, maxH: 500, max: s.size ?? 420, lh: 1 }).size);
    const unit = s.unit ? `<div style="display:flex;${css(spec(F, 'alt'), Math.round(size * 0.32), p.accent)}margin-left:18px;margin-bottom:${Math.round(size * 0.12)}px;">${esc(s.unit)}</div>` : '';
    const label = textBlock(s.text, c, { anim: 'rise', max: 96, maxH: 420, align: 'center', delay: 0.4 + (s.speed ?? 1.4) * 0.7 });
    const sub = s.sub ? textBlock(s.sub, c, { role: 'body', anim: 'fade', max: 40, maxH: 220, align: 'center', delay: label.end + 0.2 }) : null;
    return box(
      `${kicker(s.kicker, c, { style: 'pill', mb: 40 })}<div style="display:flex;align-items:flex-end;">
        <div style="display:flex;${css(sp, size, p.fg)}line-height:1;">${esc(up(F, num))}</div>${unit}</div>
        <div style="display:flex;margin-top:40px;">${label.html}</div>${sub ? `<div style="display:flex;margin-top:30px;opacity:0.85;">${sub.html}</div>` : ''}`,
      { align: 'center' }
    );
  },

  // Liste qui se construit : style num | check | cross | arrow | bullet
  list(s, c) {
    const { p, F } = c;
    const items = s.items.map((it) => (typeof it === 'string' ? { title: it } : it));
    const head = s.title ? textBlock(s.title, c, { anim: 'rise', max: s.titleSize ?? 96, maxH: 360, delay: s.kicker ? 0.2 : 0 }) : null;
    const st = stagger(c, items.length, head ? head.end : 0.4);
    const t0 = head ? head.end + 0.1 : 0.3;
    const mode = s.style ?? 'num';
    const n = items.length;
    const titleSize = (n > 4 ? 44 : 52) + (head ? 0 : 10);
    const rows = items
      .map((it, i) => {
        const e = ease.out(ph(c.t, t0 + i * st, 0.5));
        const done = ph(c.t, t0 + i * st + 0.25, 0.35);
        let marker;
        if (mode === 'num') marker = `<div style="display:flex;${css(spec(F, 'display'), 64, p.accent)}width:110px;line-height:1;">${String(i + 1).padStart(2, '0')}</div>`;
        else if (mode === 'check' || mode === 'cross')
          marker = `<div style="display:flex;width:74px;height:74px;border-radius:${mode === 'check' ? 18 : 37}px;border:4px solid ${p.accent};margin-right:34px;align-items:center;justify-content:center;background:${done > 0.5 ? p.accent : 'transparent'};">${done > 0.5 ? icon(mode, p.base, 52, 3.4) : ''}</div>`;
        else if (mode === 'arrow') marker = `<div style="display:flex;margin-right:28px;margin-top:4px;">${icon('arrow', p.accent, 60)}</div>`;
        else marker = `<div style="display:flex;width:22px;height:22px;border-radius:11px;background:${p.accent};margin:20px 40px 0 6px;"></div>`;
        const strike = mode === 'cross' && done > 0 ? `<div style="display:flex;position:absolute;left:0;top:${titleSize * 0.62}px;height:5px;width:${f2(100 * done)}%;background:${p.accent2};"></div>` : '';
        return `<div style="display:flex;align-items:flex-start;margin-top:${i ? (n > 4 ? 34 : 50) : 0}px;opacity:${f2(e)};transform:translateX(${f2((1 - e) * 120)}px);">${marker}
          <div style="display:flex;flex-direction:column;flex:1;">
            <div style="display:flex;position:relative;${css(spec(F, 'bodyBold'), titleSize, p.fg)}line-height:1.2;">${esc(it.title)}${strike}</div>
            ${it.text ? `<div style="display:flex;${css(spec(F, 'body'), n > 4 ? 30 : 34, p.fg)}line-height:1.38;opacity:0.82;margin-top:10px;">${esc(it.text)}</div>` : ''}
          </div></div>`;
      })
      .join('');
    return box(`${kicker(s.kicker, c)}${head ? `<div style="display:flex;margin-bottom:64px;">${head.html}</div>` : ''}<div style="display:flex;flex-direction:column;width:900px;">${rows}</div>`);
  },

  // Comparatif deux colonnes (A vs B), lignes qui apparaissent une à une
  versus(s, c) {
    const { p, F } = c;
    const head = textBlock(s.title, c, { anim: 'words', max: 92, maxH: 300, align: 'center' });
    const t0 = head.end;
    const st = stagger(c, s.rows.length, t0, 1.5);
    const colW = 410;
    const hdr = (txt, hl) =>
      `<div style="display:flex;width:${colW}px;justify-content:center;padding:22px 10px;border-radius:28px;background:${hl ? p.accent : 'transparent'};border:4px solid ${hl ? p.accent : p.fg};${css(spec(F, 'bodyBold'), 42, hl ? p.base : p.fg)}">${esc(txt)}</div>`;
    const he = ease.out(ph(c.t, t0 - 0.3, 0.5));
    const rows = s.rows
      .map(([l, r], i) => {
        const e = ease.out(ph(c.t, t0 + 0.3 + i * st, 0.5));
        const cell = (txt, good) =>
          `<div style="display:flex;width:${colW}px;align-items:center;padding:0 10px;opacity:${good ? 1 : 0.7};">
            <div style="display:flex;margin-right:16px;">${icon(good ? 'check' : 'cross', good ? p.accent : p.accent2, 44)}</div>
            <div style="display:flex;flex:1;${css(spec(F, good ? 'bodyBold' : 'body'), 37, p.fg)}line-height:1.3;">${esc(txt)}</div></div>`;
        return `<div style="display:flex;justify-content:space-between;width:900px;padding:38px 0;border-bottom:2px solid ${p.fg}33;opacity:${f2(e)};transform:translateY(${f2((1 - e) * 40)}px);">${cell(l, false)}${cell(r, true)}</div>`;
      })
      .join('');
    return box(
      `<div style="display:flex;width:900px;justify-content:center;margin-bottom:56px;">${head.html}</div>
       <div style="display:flex;justify-content:space-between;width:900px;margin-bottom:16px;opacity:${f2(he)};">${hdr(s.left, false)}${hdr(s.right, true)}</div>${rows}`,
      { align: 'center' }
    );
  },

  // Verre qui se remplit
  glass(s, c) {
    const { p } = c;
    const fill = ease.inOut(ph(c.t, 0.4, 1.8)) * (s.fill ?? 0.33);
    const wine = { rouge: '#7A1630', blanc: '#E8D27A', rose: '#F2A7A0' }[s.wine ?? 'rouge'] || s.wine;
    const bowlTop = 40;
    const bowlBottom = 300;
    const level = bowlBottom - fill * (bowlBottom - bowlTop) * 1.0;
    const wave = Math.sin(c.t * 4) * 4 * (1 - ease.out(ph(c.t, 1.8, 1.5)));
    const g = `<defs><clipPath id="bowl"><path d="M60 40 L240 40 C 246 160, 222 268, 150 292 C 78 268, 54 160, 60 40 Z"/></clipPath></defs>
      <g clip-path="url(#bowl)"><path d="M0 ${level + wave} Q 75 ${level - wave} 150 ${level + wave} T 300 ${level + wave} L300 320 L0 320 Z" fill="${wine}"/></g>
      <path d="M60 40 L240 40 C 246 160, 222 268, 150 292 C 78 268, 54 160, 60 40 Z" fill="none" stroke="${p.fg}" stroke-width="6"/>
      <rect x="145" y="292" width="10" height="170" fill="${p.fg}"/><ellipse cx="150" cy="470" rx="80" ry="14" fill="${p.fg}"/>
      <ellipse cx="96" cy="120" rx="10" ry="40" fill="${p.fg}" opacity="0.25"/>`;
    const markE = ph(c.t, 2.1, 0.5);
    const GY = 560;
    const mark = s.mark
      ? `<div style="display:flex;position:absolute;left:${680}px;top:${f2(GY + level * 1.4 - 30)}px;align-items:center;opacity:${f2(markE)};">
          <div style="display:flex;width:${f2(90 * markE)}px;height:4px;background:${p.accent};margin-right:16px;"></div>
          <div style="display:flex;${css(spec(c.F, 'alt'), 44, p.accent)}">${esc(s.mark)}</div></div>`
      : '';
    const txt = textBlock(s.text, c, { anim: 'rise', max: 96, maxH: 280, align: 'center', delay: 0.2 });
    const sub = s.sub ? textBlock(s.sub, c, { role: 'body', anim: 'fade', max: 42, maxH: 200, align: 'center', delay: 2.4 }) : null;
    return `<div style="display:flex;position:absolute;top:0;left:0;width:${W}px;height:${H}px;">
      <div style="display:flex;position:absolute;top:250px;left:90px;width:900px;justify-content:center;">${txt.html}</div>
      <div style="display:flex;position:absolute;top:${GY}px;left:${330}px;">${svg(420, 728, '0 0 300 520', g)}</div>${mark}
      ${sub ? `<div style="display:flex;position:absolute;top:1330px;left:90px;width:900px;justify-content:center;">${sub.html}</div>` : ''}</div>`;
  },

  // Citation qui se dévoile
  quote(s, c) {
    const { p, F } = c;
    const e = ease.back(ph(c.t, 0, 0.6));
    const q = `<div style="display:flex;${css(spec(F, 'alt'), 300, p.accent)}line-height:0.8;height:180px;transform:scale(${f2(e)});">“</div>`;
    const txt = textBlock(s.text, c, { role: s.role ?? 'alt', anim: s.anim ?? 'rise', max: 96, maxH: 820, delay: 0.4, lh: 1.15 });
    const au = s.author ? `<div style="display:flex;${css(spec(F, 'body'), 36, p.fg)}opacity:${f2(0.8 * ph(c.t, txt.end + 0.2, 0.5))};margin-top:50px;">— ${esc(s.author)}</div>` : '';
    return box(`${q}${txt.html}${au}`);
  },

  // Quiz : question, options, révélation
  quiz(s, c) {
    const { p, F } = c;
    const q = textBlock(s.question, c, { anim: 'words', max: 92, maxH: 420, align: 'center' });
    const reveal = s.reveal ?? Math.max(q.end + 2.4, c.d * 0.55);
    const r = ph(c.t, reveal, 0.4);
    const letters = 'ABCD';
    const opts = s.options
      .map((o, i) => {
        const e = ease.back(ph(c.t, q.end + 0.15 + i * 0.25, 0.45));
        const good = i === s.answer;
        const bg = r > 0 && good ? p.accent : 'transparent';
        const col = r > 0 && good ? p.base : p.fg;
        const dim = r > 0 && !good ? 0.35 : 1;
        return `<div style="display:flex;align-items:center;width:860px;padding:26px 34px;margin-top:26px;border-radius:30px;border:4px solid ${r > 0 && good ? p.accent : p.fg};background:${bg};opacity:${f2(clamp(e) * dim)};transform:scale(${f2(0.6 + 0.4 * e + (good ? 0.05 * Math.sin(Math.PI * r) : 0))});">
          <div style="display:flex;width:64px;height:64px;border-radius:32px;background:${r > 0 && good ? p.base : p.fg};align-items:center;justify-content:center;${css(spec(F, 'bodyBold'), 32, r > 0 && good ? p.accent : p.base)}margin-right:28px;">${letters[i]}</div>
          <div style="display:flex;flex:1;${css(spec(F, 'bodyBold'), 38, col)}line-height:1.25;">${esc(o)}</div>
          ${r > 0 && good ? icon('check', p.base, 56, 3.6) : ''}</div>`;
      })
      .join('');
    // compte à rebours avant la réponse
    const cd = Math.ceil(reveal - c.t);
    const timer =
      c.t > q.end + 0.6 && c.t < reveal
        ? `<div style="display:flex;width:110px;height:110px;border-radius:55px;border:5px solid ${p.accent};align-items:center;justify-content:center;${css(spec(F, 'display'), 60, p.accent)}margin-top:40px;">${Math.max(1, Math.min(3, cd))}</div>`
        : `<div style="display:flex;height:150px;"></div>`;
    const ex = s.explain ? textBlock(s.explain, c, { role: 'body', anim: 'fade', max: 38, maxH: 220, align: 'center', delay: reveal + 0.4 }) : null;
    return box(
      `${kicker(s.kicker ?? 'Quiz', c, { style: 'pill', mb: 40 })}<div style="display:flex;width:900px;justify-content:center;margin-bottom:30px;">${q.html}</div>${opts}
       ${ex && r > 0 ? `<div style="display:flex;width:900px;justify-content:center;margin-top:40px;">${ex.html}</div>` : timer}`,
      { align: 'center' }
    );
  },

  // Mythe barré -> réalité
  myth(s, c) {
    const { p, F } = c;
    const cut = s.at ?? Math.max(2.2, c.d * 0.38);
    const strike = ease.inOut(ph(c.t, cut, 0.45));
    const out = ease.inOut(ph(c.t, cut + 0.6, 0.5));
    const stamp = (txt, col, e, rot) =>
      `<div style="display:flex;align-self:flex-start;padding:12px 30px;border:6px solid ${col};border-radius:14px;${css(spec(F, 'bodyBold'), 44, col)}letter-spacing:8px;transform:rotate(${rot}deg) scale(${f2(2.2 - 1.2 * e)});opacity:${f2(e)};">${esc(txt)}</div>`;
    const myth = textBlock(`« ${s.myth} »`, c, { role: 'alt', anim: 'fade', max: 80, maxH: 460, delay: 0.5, lh: 1.15 });
    const truth = textBlock(s.truth, c, { anim: s.anim ?? 'rise', max: 84, maxH: 640, delay: cut + 1.1 });
    const mythBlock = `<div style="display:flex;flex-direction:column;opacity:${f2(1 - 0.65 * out)};transform:scale(${f2(1 - 0.25 * out)}) translateY(${f2(-out * 80)}px);">
        ${stamp(s.label ?? 'Mythe', p.accent2, ease.out(ph(c.t, 0, 0.35)), -4)}
        <div style="display:flex;position:relative;margin-top:40px;">${myth.html}
          <div style="display:flex;position:absolute;left:-10px;top:${f2(myth.height / 2)}px;width:${f2(strike * 920)}px;height:12px;background:${p.accent2};transform:rotate(-3deg);"></div></div></div>`;
    const truthBlock =
      c.t > cut + 0.7
        ? `<div style="display:flex;flex-direction:column;margin-top:60px;">${stamp(s.label2 ?? 'Réalité', p.accent, ease.out(ph(c.t, cut + 0.7, 0.35)), 3)}<div style="display:flex;margin-top:40px;">${truth.html}</div></div>`
        : '';
    return box(`${mythBlock}${truthBlock}`);
  },

  // Frise chronologique verticale
  timeline(s, c) {
    const { p, F } = c;
    const head = s.title ? textBlock(s.title, c, { anim: 'rise', max: 88, maxH: 260 }) : null;
    const t0 = head ? head.end : 0.3;
    const n = s.steps.length;
    const st = stagger(c, n, t0, 1.4);
    const rowH = Math.min(220, 1000 / n);
    const lineE = clamp((c.t - t0) / (st * n + 0.3));
    const items = s.steps
      .map((step, i) => {
        const e = ease.out(ph(c.t, t0 + i * st, 0.5));
        const active = c.t >= t0 + i * st && (i === n - 1 || c.t < t0 + (i + 1) * st);
        return `<div style="display:flex;position:absolute;left:0;top:${f2(i * rowH)}px;width:900px;align-items:flex-start;opacity:${f2(e)};transform:translateX(${f2((1 - e) * 60)}px);">
          <div style="display:flex;width:56px;height:56px;border-radius:28px;background:${active ? p.accent : p.base};border:6px solid ${p.accent};margin-right:44px;transform:scale(${active ? 1.15 : 1});"></div>
          <div style="display:flex;flex-direction:column;flex:1;">
            <div style="display:flex;${css(spec(F, 'alt'), 34, p.accent)}">${esc(step.when)}</div>
            <div style="display:flex;${css(spec(F, 'display'), rowH > 180 ? 64 : 54, p.fg)}line-height:1.05;margin-top:6px;">${esc(up(F, step.what))}</div>
            ${step.text ? `<div style="display:flex;${css(spec(F, 'body'), 30, p.fg)}opacity:0.8;margin-top:8px;line-height:1.3;">${esc(step.text)}</div>` : ''}
          </div></div>`;
      })
      .join('');
    return box(
      `${kicker(s.kicker, c)}${head ? `<div style="display:flex;margin-bottom:60px;">${head.html}</div>` : ''}
      <div style="display:flex;position:relative;width:900px;height:${f2(rowH * n)}px;">
        <div style="display:flex;position:absolute;left:25px;top:20px;width:6px;height:${f2(lineE * rowH * (n - 1))}px;background:${p.accent};"></div>${items}</div>`
    );
  },

  // Carte : épingle qui tombe + rayon autour de chez toi
  map(s, c) {
    const { p, F } = c;
    const cx = 540;
    const cy = 800;
    const drop = ease.bounce(ph(c.t, 0.2, 0.9));
    const roads = [
      `M-50 ${cy + 120} C 300 ${cy + 60}, 600 ${cy + 260}, 1130 ${cy + 140}`,
      `M${cx - 260} -50 C ${cx - 200} 400, ${cx + 120} 700, ${cx - 60} 1970`,
      `M-50 ${cy - 330} C 400 ${cy - 260}, 700 ${cy - 420}, 1130 ${cy - 300}`,
      `M${cx + 330} -50 C ${cx + 280} 600, ${cx + 420} 1100, ${cx + 300} 1970`,
    ];
    const roadE = ease.out(ph(c.t, 0, 1.2));
    const rings = [0, 1, 2]
      .map((k) => {
        const e = ph(c.t, 1 + k * 0.25, 0.9);
        const r = 120 + k * 120;
        return `<circle cx="${cx}" cy="${cy}" r="${f2(r * ease.out(e))}" fill="${p.accent}" fill-opacity="${0.09}" stroke="${p.accent}" stroke-width="4" stroke-dasharray="14 12" opacity="${f2(clamp(e * 2))}"/>`;
      })
      .join('');
    const homes = [[-300, -120], [260, -200], [330, 210], [-250, 260], [60, 380], [-60, -360]]
      .map(([dx, dy], k) => {
        const e = ease.back(ph(c.t, 1.6 + k * 0.15, 0.4));
        const x = cx + dx;
        const y = cy + dy;
        return `<g transform="translate(${x} ${y}) scale(${f2(e)})"><path d="M-22 4 L0 -18 L22 4 L22 26 L-22 26 Z" fill="${p.fg}" opacity="0.85"/>${grapeMini(0, -46, p.accent2)}</g>`;
      })
      .join('');
    const pinY = cy - 140 - (1 - drop) * 700;
    const g = `${roads.map((d) => `<path d="${d}" stroke="${p.fg}" stroke-opacity="0.18" stroke-width="22" fill="none" stroke-dasharray="${f2(2400 * roadE)} 3000"/>`).join('')}
      ${rings}${homes}
      <g transform="translate(${cx} ${f2(pinY)})"><path d="M0 140 C -20 100, -78 60, -78 0 A 78 78 0 1 1 78 0 C 78 60, 20 100, 0 140 Z" fill="${p.accent2 === '#FFFFFF' ? p.accent : p.accent2}"/><circle cx="0" cy="0" r="30" fill="${p.base}"/></g>`;
    const label = s.label
      ? `<div style="display:flex;position:absolute;top:${cy + 430}px;left:0;width:${W}px;justify-content:center;opacity:${f2(ph(c.t, 1.4, 0.5))};">
          <div style="display:flex;background:${p.fg};border-radius:60px;padding:16px 44px;${css(spec(F, 'display'), 70, p.base)}">${esc(up(F, s.label))}</div></div>`
      : '';
    const txt = textBlock(s.text, c, { anim: s.anim ?? 'words', max: 76, maxH: 220, align: 'center', delay: 1.9 });
    return `<div style="display:flex;position:absolute;top:0;left:0;width:${W}px;height:${H}px;">
      ${svg(W, H, `0 0 ${W} ${H}`, g, 'position:absolute;top:0;left:0;')}
      <div style="display:flex;position:absolute;top:240px;left:90px;width:900px;justify-content:center;">${kicker(s.kicker, c, { style: 'pill', mb: 0 })}</div>
      ${label}<div style="display:flex;position:absolute;top:${cy + (s.label ? 560 : 440)}px;left:90px;width:900px;justify-content:center;">${txt.html}</div></div>`;
  },

  // Barres horizontales (températures, niveaux...)
  bars(s, c) {
    const { p, F } = c;
    const head = textBlock(s.title, c, { anim: 'rise', max: 90, maxH: 300 });
    const t0 = head.end;
    const st = stagger(c, s.items.length, t0, 1.6);
    const rows = s.items
      .map((it, i) => {
        const e = ease.out(ph(c.t, t0 + i * st, 0.9));
        const w = 120 + 780 * (it.level ?? 0.5) * e;
        const col = i % 2 ? p.accent2 : p.accent;
        return `<div style="display:flex;flex-direction:column;margin-top:${i ? 40 : 0}px;opacity:${f2(clamp(e * 3))};">
          <div style="display:flex;${css(spec(F, 'bodyBold'), 36, p.fg)}margin-bottom:12px;">${esc(it.label)}</div>
          <div style="display:flex;align-items:center;">
            <div style="display:flex;width:${f2(w)}px;height:74px;border-radius:37px;background:${col};align-items:center;justify-content:flex-end;padding-right:26px;">
              <div style="display:flex;${css(spec(F, 'display'), 46, p.base)}opacity:${f2(ph(c.t, t0 + i * st + 0.5, 0.3))};">${esc(up(F, it.value))}</div></div></div></div>`;
      })
      .join('');
    const note = s.note ? textBlock(s.note, c, { role: 'body', anim: 'fade', max: 30, maxH: 140, delay: t0 + st * s.items.length + 0.2 }) : null;
    return box(`${kicker(s.kicker, c)}<div style="display:flex;margin-bottom:60px;">${head.html}</div>${rows}${note ? `<div style="display:flex;margin-top:50px;opacity:0.75;">${note.html}</div>` : ''}`);
  },

  // Cartes qui défilent (une par élément)
  cards(s, c) {
    const { p, F } = c;
    const n = s.items.length;
    const per = c.d / n;
    const i = Math.min(n - 1, Math.floor(c.t / per));
    const lt = c.t - i * per;
    const inE = ease.back(ph(lt, 0, 0.55));
    const outE = i < n - 1 ? ease.inOut(ph(lt, per - 0.35, 0.35)) : 0;
    const card = (it, k, e, o, depth) => {
      const lc = { ...c, t: depth ? 99 : lt - 0.25 };
      const title = textBlock(it.title, lc, { anim: 'rise', max: 120, maxH: 460, maxW: 740 });
      const text = it.text ? textBlock(it.text, lc, { role: 'body', anim: 'fade', max: 44, maxH: 400, maxW: 740, delay: 0.25 }) : null;
      const rot = depth ? depth * 4 : (1 - e) * 18 - o * 22;
      const tx = depth ? depth * 18 : (1 - e) * 900 - o * 1100;
      const bgc = k % 2 ? p.fg : p.accent;
      const fgc = p.base;
      return `<div style="display:flex;position:absolute;left:110px;top:${330 + (depth || 0) * 26}px;width:860px;height:1100px;border-radius:48px;background:${bgc};padding:70px 60px;flex-direction:column;justify-content:space-between;transform:translateX(${f2(tx)}px) rotate(${f2(rot)}deg);opacity:${depth ? 0.5 : 1};border-bottom:14px solid rgba(0,0,0,0.18);">
        <div style="display:flex;justify-content:space-between;align-items:center;"><div style="display:flex;${css(spec(F, 'alt'), 40, fgc)}">${esc(it.tag ?? s.tag ?? '')}</div>
        <div style="display:flex;${css(spec(F, 'display'), 54, fgc)}">${k + 1}/${n}</div></div>
        <div style="display:flex;flex-direction:column;">${title.html.replaceAll(p.fg, fgc).replaceAll(p.accent, p.accent2 === fgc ? p.fg : p.accent2)}${text ? `<div style="display:flex;margin-top:36px;">${text.html.replaceAll(p.fg, fgc)}</div>` : ''}</div></div>`;
    };
    const back = i < n - 1 ? card(s.items[i + 1], i + 1, 1, 0, 1) : '';
    return `<div style="display:flex;position:absolute;top:0;left:0;width:${W}px;height:${H}px;">
      ${s.title ? `<div style="display:flex;position:absolute;top:200px;left:110px;">${kicker(s.title, { ...c, t: 9 }, { mb: 0 })}</div>` : ''}${back}${card(s.items[i], i, inE, outE, 0)}</div>`;
  },

  // Définition de dictionnaire
  define(s, c) {
    const { p, F } = c;
    const typed = Math.floor(Math.max(0, c.t - 0.2) * 14);
    const word = up(F, s.word);
    const sp = spec(F, 'display');
    const { size } = fit(word, sp, { maxW: 900, maxH: 300, max: 200, lh: 1 });
    const shown = word.slice(0, typed);
    const cursorOn = typed < word.length || Math.floor(c.t * 2.4) % 2;
    const t1 = 0.3 + word.length / 14;
    const meta = `<div style="display:flex;align-items:center;margin-top:20px;opacity:${f2(ph(c.t, t1, 0.4))};">
      <div style="display:flex;${css(spec(F, 'body'), 36, p.fg)}opacity:0.75;margin-right:24px;">${esc(s.phon ?? '')}</div>
      <div style="display:flex;${css(spec(F, 'alt'), 36, p.accent)}">${esc(s.kind ?? 'n.m.')}</div></div>`;
    const def = textBlock(s.def, c, { role: 'body', anim: 'fade', max: 46, maxH: 520, delay: t1 + 0.4 });
    const ex = s.example ? textBlock(s.example, c, { role: 'alt', anim: 'fade', max: 40, maxH: 260, delay: t1 + 1.8, color: p.accent }) : null;
    return box(
      `${kicker(s.kicker ?? 'Le lexique', c)}
      <div style="display:flex;align-items:center;height:${Math.round(size * 1.1)}px;"><div style="display:flex;${css(sp, size, p.fg)}line-height:1;">${esc(shown)}</div>
      <div style="display:flex;width:${Math.round(size * 0.06)}px;height:${Math.round(size * 0.85)}px;background:${p.accent};margin-left:8px;opacity:${cursorOn ? 1 : 0};"></div></div>
      ${meta}<div style="display:flex;width:${f2(900 * ease.out(ph(c.t, t1, 0.6)))}px;height:3px;background:${p.fg};opacity:0.4;margin:44px 0;"></div>
      ${def.html}${ex ? `<div style="display:flex;margin-top:44px;padding-left:30px;border-left:6px solid ${p.accent};opacity:${f2(ph(c.t, t1 + 1.8, 0.5))};">${ex.html}</div>` : ''}`
    );
  },

  // Écran coupé en deux (sondage "ou")
  split(s, c) {
    const { p, F } = c;
    const e = ease.inOut(ph(c.t, 0, 0.7));
    const pulse = 1 + 0.08 * Math.sin(c.t * 6);
    const half = (txt, sub, bg, fg, top) => {
      const lc = { ...c, p: { ...p, fg, accent: fg } };
      const t = textBlock(txt, lc, { anim: 'words', max: 160, maxH: 380, align: 'center', delay: top ? 0.4 : 0.8 });
      const sb = sub ? textBlock(sub, lc, { role: 'body', anim: 'fade', max: 36, maxH: 120, align: 'center', delay: 1.4 }) : null;
      return `<div style="display:flex;position:absolute;left:0;top:${top ? 0 : H / 2}px;width:${W}px;height:${H / 2}px;background:${bg};flex-direction:column;align-items:center;justify-content:${top ? 'flex-end' : 'flex-start'};padding:${top ? '0 90px 140px 90px' : '140px 90px 0 90px'};transform:translateX(${f2((1 - e) * (top ? -W : W))}px);">${t.html}${sb ? `<div style="display:flex;margin-top:24px;opacity:0.85;">${sb.html}</div>` : ''}</div>`;
    };
    const cb = s.colors ?? [s.colorA ?? p.accent2, s.colorB ?? p.fg];
    const vs = `<div style="display:flex;position:absolute;left:${540 - 95}px;top:${960 - 95}px;width:190px;height:190px;border-radius:95px;background:${p.base};border:8px solid ${p.accent};align-items:center;justify-content:center;transform:scale(${f2(ease.back(ph(c.t, 0.8, 0.5)) * pulse)});${css(spec(F, 'display'), 70, p.accent)}">${esc(up(F, s.or ?? 'ou'))}</div>`;
    const cta = s.cta
      ? `<div style="display:flex;position:absolute;left:0;top:300px;width:${W}px;justify-content:center;opacity:${f2(ph(c.t, 2, 0.5))};"><div style="display:flex;background:${p.base};border-radius:50px;padding:16px 36px;${css(spec(F, 'bodyBold'), 32, p.fg)}">${esc(s.cta)}</div></div>`
      : '';
    return `<div style="display:flex;position:absolute;top:0;left:0;width:${W}px;height:${H}px;">${half(s.a, s.subA, cb[0], s.textA ?? p.base, true)}${half(s.b, s.subB, cb[1], s.textB ?? p.base, false)}${vs}${cta}</div>`;
  },

  // Étapes plein écran avec chiffre géant qui roule
  steps(s, c) {
    const { p, F } = c;
    const n = s.items.length;
    const per = c.d / n;
    const i = Math.min(n - 1, Math.floor(c.t / per));
    const lt = c.t - i * per;
    const roll = ease.out(ph(lt, 0, 0.5));
    const sp = spec(F, 'display');
    const big = 520;
    const digits = `<div style="display:flex;height:${big}px;overflow:hidden;"><div style="display:flex;flex-direction:column;flex-shrink:0;transform:translateY(${f2(-(i - 1 + roll) * big)}px);">
      ${s.items.map((_, k) => `<div style="display:flex;flex-shrink:0;height:${big}px;align-items:center;${css(sp, Math.round(big * 0.78), p.accent)}line-height:1;">${k + 1}</div>`).join('')}</div></div>`;
    const lc = { ...c, t: lt };
    const it = s.items[i];
    const title = textBlock(it.title, lc, { anim: 'rise', max: 120, maxH: 300, delay: 0.2 });
    const text = it.text ? textBlock(it.text, lc, { role: 'body', anim: 'fade', max: 42, maxH: 300, delay: 0.5 }) : null;
    const dots = s.items.map((_, k) => `<div style="display:flex;width:${k === i ? 60 : 18}px;height:18px;border-radius:9px;background:${k <= i ? p.accent : p.fg};opacity:${k <= i ? 1 : 0.3};margin-right:12px;"></div>`).join('');
    return box(
      `${s.title ? kicker(s.title, { ...c, t: 9 }) : ''}<div style="display:flex;margin-left:-20px;">${digits}</div>${title.html}${text ? `<div style="display:flex;margin-top:30px;">${text.html}</div>` : ''}<div style="display:flex;margin-top:60px;">${dots}</div>`,
      { justify: 'center' }
    );
  },

  // Bandes de mots qui défilent + message central
  marquee(s, c) {
    const { p, F } = c;
    const words = s.words.map((w) => up(F, w));
    const sp = spec(F, 'display');
    // Chaque mot est placé individuellement (un très long texte décalé loin à gauche n'est pas rendu par satori).
    const band = (k, y, rot, dir, bg, fg) => {
      const f = { ...sp, size: 92 };
      const items = Array.from({ length: words.length }, (_, j) => words[(j + k) % words.length]);
      const gap = measure('  ', f);
      const widths = items.map((w) => measure(`${w} •`, f) + gap * 1.5);
      const cw = widths.reduce((a, b) => a + b, 0);
      const span = W + 800;
      const pos = (c.t * 220) % cw;
      let x = dir > 0 ? -pos : -cw + pos;
      const parts = [];
      for (let j = 0; x < span; j++) {
        const w = widths[j % items.length];
        if (x + w > 0) parts.push(`<div style="display:flex;position:absolute;left:${f2(x)}px;top:0;height:150px;align-items:center;white-space:nowrap;${css(sp, 92, fg)}">${esc(items[j % items.length])} •</div>`);
        x += w;
      }
      return `<div style="display:flex;position:absolute;left:-400px;top:${y}px;width:${span}px;height:150px;background:${bg};transform:rotate(${rot}deg);overflow:hidden;">${parts.join('')}</div>`;
    };
    const center = textBlock(s.text, c, { anim: s.anim ?? 'zoom', max: 120, maxH: 420, align: 'center', delay: 0.3 });
    return `<div style="display:flex;position:absolute;top:0;left:0;width:${W}px;height:${H}px;">
      ${band(0, 330, -6, 1, p.accent, p.base)}${band(2, 1330, 5, -1, p.fg, p.base)}
      <div style="display:flex;position:absolute;left:90px;top:620px;width:900px;height:600px;align-items:center;justify-content:center;">${center.html}</div></div>`;
  },

  // Bouteille + légendes de l'étiquette
  bottle(s, c) {
    const { p, F } = c;
    const e = ease.out(ph(c.t, 0, 0.8));
    const n = s.items.length;
    const t0 = 0.9;
    const st = stagger(c, n, t0, 1.4);
    const bx = 70;
    const g = `<path d="M110 0 L190 0 L190 40 L184 40 L184 210 C 184 270, 280 290, 280 380 L280 860 Q 280 900 240 900 L60 900 Q 20 900 20 860 L20 380 C 20 290, 116 270, 116 210 L116 40 L110 40 Z" fill="${s.color ?? '#3E0F1C'}" stroke="${p.fg}" stroke-width="5"/>
      <rect x="108" y="0" width="84" height="80" fill="${p.accent}"/>
      <rect x="34" y="470" width="232" height="300" fill="${p.ink === p.fg ? p.base : '#FBF6EC'}" stroke="${p.accent}" stroke-width="3"/>
      <rect x="64" y="500" width="172" height="10" fill="${p.accent}"/><rect x="74" y="540" width="152" height="34" fill="#2A1B10" opacity="0.85"/>
      <rect x="90" y="600" width="120" height="10" fill="#2A1B10" opacity="0.5"/><rect x="104" y="640" width="92" height="22" fill="${p.accent}"/>
      <rect x="64" y="700" width="172" height="8" fill="#2A1B10" opacity="0.4"/><rect x="84" y="726" width="132" height="8" fill="#2A1B10" opacity="0.4"/>`;
    // zones de l'étiquette (en coordonnées écran)
    const sc = 0.95;
    const zones = [[555, 557], [615, 650], [650, 605], [720, 730], [700, 270]];
    const Y0 = 400;
    const callouts = s.items
      .map((it, i) => {
        const ce = ease.out(ph(c.t, t0 + i * st, 0.5));
        const zy = Y0 + zones[i % zones.length][0] * sc;
        const ty = Y0 + 40 + i * (1000 / n);
        return `<div style="display:flex;position:absolute;left:${bx + 300 * sc - 20}px;top:${f2(Math.min(zy, ty) - 3)}px;width:${f2(80 * ce)}px;height:${f2(Math.abs(ty - zy) + 6)}px;border-${ty > zy ? 'bottom' : 'top'}:5px solid ${p.accent};border-left:5px solid ${p.accent};opacity:${f2(ce)};"></div>
          <div style="display:flex;position:absolute;left:${bx + 300 * sc + 80}px;top:${f2(ty - 34)}px;width:${1000 - (bx + 300 * sc + 80)}px;flex-direction:column;opacity:${f2(ce)};transform:translateX(${f2((1 - ce) * 50)}px);">
            <div style="display:flex;${css(spec(F, 'display'), 50, p.accent)}line-height:1.05;">${esc(up(F, it.label))}</div>
            <div style="display:flex;${css(spec(F, 'body'), 33, p.fg)}line-height:1.3;margin-top:8px;">${esc(it.text)}</div></div>`;
      })
      .join('');
    return `<div style="display:flex;position:absolute;top:0;left:0;width:${W}px;height:${H}px;">
      ${s.title ? `<div style="display:flex;position:absolute;top:250px;left:90px;width:900px;">${textBlock(s.title, c, { anim: 'rise', max: 84, maxH: 110 }).html}</div>` : ''}
      <div style="display:flex;position:absolute;left:${bx}px;top:${f2(Y0 + (1 - e) * 300)}px;opacity:${f2(e)};">${svg(300 * sc, 900 * sc, '0 0 300 900', g)}</div>${callouts}</div>`;
  },

  // Conversation façon messagerie
  chat(s, c) {
    const { p, F } = c;
    const n = s.messages.length;
    const st = Math.max(0.9, (c.d - 1.8) / n);
    let y = 0;
    const bubbles = [];
    s.messages.forEach((m, i) => {
      const start = 0.5 + i * st;
      const me = m.from === 'me';
      const typing = !me && c.t > start - 0.7 && c.t < start;
      if (c.t < start && !typing) return;
      const e = ease.back(ph(c.t, start, 0.4));
      const sp = spec(F, 'body');
      const { lines, size } = fit(m.text, sp, { maxW: 600, maxH: 600, max: 40, min: 40, lh: 1.3 });
      const h = typing ? 100 : lines.length * size * 1.3 + 56;
      bubbles.push(
        `<div style="display:flex;width:900px;justify-content:${me ? 'flex-end' : 'flex-start'};margin-top:${bubbles.length ? 26 : 0}px;">
          <div style="display:flex;flex-direction:column;max-width:680px;padding:${typing ? '30px 38px' : '26px 38px'};border-radius:44px;${me ? 'border-bottom-right-radius:10px;' : 'border-bottom-left-radius:10px;'}background:${me ? p.accent : p.fg};transform:scale(${f2(typing ? 1 : e)});opacity:${f2(typing ? 1 : clamp(e * 2))};">
          ${
            typing
              ? `<div style="display:flex;">${[0, 1, 2].map((k) => `<div style="display:flex;width:22px;height:22px;border-radius:11px;background:${p.base};margin-right:12px;opacity:${f2(0.35 + 0.65 * Math.max(0, Math.sin(c.t * 9 - k)))};"></div>`).join('')}</div>`
              : lines.map((l) => `<div style="display:flex;${css(sp, size, p.base)}line-height:1.3;">${esc(l)}</div>`).join('')
          }</div></div>`
      );
      y += h + 26;
    });
    // défilement si la conversation dépasse la zone
    const maxH = 1100;
    const shift = Math.max(0, y - maxH);
    const header = `<div style="display:flex;align-items:center;width:900px;padding-bottom:30px;border-bottom:2px solid ${p.fg}33;margin-bottom:40px;">
      <div style="display:flex;width:90px;height:90px;border-radius:45px;background:${p.accent2};align-items:center;justify-content:center;${css(spec(F, 'display'), 46, p.base)}">${esc(up(F, (s.name ?? 'A')[0]))}</div>
      <div style="display:flex;flex-direction:column;margin-left:26px;"><div style="display:flex;${css(spec(F, 'bodyBold'), 38, p.fg)}">${esc(s.name ?? 'Ami')}</div>
      <div style="display:flex;${css(spec(F, 'body'), 26, p.fg)}opacity:0.6;">${esc(s.status ?? 'en ligne')}</div></div></div>`;
    return box(
      `${header}<div style="display:flex;flex-direction:column;height:${maxH}px;overflow:hidden;"><div style="display:flex;flex-direction:column;transform:translateY(${f2(-shift)}px);">${bubbles.join('')}</div></div>`,
      { justify: 'flex-start', pad: '260px 90px 300px 90px' }
    );
  },

  // Barre de recherche qui se tape + résultats
  search(s, c) {
    const { p, F } = c;
    const q = s.query;
    const n = Math.floor(Math.max(0, c.t - 0.4) * 18);
    const typedDone = 0.4 + q.length / 18;
    const sp = spec(F, 'body');
    const { size, lines } = fit(q, sp, { maxW: 720, maxH: 200, max: 40, min: 30, lh: 1.25 });
    void lines;
    const bar = `<div style="display:flex;align-items:center;width:900px;min-height:130px;padding:20px 40px;border-radius:70px;background:${p.fg};border-bottom:8px solid rgba(0,0,0,0.15);">
      ${svg(54, 54, '0 0 24 24', `<circle cx="10" cy="10" r="6.5" stroke="${p.base}" stroke-width="2.6" fill="none"/><path d="M15 15l5.5 5.5" stroke="${p.base}" stroke-width="2.6" stroke-linecap="round"/>`)}
      <div style="display:flex;flex:1;flex-wrap:wrap;margin-left:26px;${css(sp, size, p.base)}line-height:1.25;">${esc(q.slice(0, n))}${n < q.length || Math.floor(c.t * 2.4) % 2 ? '|' : ''}</div></div>`;
    const results = (s.results || [])
      .map((r, i) => {
        const e = ease.out(ph(c.t, typedDone + 0.5 + i * 0.5, 0.5));
        const first = i === 0;
        return `<div style="display:flex;flex-direction:column;width:900px;margin-top:30px;padding:34px 40px;border-radius:30px;background:${first ? p.accent : 'transparent'};border:3px solid ${first ? p.accent : p.fg + '55'};opacity:${f2(e)};transform:translateY(${f2((1 - e) * 60)}px);">
          <div style="display:flex;${css(spec(F, first ? 'display' : 'bodyBold'), first ? 54 : 38, first ? p.base : p.fg)}line-height:1.1;">${esc(first ? up(F, r.title) : r.title)}</div>
          ${r.text ? `<div style="display:flex;${css(spec(F, 'body'), 30, first ? p.base : p.fg)}opacity:0.85;margin-top:12px;line-height:1.3;">${esc(r.text)}</div>` : ''}</div>`;
      })
      .join('');
    const head = s.kicker ? kicker(s.kicker, c) : '';
    return box(`${head}${bar}<div style="display:flex;flex-direction:column;margin-top:30px;">${results}</div>`, { justify: 'flex-start', pad: '320px 90px 380px 90px' });
  },

  // Notifications qui s'empilent
  notifs(s, c) {
    const { p, F } = c;
    const n = s.items.length;
    const st = stagger(c, n, 0.8, 1.6);
    const cards = s.items
      .map((it, i) => {
        const e = ease.back(ph(c.t, 0.8 + i * st, 0.5));
        if (e <= 0) return '';
        return `<div style="display:flex;width:900px;padding:30px 34px;border-radius:40px;background:${p.fg};margin-bottom:24px;align-items:flex-start;transform:translateY(${f2((1 - e) * -200)}px) scale(${f2(0.85 + 0.15 * e)});opacity:${f2(clamp(e * 2))};border-bottom:8px solid rgba(0,0,0,0.15);">
          <div style="display:flex;width:84px;height:84px;border-radius:22px;background:${p.accent};align-items:center;justify-content:center;margin-right:28px;">${grapeIcon(p.base)}</div>
          <div style="display:flex;flex-direction:column;flex:1;">
            <div style="display:flex;justify-content:space-between;"><div style="display:flex;${css(spec(F, 'bodyBold'), 26, p.base)}opacity:0.6;letter-spacing:2px;">${esc((it.app ?? 'VINEA').toUpperCase())}</div><div style="display:flex;${css(spec(F, 'body'), 24, p.base)}opacity:0.5;">${esc(it.time ?? 'maintenant')}</div></div>
            <div style="display:flex;${css(spec(F, 'bodyBold'), 36, p.base)}margin-top:8px;line-height:1.2;">${esc(it.title)}</div>
            ${it.text ? `<div style="display:flex;${css(spec(F, 'body'), 30, p.base)}opacity:0.8;margin-top:6px;line-height:1.3;">${esc(it.text)}</div>` : ''}</div></div>`;
      })
      .join('');
    const clock = `<div style="display:flex;flex-direction:column;align-items:center;margin-bottom:60px;opacity:${f2(ph(c.t, 0, 0.6))};">
      <div style="display:flex;${css(spec(F, 'display'), 170, p.fg)}line-height:1;">${esc(s.clock ?? '18:42')}</div>
      <div style="display:flex;${css(spec(F, 'body'), 34, p.fg)}opacity:0.75;margin-top:10px;">${esc(s.date ?? 'vendredi')}</div></div>`;
    return box(`${clock}${cards}`, { justify: 'flex-start', align: 'center', pad: '260px 90px 300px 90px' });
  },

  // Accords : A + B (un par un)
  pairing(s, c) {
    const { p, F } = c;
    const n = s.items.length;
    const per = c.d / n;
    const i = Math.min(n - 1, Math.floor(c.t / per));
    const lt = c.t - i * per;
    const it = s.items[i];
    const eA = ease.out(ph(lt, 0, 0.5));
    const eP = ease.back(ph(lt, 0.35, 0.4));
    const eB = ease.out(ph(lt, 0.55, 0.5));
    const out = i < n - 1 ? ease.inOut(ph(lt, per - 0.3, 0.3)) : 0;
    const sp = spec(F, 'display');
    const sA = fit(up(F, it.a), sp, { maxW: 900, maxH: 300, max: 150, lh: F.lh }).size;
    const sB = fit(up(F, it.b), sp, { maxW: 900, maxH: 300, max: 150, lh: F.lh }).size;
    const lc = { ...c, t: lt };
    const note = it.note ? textBlock(it.note, lc, { role: 'body', anim: 'fade', max: 40, maxH: 260, align: 'center', delay: 1.1 }) : null;
    return box(
      `${kicker(s.kicker, { ...c, t: 9 }, { mb: 70 })}
      <div style="display:flex;flex-direction:column;align-items:center;width:900px;opacity:${f2(1 - out)};transform:scale(${f2(1 - out * 0.2)});">
        <div style="display:flex;${css(sp, sA, p.fg)}line-height:${F.lh};text-align:center;transform:translateX(${f2((1 - eA) * -900)}px);">${esc(up(F, it.a))}</div>
        <div style="display:flex;width:130px;height:130px;border-radius:65px;background:${p.accent};margin:34px 0;align-items:center;justify-content:center;transform:scale(${f2(eP)}) rotate(${f2((1 - eP) * 180)}deg);${css(spec(F, 'bodyBold'), 90, p.base)}line-height:1;">+</div>
        <div style="display:flex;${css(sp, sB, p.fg)}line-height:${F.lh};text-align:center;transform:translateX(${f2((1 - eB) * 900)}px);">${esc(up(F, it.b))}</div>
        ${note ? `<div style="display:flex;margin-top:56px;">${note.html}</div>` : ''}
        <div style="display:flex;margin-top:60px;${css(spec(F, 'alt'), 34, p.accent)}">${i + 1} / ${n}</div></div>`,
      { align: 'center' }
    );
  },

  // Mots en orbite autour d'un centre (roue des arômes...)
  orbit(s, c) {
    const { p, F } = c;
    const n = s.words.length;
    const cx = 540;
    const cy = 900;
    const R = 360;
    const rot = c.t * 0.25;
    const center = textBlock(s.text, c, { anim: 'zoom', max: 100, maxH: 300, maxW: 460, align: 'center', delay: 0.1 });
    const words = s.words
      .map((w, i) => {
        const e = ease.back(ph(c.t, 0.6 + i * 0.22, 0.45));
        const a = rot + (i / n) * Math.PI * 2;
        const x = cx + Math.cos(a) * R * e;
        const y = cy + Math.sin(a) * R * 1.12 * e;
        const col = i % 2 ? p.accent : p.accent2;
        return `<div style="display:flex;position:absolute;left:${f2(x - 150)}px;top:${f2(y - 40)}px;width:300px;height:80px;align-items:center;justify-content:center;opacity:${f2(clamp(e * 2))};">
          <div style="display:flex;padding:12px 26px;border-radius:40px;background:${col};${css(spec(F, 'bodyBold'), 30, p.base)}transform:scale(${f2(e)});">${esc(w)}</div></div>`;
      })
      .join('');
    const ring = svg(W, H, `0 0 ${W} ${H}`, `<ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R * 1.12}" fill="none" stroke="${p.fg}" stroke-opacity="0.25" stroke-width="3" stroke-dasharray="10 14"/>`, 'position:absolute;top:0;left:0;');
    const sub = s.sub ? textBlock(s.sub, c, { role: 'body', anim: 'fade', max: 38, maxH: 200, align: 'center', delay: 0.6 + n * 0.22 }) : null;
    return `<div style="display:flex;position:absolute;top:0;left:0;width:${W}px;height:${H}px;">${ring}
      <div style="display:flex;position:absolute;left:${cx - 240}px;top:${cy - 160}px;width:480px;height:320px;align-items:center;justify-content:center;">${center.html}</div>${words}
      ${s.kicker ? `<div style="display:flex;position:absolute;top:250px;left:90px;width:900px;justify-content:center;">${kicker(s.kicker, c, { style: 'pill', mb: 0 })}</div>` : ''}
      ${sub ? `<div style="display:flex;position:absolute;top:1390px;left:90px;width:900px;justify-content:center;">${sub.html}</div>` : ''}</div>`;
  },

  // Grille de tuiles qui apparaissent
  grid(s, c) {
    const { p, F } = c;
    const head = textBlock(s.title, c, { anim: 'rise', max: 86, maxH: 260 });
    const n = s.tiles.length;
    const st = stagger(c, n, head.end, 1.6);
    const rows = Math.ceil(n / 2);
    const th = Math.min(300, (1080 - 30 * (rows - 1)) / rows);
    const tiles = s.tiles
      .map((tl, i) => {
        const e = ease.back(ph(c.t, head.end + i * st, 0.45));
        const alt = (i + Math.floor(i / 2)) % 2;
        return `<div style="display:flex;flex-direction:column;justify-content:space-between;width:435px;height:${f2(th)}px;margin:0 ${i % 2 ? 0 : 30}px 30px 0;padding:30px 32px;border-radius:34px;background:${alt ? p.fg : p.accent};transform:scale(${f2(e)});opacity:${f2(clamp(e * 2))};">
          <div style="display:flex;${css(spec(F, 'display'), Math.min(64, fit(up(F, tl.title), spec(F, 'display'), { maxW: 370, maxH: 140, max: 64, lh: F.lh }).size), p.base)}line-height:${F.lh};">${esc(up(F, tl.title))}</div>
          <div style="display:flex;${css(spec(F, 'body'), 27, p.base)}line-height:1.3;opacity:0.9;">${esc(tl.text)}</div></div>`;
      })
      .join('');
    return box(`${kicker(s.kicker, c)}<div style="display:flex;margin-bottom:46px;">${head.html}</div><div style="display:flex;flex-wrap:wrap;width:900px;">${tiles}</div>`);
  },

  // Mots plein écran au rythme de la musique (un mot par temps)
  flash(s, c) {
    const { p, F } = c;
    const beat = s.beat ?? c.beat ?? 0.5;
    const per = beat * (s.every ?? 2);
    const i = Math.min(s.words.length - 1, Math.floor(c.t / per));
    const lt = c.t - i * per;
    const inv = i % 2 === 1;
    const bg = inv ? p.fg : 'transparent';
    const fg = inv ? p.base : p.fg;
    const e = ease.back(ph(lt, 0, Math.min(0.3, per * 0.6)));
    const lc = { ...c, t: 9, p: { ...p, fg, accent: inv ? p.base : p.accent } };
    const txt = textBlock(s.words[i], lc, { anim: 'none', max: 240, maxH: 900, align: 'center' });
    return `<div style="display:flex;position:absolute;top:0;left:0;width:${W}px;height:${H}px;background:${bg};align-items:center;justify-content:center;padding:250px 90px 380px 90px;">
      <div style="display:flex;transform:scale(${f2(0.6 + 0.4 * e)}) rotate(${f2((i % 3) - 1) * 2 * (1 - e)}deg);">${txt.html}</div></div>`;
  },

  // Photo plein écran (effet Ken Burns) + titre
  photo(s, c) {
    const { p } = c;
    const z = 1.08 + 0.12 * (c.t / c.d);
    const txt = textBlock(s.text, c, { anim: s.anim ?? 'rise', max: 120, maxH: 600, delay: 0.3, color: '#FFFFFF' });
    return `<div style="display:flex;position:absolute;top:0;left:0;width:${W}px;height:${H}px;">
      <img src="${s.bgImage}" style="position:absolute;top:0;left:0;width:${W}px;height:${H}px;object-fit:cover;transform:scale(${f2(z)});"/>
      <div style="display:flex;position:absolute;top:0;left:0;width:${W}px;height:${H}px;background:linear-gradient(180deg, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.75) 85%);"></div>
      <div style="display:flex;position:absolute;left:90px;bottom:420px;width:900px;flex-direction:column;">${kicker(s.kicker, { ...c, p: { ...p, accent: '#FFFFFF' } })}${txt.html}</div></div>`;
  },

  // Fin : logo + appel à l'action
  cta(s, c, brand) {
    const { p, F } = c;
    const e = ease.back(ph(c.t, 0, 0.7));
    const pulse = 1 + 0.05 * Math.sin(Math.max(0, c.t - 1.4) * 7);
    const logo = `<div style="display:flex;flex-direction:column;align-items:center;transform:scale(${f2(e)});opacity:${f2(clamp(e * 2))};">
      <div style="display:flex;">${svg(170, 190, '0 0 120 130', grapeLogo(p.accent))}</div>
      <div style="display:flex;font-family:'Fraunces';font-weight:600;font-size:150px;color:${p.fg};line-height:1;margin-top:6px;">${esc(brand?.name ?? 'vinea')}</div></div>`;
    const title = textBlock(s.title ?? brand?.tagline ?? '', c, { anim: 'rise', max: 74, maxH: 300, align: 'center', delay: 0.6 });
    const text = s.text ? textBlock(s.text, c, { role: 'body', anim: 'fade', max: 38, maxH: 200, align: 'center', delay: 1.1 }) : null;
    const btn = `<div style="display:flex;margin-top:56px;padding:26px 60px;border-radius:70px;background:${p.accent};${css(spec(F, 'bodyBold'), 40, p.base)}transform:scale(${f2(ease.back(ph(c.t, 1.3, 0.5)) * pulse)});">${esc(s.button ?? 'Lien en bio')}</div>`;
    return box(`${logo}<div style="display:flex;margin-top:50px;">${title.html}</div>${text ? `<div style="display:flex;margin-top:26px;opacity:0.85;">${text.html}</div>` : ''}${btn}`, { align: 'center' });
  },
};

function grapeMini(x, y, col) {
  return [[-8, 0], [8, 0], [0, 13]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="8" fill="${col}"/>`).join('');
}
function grapeLogo(col) {
  const pts = [[0, 0], [2, 0], [4, 0], [1, 1.7], [3, 1.7], [2, 3.4]];
  return `<path d="M60 30 C 62 16, 72 8, 86 4" stroke="${col}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M86 4 C 104 4, 114 18, 108 32 C 94 32, 86 20, 86 4 Z" fill="${col}"/>${pts
    .map(([x, y]) => `<circle cx="${28 + x * 16}" cy="${48 + y * 16}" r="15" fill="${col}"/>`)
    .join('')}`;
}
function grapeIcon(col) {
  return svg(56, 56, '0 0 120 130', grapeLogo(col));
}
