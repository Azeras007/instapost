import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_FILE = path.join(ROOT, 'state', 'published.json');
const PLACEHOLDER = 'A_COMPLETER';

const readYaml = (rel) => YAML.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

export function loadConfig() {
  return readYaml('content/config.yaml');
}

export function loadPosts() {
  const posts = readYaml('content/posts.yaml');
  const ids = new Set();
  for (const p of posts) {
    if (!p.id) throw new Error('Un post n\'a pas d\'id dans content/posts.yaml');
    if (ids.has(p.id)) throw new Error(`id en double : ${p.id}`);
    ids.add(p.id);
    if (!Array.isArray(p.slides) || !p.slides.length) throw new Error(`${p.id} : aucune slide`);
    if (p.slides.length > 10) throw new Error(`${p.id} : 10 slides max (limite Instagram)`);
  }
  return posts;
}

export function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { lastPublishedAt: null, published: [] };
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

export function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

// Prochain post : le premier "ready: true" jamais publié, dans l'ordre du fichier.
export function nextPost(posts, state) {
  const done = new Set(state.published.map((p) => p.id));
  return posts.find((p) => p.ready === true && !done.has(p.id)) || null;
}

// Refuse de publier un contenu qui contient encore des trous à remplir.
export function assertComplete(obj, label) {
  const json = JSON.stringify(obj);
  if (json.includes(PLACEHOLDER)) {
    throw new Error(`${label} contient encore "${PLACEHOLDER}" : complète-le avant publication.`);
  }
}

function hashtags(post, config, max) {
  const all = [...(post.hashtags || []), ...(config.defaultHashtags || [])];
  return [...new Set(all.map((h) => (h.startsWith('#') ? h : `#${h}`)))].slice(0, max);
}

export function captionFor(network, post, config) {
  const body = (post[network]?.caption || post.caption || '').trim();
  const max = network === 'instagram' ? 30 : 5; // IG : 30 hashtags max ; LinkedIn : 3-5 recommandés
  const tags = hashtags(post, config, max).join(' ');
  const signature = (config.signature?.[network] || '').trim();
  return [body, signature, tags].filter(Boolean).join('\n\n');
}
