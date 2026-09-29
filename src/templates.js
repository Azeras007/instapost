// Gabarits visuels (1080x1350, format portrait 4:5 accepté par Instagram et LinkedIn).
// Satori ne supporte qu'un sous-ensemble de CSS : flexbox obligatoire dès qu'un bloc a plusieurs enfants.

export const WIDTH = 1080;
export const HEIGHT = 1350;

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Texte multi-lignes : chaque "\n" du YAML devient un bloc (satori ne gère pas <br/>).
// Le conteneur parent doit être en flex-direction:column.
const lines = (s = '') =>
  esc(s)
    .trim()
    .split('\n')
    .map((l) => `<div style="display:flex;">${l}</div>`)
    .join('');

function grapes(color, opacity = 1, size = 260) {
  const r = 22;
  const pts = [
    [0, 0], [2, 0], [4, 0], [6, 0],
    [1, 1.7], [3, 1.7], [5, 1.7],
    [2, 3.4], [4, 3.4],
    [3, 5.1],
  ];
  const circles = pts
    .map(([x, y]) => `<circle cx="${40 + x * r}" cy="${60 + y * r}" r="${r}" fill="${color}"/>`)
    .join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 260 260" style="opacity:${opacity}">
    <path d="M106 58 C 110 30, 130 18, 150 10" stroke="${color}" stroke-width="6" fill="none"/>
    <path d="M150 10 C 175 12, 195 30, 190 52 C 170 50, 155 38, 150 10 Z" fill="${color}"/>
    ${circles}
  </svg>`;
}

function footer(theme, brand, page) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
    <div style="display:flex;font-family:Fraunces;font-size:44px;color:${theme.accent};letter-spacing:1px;">${esc(brand.name)}</div>
    <div style="display:flex;font-family:Inter;font-size:24px;font-weight:600;color:${theme.muted};letter-spacing:3px;">${esc(page || brand.handle)}</div>
  </div>`;
}

function frame(theme, inner, brand, page, bgImage) {
  const bg = bgImage
    ? `<img src="${bgImage}" style="position:absolute;top:0;left:0;width:${WIDTH}px;height:${HEIGHT}px;object-fit:cover;"/>
       <div style="position:absolute;top:0;left:0;width:${WIDTH}px;height:${HEIGHT}px;background:linear-gradient(180deg, rgba(42,18,26,0.25) 0%, rgba(42,18,26,0.88) 70%);"></div>`
    : '';
  return `<div style="display:flex;flex-direction:column;width:${WIDTH}px;height:${HEIGHT}px;background:${theme.bg};position:relative;">
    ${bg}
    <div style="display:flex;flex-direction:column;justify-content:space-between;width:100%;height:100%;padding:90px 90px 80px 90px;">
      ${inner}
      ${footer(theme, brand, page)}
    </div>
  </div>`;
}

function kicker(text, color) {
  if (!text) return '<div style="display:flex;"></div>';
  return `<div style="display:flex;font-family:Inter;font-weight:700;font-size:26px;letter-spacing:6px;color:${color};text-transform:uppercase;">${esc(text)}</div>`;
}

export function themes(c) {
  return {
    wine: { bg: c.wine, text: c.cream, accent: c.cream, muted: c.gold, kicker: c.gold, deco: c.gold },
    cream: { bg: c.cream, text: c.wine, accent: c.wine, muted: c.vine, kicker: c.vine, deco: c.wine },
    vine: { bg: c.vine, text: c.cream, accent: c.cream, muted: c.blush, kicker: c.blush, deco: c.cream },
    photo: { bg: c.ink, text: c.cream, accent: c.cream, muted: c.gold, kicker: c.gold, deco: c.gold },
  };
}

// --- Gabarits -------------------------------------------------------------

export const templates = {
  // Couverture : gros titre + sous-titre.
  cover(s, t, brand, page) {
    const inner = `<div style="display:flex;flex-direction:column;flex-grow:1;justify-content:center;">
      <div style="display:flex;position:absolute;top:-40px;right:-60px;">${grapes(t.deco, 0.18, 380)}</div>
      ${kicker(s.kicker, t.kicker)}
      <div style="display:flex;flex-direction:column;font-family:Fraunces;font-weight:600;font-size:${s.titleSize || 104}px;line-height:1.05;color:${t.text};margin-top:36px;">${lines(s.title)}</div>
      ${s.subtitle ? `<div style="display:flex;flex-direction:column;font-family:Inter;font-size:38px;line-height:1.4;color:${t.text};opacity:0.85;margin-top:44px;">${lines(s.subtitle)}</div>` : ''}
    </div>`;
    return frame(t, inner, brand, page, s.bgImage);
  },

  // Citation / conviction.
  quote(s, t, brand, page) {
    const inner = `<div style="display:flex;flex-direction:column;flex-grow:1;justify-content:center;">
      ${kicker(s.kicker, t.kicker)}
      <div style="display:flex;font-family:Fraunces;font-size:240px;line-height:0.8;color:${t.muted};margin-top:30px;height:150px;">“</div>
      <div style="display:flex;flex-direction:column;font-family:Fraunces;font-weight:600;font-size:${s.textSize || 76}px;line-height:1.15;color:${t.text};">${lines(s.text)}</div>
      ${s.author ? `<div style="display:flex;font-family:Fraunces;font-style:italic;font-size:36px;color:${t.muted};margin-top:48px;">— ${esc(s.author)}</div>` : ''}
    </div>`;
    return frame(t, inner, brand, page, s.bgImage);
  },

  // Liste numérotée (3 à 4 points max pour rester lisible).
  list(s, t, brand, page) {
    const items = (s.items || [])
      .map(
        (it, i) => `<div style="display:flex;align-items:flex-start;margin-top:${i ? 44 : 0}px;">
          <div style="display:flex;font-family:Fraunces;font-weight:600;font-size:64px;color:${t.muted};width:110px;line-height:1;">${String(i + 1).padStart(2, '0')}</div>
          <div style="display:flex;flex-direction:column;flex:1;">
            <div style="display:flex;font-family:Inter;font-weight:700;font-size:40px;color:${t.text};line-height:1.2;">${esc(it.title)}</div>
            ${it.text ? `<div style="display:flex;flex-direction:column;font-family:Inter;font-size:31px;color:${t.text};opacity:0.8;line-height:1.4;margin-top:10px;">${lines(it.text)}</div>` : ''}
          </div>
        </div>`
      )
      .join('');
    const inner = `<div style="display:flex;flex-direction:column;flex-grow:1;justify-content:center;">
      ${kicker(s.kicker, t.kicker)}
      <div style="display:flex;flex-direction:column;font-family:Fraunces;font-weight:600;font-size:${s.titleSize || 72}px;line-height:1.1;color:${t.text};margin-top:28px;margin-bottom:64px;">${lines(s.title)}</div>
      <div style="display:flex;flex-direction:column;">${items}</div>
    </div>`;
    return frame(t, inner, brand, page, s.bgImage);
  },

  // Un mot / chiffre géant + explication.
  big(s, t, brand, page) {
    const inner = `<div style="display:flex;flex-direction:column;flex-grow:1;justify-content:center;">
      ${kicker(s.kicker, t.kicker)}
      <div style="display:flex;font-family:Fraunces;font-weight:600;font-size:${s.bigSize || 220}px;line-height:1;color:${t.muted};margin-top:24px;">${esc(s.big)}</div>
      <div style="display:flex;flex-direction:column;font-family:Fraunces;font-weight:600;font-size:64px;line-height:1.15;color:${t.text};margin-top:36px;">${lines(s.title)}</div>
      ${s.text ? `<div style="display:flex;flex-direction:column;font-family:Inter;font-size:34px;line-height:1.45;color:${t.text};opacity:0.85;margin-top:36px;">${lines(s.text)}</div>` : ''}
    </div>`;
    return frame(t, inner, brand, page, s.bgImage);
  },

  // Fiche domaine (pour les carrousels "domaines sous-cotés").
  domaine(s, t, brand, page) {
    const tags = (s.tags || [])
      .map(
        (tag) =>
          `<div style="display:flex;font-family:Inter;font-weight:600;font-size:26px;color:${t.text};border:2px solid ${t.muted};border-radius:40px;padding:10px 26px;margin-right:16px;margin-bottom:16px;">${esc(tag)}</div>`
      )
      .join('');
    const inner = `<div style="display:flex;flex-direction:column;flex-grow:1;justify-content:flex-end;padding-bottom:50px;">
      <div style="display:flex;font-family:Fraunces;font-weight:600;font-size:${String(s.number || '').length > 3 ? 48 : 150}px;line-height:1;color:${t.muted};">${esc(s.number || '')}</div>
      <div style="display:flex;flex-direction:column;font-family:Fraunces;font-weight:600;font-size:78px;line-height:1.05;color:${t.text};margin-top:20px;">${lines(s.name)}</div>
      <div style="display:flex;font-family:Inter;font-size:32px;color:${t.muted};margin-top:18px;letter-spacing:1px;">${esc(s.location || '')}</div>
      <div style="display:flex;flex-wrap:wrap;margin-top:36px;">${tags}</div>
      ${s.text ? `<div style="display:flex;flex-direction:column;font-family:Inter;font-size:33px;line-height:1.45;color:${t.text};opacity:0.9;margin-top:22px;">${lines(s.text)}</div>` : ''}
      ${s.price ? `<div style="display:flex;font-family:Fraunces;font-style:italic;font-size:38px;color:${t.muted};margin-top:30px;">${esc(s.price)}</div>` : ''}
    </div>`;
    return frame(t, inner, brand, page, s.bgImage);
  },

  // Dernière slide : appel à l'action.
  cta(s, t, brand, page) {
    const inner = `<div style="display:flex;flex-direction:column;flex-grow:1;justify-content:center;align-items:center;">
      ${grapes(t.deco, 0.9, 200)}
      <div style="display:flex;flex-direction:column;text-align:center;align-items:center;font-family:Fraunces;font-weight:600;font-size:${s.titleSize || 76}px;line-height:1.1;color:${t.text};margin-top:40px;">${lines(s.title || brand.tagline)}</div>
      <div style="display:flex;flex-direction:column;text-align:center;align-items:center;font-family:Inter;font-size:36px;line-height:1.4;color:${t.text};opacity:0.85;margin-top:36px;">${lines(s.text || '')}</div>
      <div style="display:flex;font-family:Inter;font-weight:700;font-size:34px;color:${t.bg};background:${t.muted};border-radius:60px;padding:22px 52px;margin-top:56px;">${esc(s.button || brand.website)}</div>
    </div>`;
    return frame(t, inner, brand, page, s.bgImage);
  },
};
