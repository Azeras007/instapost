// Point d'entrée.
//   node src/run.js preview [id]        -> rend tous les posts (ou un seul) dans out/preview pour relecture
//   node src/run.js reels [id]          -> rend les reels (MP4 + couverture + légende) dans out/preview/reels
//   node src/run.js stills [id]         -> images clés des reels (relecture rapide, sans vidéo)
//   node src/run.js check               -> vérifie posts + reels (scènes, polices, caractères, légendes)
//   node src/run.js planning            -> calendrier prévu des publications
//   node src/run.js prepare             -> choisit la prochaine publication, rend les fichiers dans public/
//   node src/run.js publish             -> publie sur Instagram / LinkedIn et met à jour state/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, loadConfig, loadPosts, loadReels, loadState, saveState, nextItem, assertComplete, captionFor } from './content.js';
import { renderPost } from './render.js';
import { renderReel, renderStills, closePool } from './reels/render.js';
import { checkReels } from './reels/check.js';
import { publishInstagramGraph, publishInstagramReel } from './publishers/instagram-graph.js';
import { publishLinkedIn } from './publishers/linkedin.js';

const JOB_FILE = path.join(ROOT, 'out', 'current.json');
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');

function setOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

async function preview(onlyId) {
  const config = loadConfig();
  const posts = loadPosts().filter((p) => !onlyId || p.id === onlyId);
  for (const post of posts) {
    const dir = path.join(ROOT, 'out', 'preview', post.id);
    fs.rmSync(dir, { recursive: true, force: true });
    const files = await renderPost(post, config, dir);
    const text = ['instagram', 'linkedin'].map((n) => `===== ${n.toUpperCase()} =====\n${captionFor(n, post, config)}`);
    fs.writeFileSync(path.join(dir, 'legendes.txt'), text.join('\n\n') + '\n');
    console.log(`${post.ready ? '✅' : '📝'} ${post.id} -> ${files.length} visuel(s) dans ${rel(dir)}`);
  }
}

function pickReels(onlyId) {
  const reels = loadReels().filter((r) => !onlyId || r.id === onlyId || r.id.includes(onlyId));
  if (!reels.length) throw new Error(`Aucun reel ne correspond à "${onlyId}"`);
  return reels;
}

async function previewReels(onlyId) {
  const config = loadConfig();
  for (const reel of pickReels(onlyId)) {
    const dir = path.join(ROOT, 'out', 'preview', 'reels', reel.id);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`🎬 ${reel.id}`);
    const res = await renderReel(reel, config, dir, { log: console.log });
    fs.writeFileSync(path.join(dir, 'legende.txt'), captionFor('instagram', reel, config) + '\n');
    console.log(`${reel.ready ? '✅' : '📝'} ${rel(res.video)} (${res.duration.toFixed(1)} s)`);
  }
  await closePool();
}

async function stills(onlyId) {
  const config = loadConfig();
  for (const reel of pickReels(onlyId)) {
    const dir = path.join(ROOT, 'out', 'preview', 'reels', reel.id, 'images');
    fs.rmSync(dir, { recursive: true, force: true });
    const files = await renderStills(reel, config, dir);
    console.log(`🖼️  ${reel.id} -> ${files.length} images dans ${rel(dir)}`);
  }
  await closePool();
}

function check() {
  const config = loadConfig();
  const posts = loadPosts();
  const reels = loadReels();
  const problems = checkReels(reels);
  // Tout ce qui est "ready" doit être publiable tel quel
  for (const item of [...posts, ...reels].filter((x) => x.ready === true)) {
    try {
      assertComplete(config.brand, 'content/config.yaml (brand)');
      assertComplete(item, item.id);
      const ig = captionFor('instagram', item, config);
      assertComplete(ig, `légende de ${item.id}`);
      if (ig.length > 2200) throw new Error(`${item.id} : légende Instagram trop longue (${ig.length} > 2200)`);
      if ((ig.match(/#/g) || []).length > 30) throw new Error(`${item.id} : plus de 30 hashtags`);
    } catch (e) {
      problems.push(e.message);
    }
  }
  for (const p of problems) console.error(`❌ ${p}`);
  console.log(`${posts.length} posts, ${reels.length} reels (${reels.filter((r) => r.ready).length} prêts) : ${problems.length ? `${problems.length} problème(s)` : 'tout est bon ✅'}`);
  if (problems.length) process.exitCode = 1;
}

// Calendrier prévu : 1 publication par jour (vers 18h, heure de Paris), reel et post en alternance.
function planning() {
  const state = structuredClone(loadState());
  const posts = loadPosts();
  const reels = loadReels();
  const hours = Number(process.env.MIN_HOURS_BETWEEN_POSTS ?? 20);
  const step = hours <= 24 ? 1 : Math.ceil(hours / 24);
  const day = new Date();
  if (state.lastPublishedAt) {
    const last = new Date(state.lastPublishedAt);
    day.setTime(Math.max(day.getTime(), last.getTime() + step * 864e5 - 4 * 36e5));
  }
  const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });
  let n = 0;
  for (let item; (item = nextItem(posts, reels, state)); n++) {
    console.log(`${fmt.format(day).padEnd(20)} ${item.type === 'reel' ? '🎬 reel' : '🖼️  post'}  ${item.id}`);
    state.published.push({ id: item.id, type: item.type });
    day.setDate(day.getDate() + step);
  }
  console.log(`\n${n} publications programmées (ou plus si tu ajoutes du contenu "ready: true").`);
}

async function prepare() {
  const config = loadConfig();
  const state = loadState();
  const minHours = Number(process.env.MIN_HOURS_BETWEEN_POSTS ?? 44);

  if (state.lastPublishedAt && process.env.FORCE !== 'true') {
    const hours = (Date.now() - Date.parse(state.lastPublishedAt)) / 36e5;
    if (hours < minHours) {
      console.log(`Dernier post il y a ${hours.toFixed(1)} h (< ${minHours} h) : rien à faire aujourd'hui.`);
      return setOutput('has_post', 'false');
    }
  }

  const item = nextItem(loadPosts(), loadReels(), state);
  if (!item) {
    console.log('⚠️  Plus aucun post ni reel "ready: true" non publié dans content/. Ajoute du contenu !');
    return setOutput('has_post', 'false');
  }
  assertComplete(config.brand, 'content/config.yaml (brand)');
  assertComplete(item, `${item.type === 'reel' ? 'Le reel' : 'Le post'} ${item.id}`);

  const repo = process.env.GITHUB_REPOSITORY || config.repo;
  const branch = process.env.GITHUB_REF_NAME || 'main';
  const url = (f) => `https://raw.githubusercontent.com/${repo}/${branch}/${rel(f)}`;
  let job;

  if (item.type === 'reel') {
    const problems = checkReels([item]);
    if (problems.length) throw new Error(problems.join('\n'));
    const dir = path.join(ROOT, 'public', 'reels', item.id);
    fs.rmSync(dir, { recursive: true, force: true });
    const res = await renderReel(item, config, dir, { log: console.log });
    await closePool();
    job = {
      type: 'reel',
      id: item.id,
      video: rel(res.video),
      cover: rel(res.cover),
      files: [rel(res.video), rel(res.cover)],
      videoUrl: url(res.video),
      coverUrl: url(res.cover),
      captions: { instagram: captionFor('instagram', item, config) },
    };
  } else {
    const dir = path.join(ROOT, 'public', 'posts', item.id);
    fs.rmSync(dir, { recursive: true, force: true });
    const files = await renderPost(item, config, dir);
    job = {
      type: 'post',
      id: item.id,
      files: files.map(rel),
      imageUrls: files.map(url),
      altText: item.alt || item.slides[0].title || item.slides[0].text || config.brand.name,
      captions: {
        instagram: captionFor('instagram', item, config),
        linkedin: captionFor('linkedin', item, config),
      },
    };
    if (job.captions.linkedin.length > 3000) throw new Error(`${item.id} : légende LinkedIn > 3000 caractères`);
  }
  assertComplete(job.captions, `Les légendes de ${item.id} (ou la signature dans config.yaml)`);
  if (job.captions.instagram.length > 2200) throw new Error(`${item.id} : légende Instagram > 2200 caractères`);

  fs.mkdirSync(path.dirname(JOB_FILE), { recursive: true });
  fs.writeFileSync(JOB_FILE, JSON.stringify(job, null, 2));
  console.log(`${job.type === 'reel' ? 'Reel' : 'Post'} préparé : ${item.id}`);
  setOutput('has_post', 'true');
  setOutput('post_id', item.id);
  setOutput('post_type', job.type);
}

function publishInstagrapi(job) {
  const tmp = path.join(ROOT, 'out', 'instagrapi.json');
  const payload =
    job.type === 'reel'
      ? { video: path.join(ROOT, job.video), cover: path.join(ROOT, job.cover), caption: job.captions.instagram }
      : { files: job.files.map((f) => path.join(ROOT, f)), caption: job.captions.instagram };
  fs.writeFileSync(tmp, JSON.stringify(payload));
  const py = spawnSync(process.env.PYTHON || 'python', [path.join(ROOT, 'src', 'publishers', 'instagrapi_publish.py'), tmp], {
    encoding: 'utf8',
  });
  if (py.status !== 0) throw new Error(`instagrapi : ${py.stderr || py.error}`);
  return JSON.parse(py.stdout.trim().split('\n').pop());
}

async function publish() {
  const job = JSON.parse(fs.readFileSync(JOB_FILE, 'utf8'));
  const igMethod = process.env.IG_METHOD || 'graph';
  const results = {};

  const targets = {
    instagram: () => {
      if (igMethod === 'off') return null;
      if (igMethod === 'instagrapi') return publishInstagrapi(job);
      if (!process.env.IG_ACCESS_TOKEN) return null;
      if (job.type === 'reel')
        return publishInstagramReel({ file: path.join(ROOT, job.video), videoUrl: job.videoUrl, coverUrl: job.coverUrl, caption: job.captions.instagram });
      return publishInstagramGraph({ imageUrls: job.imageUrls, caption: job.captions.instagram });
    },
    linkedin: () => {
      if (job.type === 'reel') return null; // les reels sont pensés pour Instagram
      if (!process.env.LINKEDIN_ACCESS_TOKEN) return null;
      return publishLinkedIn({ files: job.files.map((f) => path.join(ROOT, f)), caption: job.captions.linkedin, altText: job.altText });
    },
  };

  for (const [network, fn] of Object.entries(targets)) {
    try {
      const res = await fn();
      if (!res) {
        console.log(`⏭️  ${network} : non configuré${job.type === 'reel' && network === 'linkedin' ? ' pour les reels' : ''}, ignoré`);
        continue;
      }
      results[network] = { id: res.id };
      console.log(`✅ ${network} : publié (${res.id})`);
    } catch (e) {
      results[network] = { error: e.message };
      console.error(`❌ ${network} : ${e.message}`);
    }
  }

  const ok = Object.values(results).some((r) => r.id);
  if (ok) {
    const state = loadState();
    const now = new Date().toISOString();
    state.lastPublishedAt = now;
    state.published.push({ id: job.id, type: job.type, date: now, results });
    saveState(state);
  }
  if (!Object.keys(results).length) throw new Error('Aucun réseau configuré : ajoute les secrets GitHub (voir README).');
  if (Object.values(results).some((r) => r.error)) process.exitCode = 1;
}

const [cmd, arg] = process.argv.slice(2);
const commands = { preview: () => preview(arg), reels: () => previewReels(arg), stills: () => stills(arg), check, planning, prepare, publish };
if (!commands[cmd]) {
  console.error('Usage : node src/run.js <preview [id] | reels [id] | stills [id] | check | planning | prepare | publish>');
  process.exit(1);
}
await commands[cmd]();
