// Identité visuelle des Reels : palettes, duos de polices, fonds animés.
// Un Reel choisit un "look" : { palette, font, bg, transition } -> combinaisons quasi infinies.

export const W = 1080;
export const H = 1920;

export const PALETTES = {
  bordeaux: { bg: 'linear-gradient(170deg, #6B2337 0%, #3B1220 100%)', base: '#4A1828', fg: '#F5EFE4', accent: '#C9A063', accent2: '#E6CFC2', ink: '#2A0E17' },
  creme: { bg: '#F5EFE4', base: '#F5EFE4', fg: '#5A1E2E', accent: '#4E6B3C', accent2: '#C9A063', ink: '#F5EFE4' },
  vigne: { bg: 'linear-gradient(180deg, #56763F 0%, #2F4425 100%)', base: '#435C34', fg: '#F5EFE4', accent: '#E6CFC2', accent2: '#C9A063', ink: '#1E2B17' },
  nuit: { bg: 'linear-gradient(180deg, #151C30 0%, #2A1420 100%)', base: '#1D1A2A', fg: '#F5EFE4', accent: '#C9A063', accent2: '#D0546A', ink: '#0D101C' },
  terracotta: { bg: '#C8654A', base: '#C8654A', fg: '#FFF4E8', accent: '#2B1B17', accent2: '#F2C14E', ink: '#7E3522' },
  rose: { bg: 'linear-gradient(180deg, #F7E1D9 0%, #EFC7BB 100%)', base: '#F4D9D0', fg: '#5A1E2E', accent: '#C4506A', accent2: '#4E6B3C', ink: '#FFF7F3' },
  champagne: { bg: 'linear-gradient(180deg, #F6EBCD 0%, #E7CF94 100%)', base: '#EFDDAE', fg: '#3A2A12', accent: '#8C5E1A', accent2: '#5A1E2E', ink: '#FFF9EA' },
  encre: { bg: '#111111', base: '#111111', fg: '#FFFFFF', accent: '#E4C46A', accent2: '#E25C6A', ink: '#000000' },
  pop: { bg: '#FFD23F', base: '#FFD23F', fg: '#1D1D1B', accent: '#D7263D', accent2: '#FFFFFF', ink: '#1D1D1B' },
  olive: { bg: 'linear-gradient(180deg, #364230 0%, #232B1E 100%)', base: '#2F3A28', fg: '#ECE7CF', accent: '#C2D36B', accent2: '#E9A23B', ink: '#161C12' },
  lavande: { bg: 'linear-gradient(180deg, #D9C4E6 0%, #BBA0D0 100%)', base: '#CDB4DB', fg: '#2E1A47', accent: '#6B1F3A', accent2: '#FFFFFF', ink: '#2E1A47' },
  sunset: { bg: 'linear-gradient(180deg, #FF8A5C 0%, #C2436A 55%, #4B1838 100%)', base: '#B23E63', fg: '#FFF6EE', accent: '#FFE29A', accent2: '#2B0F24', ink: '#2B0F24' },
  mer: { bg: 'linear-gradient(180deg, #13586A 0%, #0A2E38 100%)', base: '#0F4250', fg: '#F2F2E9', accent: '#9BD1C7', accent2: '#F2C14E', ink: '#06222A' },
  craie: { bg: '#2E2F2C', base: '#2E2F2C', fg: '#F0EDE5', accent: '#F2C14E', accent2: '#E88873', ink: '#1C1D1B' },
  kraft: { bg: '#CDAE83', base: '#CDAE83', fg: '#2A1B10', accent: '#7A1F2B', accent2: '#FFF7E8', ink: '#2A1B10' },
  rubis: { bg: '#B3122E', base: '#B3122E', fg: '#FFF1E6', accent: '#1A0A0E', accent2: '#FFC9B9', ink: '#5C0716' },
  menthe: { bg: '#DCEFE2', base: '#DCEFE2', fg: '#173B2C', accent: '#E0565B', accent2: '#2F7A5A', ink: '#173B2C' },
  blanc: { bg: '#FAFAF7', base: '#FAFAF7', fg: '#161616', accent: '#5A1E2E', accent2: '#8A8A85', ink: '#FAFAF7' },
};

// display = titres, body = textes, alt = italique/accent. case: 'upper' pour les polices affiche.
export const FONTS = {
  classic: { display: 'Fraunces', dw: 600, body: 'Inter', alt: 'Fraunces', altStyle: 'italic', altW: 400, ratio: 0.55, lh: 1.05 },
  poster: { display: 'Bebas Neue', dw: 400, body: 'Space Mono', alt: 'Space Mono', altW: 700, ratio: 0.4, lh: 0.95, case: 'upper', ls: 2 },
  bold: { display: 'Anton', dw: 400, body: 'Inter', alt: 'Inter', altW: 700, ratio: 0.47, lh: 1.02, case: 'upper', ls: 1 },
  elegant: { display: 'Playfair Display', dw: 800, body: 'Inter', alt: 'Playfair Display', altStyle: 'italic', altW: 500, ratio: 0.56, lh: 1.08 },
  hand: { display: 'Caveat', dw: 700, body: 'Inter', alt: 'Caveat', altW: 700, ratio: 0.42, lh: 1.0 },
  retro: { display: 'Pacifico', dw: 400, body: 'Inter', alt: 'DM Serif Display', altStyle: 'italic', altW: 400, ratio: 0.6, lh: 1.25 },
  editorial: { display: 'DM Serif Display', dw: 400, body: 'Inter', alt: 'DM Serif Display', altStyle: 'italic', altW: 400, ratio: 0.5, lh: 1.05 },
  brut: { display: 'Archivo Black', dw: 400, body: 'Space Mono', alt: 'Space Mono', altW: 700, ratio: 0.68, lh: 1.0, case: 'upper' },
  modern: { display: 'Syne', dw: 800, body: 'Inter', alt: 'Inter', altW: 600, ratio: 0.66, lh: 1.02 },
  vintage: { display: 'Abril Fatface', dw: 400, body: 'Inter', alt: 'Playfair Display', altStyle: 'italic', altW: 500, ratio: 0.52, lh: 1.08 },
  mono: { display: 'Space Mono', dw: 700, body: 'Space Mono', alt: 'Space Mono', altW: 400, ratio: 0.62, lh: 1.12 },
};

export const FONT_FILES = [
  ['Fraunces', 'fraunces-600-normal.woff', 600],
  ['Fraunces', 'fraunces-400-italic.woff', 400, 'italic'],
  ['Inter', 'inter-400-normal.woff', 400],
  ['Inter', 'inter-600-normal.woff', 600],
  ['Inter', 'inter-700-normal.woff', 700],
  ['Bebas Neue', 'bebas-neue-400-normal.woff', 400],
  ['Anton', 'anton-400-normal.woff', 400],
  ['Playfair Display', 'playfair-display-800-normal.woff', 800],
  ['Playfair Display', 'playfair-display-500-italic.woff', 500, 'italic'],
  ['Caveat', 'caveat-700-normal.woff', 700],
  ['Pacifico', 'pacifico-400-normal.woff', 400],
  ['DM Serif Display', 'dm-serif-display-400-normal.woff', 400],
  ['DM Serif Display', 'dm-serif-display-400-italic.woff', 400, 'italic'],
  ['Archivo Black', 'archivo-black-400-normal.woff', 400],
  ['Syne', 'syne-800-normal.woff', 800],
  ['Abril Fatface', 'abril-fatface-400-normal.woff', 400],
  ['Space Mono', 'space-mono-400-normal.woff', 400],
  ['Space Mono', 'space-mono-700-normal.woff', 700],
];

// --- Fonds animés (SVG) ---------------------------------------------------------
// fn(t secondes, palette, rnd) -> contenu SVG. Restent discrets pour ne pas gêner la lecture.

// Les fonds renvoient des fragments SVG (coordonnées 1080x1920). Ils sont dessinés directement
// sous le rendu satori (voir frame-worker.js) : bien plus rapide qu'une image SVG imbriquée.
// fill-opacity plutôt que opacity : resvg n'a pas à créer un calque par forme.
const svgWrap = (inner) => inner.replace(/ opacity="([\d.]+)"/g, ' fill-opacity="$1" stroke-opacity="$1"');
export const bgAsSatori = (inner) => `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;top:0;left:0;">${inner}</svg>`;

// Fond CSS de la palette ("#hex" ou "linear-gradient(...)") -> SVG
export function paletteFill(bg, id = 'pbg') {
  const m = /^linear-gradient\(\s*([\d.]+)deg\s*,(.*)\)$/.exec(bg.trim());
  if (!m) return `<rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>`;
  const a = (Number(m[1]) * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const L = Math.abs((W / 2) * dx) + Math.abs((H / 2) * dy);
  const stops = m[2]
    .split(/,(?![^(]*\))/)
    .map((st) => st.trim().split(/\s+/))
    .map(([col, pos], i, arr) => `<stop offset="${pos ?? `${(i / (arr.length - 1)) * 100}%`}" stop-color="${col}"/>`)
    .join('');
  return `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${W / 2 - dx * L}" y1="${H / 2 - dy * L}" x2="${W / 2 + dx * L}" y2="${H / 2 + dy * L}">${stops}</linearGradient></defs><rect x="0" y="0" width="${W}" height="${H}" fill="url(#${id})"/>`;
}
const seq = (n) => Array.from({ length: n }, (_, i) => i);
const fr = (i, k = 1) => {
  const x = Math.sin(i * 127.1 * k + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function grapeCluster(cx, cy, s, color, op) {
  const pts = [[0, 0], [2, 0], [4, 0], [1, 1.7], [3, 1.7], [2, 3.4]];
  const c = pts.map(([x, y]) => `<circle cx="${cx + (x - 2) * 11 * s}" cy="${cy + y * 11 * s}" r="${11 * s}" fill="${color}"/>`).join('');
  return `<g opacity="${op}"><path d="M${cx} ${cy - 4 * s} C ${cx + 4 * s} ${cy - 18 * s}, ${cx + 14 * s} ${cy - 24 * s}, ${cx + 22 * s} ${cy - 26 * s}" stroke="${color}" stroke-width="${3 * s}" fill="none"/>${c}</g>`;
}

function leaf(cx, cy, s, rot, color, op) {
  return `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${s})" opacity="${op}"><path d="M0 -40 C 25 -38, 40 -15, 30 5 C 45 10, 40 30, 20 32 C 15 45, -15 45, -20 32 C -40 30, -45 10, -30 5 C -40 -15, -25 -38, 0 -40 Z" fill="${color}"/><path d="M0 -30 L0 40" stroke="${color}" stroke-width="3" opacity="0.5"/></g>`;
}

export const BACKGROUNDS = {
  flat: () => '',

  bubbles: (t, p) =>
    svgWrap(
      seq(38)
        .map((i) => {
          const speed = 90 + fr(i) * 160;
          const r = 5 + fr(i, 2) * 20;
          const x = fr(i, 3) * W + Math.sin(t * 1.5 + i) * 18;
          const y = H + 60 - ((t * speed + fr(i, 4) * (H + 120)) % (H + 120));
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${p.accent}" stroke-width="3" opacity="${(0.18 + fr(i, 5) * 0.3).toFixed(2)}"/>`;
        })
        .join('')
    ),

  grapes: (t, p) =>
    svgWrap(
      seq(9)
        .map((i) => {
          const x = fr(i) * W;
          const y = ((fr(i, 2) * H + t * (25 + fr(i, 3) * 30)) % (H + 300)) - 150;
          return grapeCluster(x, y, 1.6 + fr(i, 4) * 2, p.accent, 0.1 + fr(i, 5) * 0.08);
        })
        .join('')
    ),

  leaves: (t, p) =>
    svgWrap(
      seq(14)
        .map((i) => {
          const x = fr(i) * W + Math.sin(t * 0.9 + i) * 60;
          const y = ((fr(i, 2) * H + t * (70 + fr(i, 3) * 60)) % (H + 200)) - 100;
          return leaf(x, y, 0.8 + fr(i, 4) * 1.4, t * (30 + fr(i, 5) * 50) + i * 40, i % 3 ? p.accent : p.accent2, 0.16);
        })
        .join('')
    ),

  stripes: (t, p) =>
    svgWrap(
      `<g transform="rotate(-30 540 960)">${seq(26)
        .map((i) => `<rect x="${-900 + i * 140 + ((t * 60) % 140)}" y="-600" width="46" height="3200" fill="${p.accent}" opacity="0.09"/>`)
        .join('')}</g>`
    ),

  rays: (t, p) =>
    svgWrap(
      `<g transform="rotate(${(t * 6).toFixed(2)} 540 1080)">${seq(18)
        .map((i) => {
          const a1 = (i / 18) * Math.PI * 2;
          const a2 = a1 + Math.PI / 30;
          const R = 2400;
          return `<path d="M540 1080 L${540 + Math.cos(a1) * R} ${1080 + Math.sin(a1) * R} L${540 + Math.cos(a2) * R} ${1080 + Math.sin(a2) * R} Z" fill="${p.accent}" opacity="0.08"/>`;
        })
        .join('')}</g>`
    ),

  waves: (t, p) =>
    svgWrap(
      seq(7)
        .map((k) => {
          const y0 = 1250 + k * 110;
          let d = `M0 ${y0}`;
          for (let x = 0; x <= W; x += 40) d += ` L${x} ${(y0 + Math.sin(x / 140 + t * 1.6 + k) * 26).toFixed(1)}`;
          return `<path d="${d}" stroke="${k % 2 ? p.accent : p.accent2}" stroke-width="4" fill="none" opacity="${0.12 + k * 0.03}"/>`;
        })
        .join('')
    ),

  dots: (t, p) =>
    svgWrap(
      seq(13 * 22)
        .map((i) => {
          const cx = (i % 13) * 90 + ((t * 20) % 90);
          const cy = Math.floor(i / 13) * 90 + 20;
          return `<circle cx="${cx}" cy="${cy}" r="6" fill="${p.accent}" opacity="0.13"/>`;
        })
        .join('')
    ),

  blobs: (t, p) =>
    svgWrap(
      seq(4)
        .map((i) => {
          const cx = 540 + Math.sin(t * 0.5 + i * 1.7) * 380;
          const cy = 960 + Math.cos(t * 0.4 + i * 2.3) * 700;
          const col = i % 2 ? p.accent : p.accent2;
          return seq(6)
            .map((k) => `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${200 + k * 55}" fill="${col}" opacity="0.045"/>`)
            .join('');
        })
        .join('')
    ),

  grid: (t, p) =>
    svgWrap(
      seq(13).map((i) => `<line x1="${i * 90}" y1="0" x2="${i * 90}" y2="${H}" stroke="${p.accent}" stroke-width="2" opacity="0.13"/>`).join('') +
        seq(22).map((i) => `<line x1="0" y1="${i * 90 + ((t * 15) % 90)}" x2="${W}" y2="${i * 90 + ((t * 15) % 90)}" stroke="${p.accent}" stroke-width="2" opacity="0.13"/>`).join('')
    ),

  rings: (t, p) =>
    svgWrap(
      seq(7)
        .map((k) => {
          const r = ((t * 120 + k * 230) % 1600) + 20;
          return `<circle cx="540" cy="960" r="${r.toFixed(1)}" fill="none" stroke="${p.accent}" stroke-width="3" opacity="${(0.25 * (1 - r / 1620)).toFixed(3)}"/>`;
        })
        .join('')
    ),

  confetti: (t, p) =>
    svgWrap(
      seq(40)
        .map((i) => {
          const x = fr(i) * W + Math.sin(t * 2 + i) * 30;
          const y = ((fr(i, 2) * H + t * (160 + fr(i, 3) * 140)) % (H + 80)) - 40;
          const col = [p.accent, p.accent2, p.fg][i % 3];
          return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="18" height="34" rx="4" fill="${col}" opacity="0.5" transform="rotate(${(t * 140 * (fr(i, 4) - 0.5) + i * 30).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
        })
        .join('')
    ),

  frame: (t, p) =>
    svgWrap(
      `<rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="${p.accent}" stroke-width="3" opacity="0.7"/>
       <rect x="58" y="58" width="${W - 116}" height="${H - 116}" fill="none" stroke="${p.accent}" stroke-width="1.5" opacity="0.5"/>
       ${seq(4).map((k) => `<circle cx="${k % 2 ? W - 58 : 58}" cy="${k < 2 ? 58 : H - 58}" r="${10 + Math.sin(t * 2 + k) * 3}" fill="${p.accent}" opacity="0.7"/>`).join('')}`
    ),

  spotlight: (t, p) =>
    svgWrap(
      seq(8)
        .map((k) => {
          const cx = 540 + Math.sin(t * 0.7) * 260;
          const cy = 820 + Math.cos(t * 0.5) * 300;
          return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${120 + k * 90}" fill="${p.accent}" opacity="0.035"/>`;
        })
        .join('')
    ),

  chalk: (t, p) =>
    svgWrap(
      `<rect x="34" y="34" width="${W - 68}" height="${H - 68}" rx="10" fill="none" stroke="#8B5E34" stroke-width="22"/>` +
        seq(30)
          .map((i) => `<ellipse cx="${fr(i) * W}" cy="${fr(i, 2) * H}" rx="${40 + fr(i, 3) * 120}" ry="${10 + fr(i, 4) * 30}" fill="${p.fg}" opacity="0.025" transform="rotate(${fr(i, 5) * 40 - 20} ${fr(i) * W} ${fr(i, 2) * H})"/>`)
          .join('')
    ),

  sparkles: (t, p) =>
    svgWrap(
      seq(26)
        .map((i) => {
          const x = fr(i) * W;
          const y = fr(i, 2) * H;
          const s = Math.max(0, Math.sin(t * (1.5 + fr(i, 3) * 2) + i * 2)) * (10 + fr(i, 4) * 16);
          return `<path d="M${x} ${y - s} L${x + s * 0.25} ${y - s * 0.25} L${x + s} ${y} L${x + s * 0.25} ${y + s * 0.25} L${x} ${y + s} L${x - s * 0.25} ${y + s * 0.25} L${x - s} ${y} L${x - s * 0.25} ${y - s * 0.25} Z" fill="${p.accent}" opacity="0.6"/>`;
        })
        .join('')
    ),

  checker: (t, p) =>
    svgWrap(
      `<g transform="translate(${-((t * 30) % 240)} 0)">${seq(10 * 9)
        .map((i) => {
          const cx = (i % 10) * 240 - 120 + 120 * (Math.floor(i / 10) % 2);
          const cy = Math.floor(i / 10) * 240 - 120;
          return `<rect x="${cx}" y="${cy}" width="120" height="${240 * 1}" fill="${p.accent}" opacity="0.06"/>`;
        })
        .join('')}</g>`
    ),
};
