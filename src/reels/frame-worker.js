// Worker : HTML -> pixels RGBA (satori + resvg). Plusieurs workers tournent en parallèle.
import fs from 'node:fs';
import path from 'node:path';
import { parentPort, workerData } from 'node:worker_threads';
import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import { FONT_FILES, W, H } from './look.js';

const fonts = FONT_FILES.map(([name, file, weight, style = 'normal']) => ({
  name,
  data: fs.readFileSync(path.join(workerData.root, 'assets', 'fonts', file)),
  weight,
  style,
}));

parentPort.on('message', async ({ id, markup, under, png }) => {
  try {
    let svg = await satori(html(markup), { width: W, height: H, fonts });
    // Fond (dégradé + décor animé) dessiné directement sous le contenu satori
    if (under) svg = svg.replace(/^(<svg[^>]*>)/, `$1${under}`);
    const img = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: false } }).render();
    const out = png ? new Uint8Array(img.asPng()) : new Uint8Array(img.pixels);
    parentPort.postMessage({ id, buf: out }, [out.buffer]);
  } catch (e) {
    parentPort.postMessage({ id, error: e.stack || String(e) });
  }
});
