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
  const posts = readYaml('content/posts.yaml').map((p) => ({ type: 'post', ...p }));
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

// Reels (vidéos) : content/reels.yaml
export function loadReels() {
  const file = path.join(ROOT, 'content', 'reels.yaml');
  if (!fs.existsSync(file)) return [];
  const reels = (readYaml('content/reels.yaml') || []).map((r) => ({ ...r, type: 'reel' }));
  const ids = new Set();
  for (const r of reels) {
    if (!r.id) throw new Error("Un reel n'a pas d'id dans content/reels.yaml");
    if (ids.has(r.id)) throw new Error(`id de reel en double : ${r.id}`);
    ids.add(r.id);
    if (!Array.isArray(r.scenes) || !r.scenes.length) throw new Error(`${r.id} : aucune scène`);
  }
  return reels;
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

// Prochaine publication : reels et posts répartis régulièrement jusqu'au bout.
// On prend la file qui a, en proportion, le plus de contenu restant (à égalité : un reel).
export function nextItem(posts, reels, state) {
  const post = nextPost(posts, state);
  const reel = nextPost(reels, state);
  if (!post || !reel) return post || reel || null;
  const done = new Set(state.published.map((p) => p.id));
  const left = (list) => {
    const ready = list.filter((x) => x.ready === true);
    return ready.filter((x) => !done.has(x.id)).length / ready.length;
  };
  return left(reels) >= left(posts) ? reel : post;
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
