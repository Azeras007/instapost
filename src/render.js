import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import { templates, themes, WIDTH, HEIGHT } from './templates.js';
import { ROOT } from './content.js';

const fontDir = path.join(ROOT, 'assets', 'fonts');
const font = (name, file, weight, style = 'normal') => ({
  name,
  data: fs.readFileSync(path.join(fontDir, file)),
  weight,
  style,
});

let fonts;
function loadFonts() {
  fonts ??= [
    font('Fraunces', 'fraunces-600-normal.woff', 600),
    font('Fraunces', 'fraunces-400-italic.woff', 400, 'italic'),
    font('Inter', 'inter-400-normal.woff', 400),
    font('Inter', 'inter-600-normal.woff', 600),
    font('Inter', 'inter-700-normal.woff', 700),
  ];
  return fonts;
}

// Une photo locale (ex: assets/photos/domaine.jpg) est embarquée en data URI.
function imageToDataUri(rel) {
  const file = path.join(ROOT, rel);
  const ext = path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg');
  return `data:image/${ext};base64,${fs.readFileSync(file).toString('base64')}`;
}

export async function renderSlide(slide, config, page) {
  const tpl = templates[slide.template];
  if (!tpl) throw new Error(`Gabarit inconnu : "${slide.template}" (dispo : ${Object.keys(templates).join(', ')})`);

  const allThemes = themes(config.colors);
  const themeName = slide.image ? 'photo' : slide.theme || 'wine';
  const theme = allThemes[themeName];
  if (!theme) throw new Error(`Thème inconnu : "${themeName}" (dispo : ${Object.keys(allThemes).join(', ')})`);

  const data = { ...slide, bgImage: slide.image ? imageToDataUri(slide.image) : null };
  const markup = html(tpl(data, theme, config.brand, page));
  const svg = await satori(markup, { width: WIDTH, height: HEIGHT, fonts: loadFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();
}

// Rend toutes les slides d'un post dans outDir, renvoie la liste des fichiers.
export async function renderPost(post, config, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const files = [];
  const n = post.slides.length;
  for (const [i, slide] of post.slides.entries()) {
    const page = n > 1 ? `${i + 1} / ${n}` : null;
    const png = await renderSlide(slide, config, page);
    const file = path.join(outDir, `slide-${i + 1}.png`);
    fs.writeFileSync(file, png);
    files.push(file);
  }
  return files;
}
