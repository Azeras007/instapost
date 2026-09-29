// Point d'entrée.
//   node src/run.js preview [id]   -> rend tous les posts (ou un seul) dans out/preview pour relecture
//   node src/run.js prepare        -> choisit le prochain post, rend les images dans public/posts/<id>
//   node src/run.js publish        -> publie le post préparé sur Instagram / LinkedIn et met à jour state/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, loadConfig, loadPosts, loadState, saveState, nextPost, assertComplete, captionFor } from './content.js';
import { renderPost } from './render.js';
import { publishInstagramGraph } from './publishers/instagram-graph.js';
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

  const post = nextPost(loadPosts(), state);
  if (!post) {
    console.log('⚠️  Plus aucun post "ready: true" non publié dans content/posts.yaml. Ajoute du contenu !');
    return setOutput('has_post', 'false');
  }
  assertComplete(config.brand, 'content/config.yaml (brand)');
  assertComplete(post, `Le post ${post.id}`);

  const dir = path.join(ROOT, 'public', 'posts', post.id);
  fs.rmSync(dir, { recursive: true, force: true });
  const files = await renderPost(post, config, dir);

  const repo = process.env.GITHUB_REPOSITORY || config.repo;
  const branch = process.env.GITHUB_REF_NAME || 'main';
  const job = {
    id: post.id,
    files: files.map(rel),
    imageUrls: files.map((f) => `https://raw.githubusercontent.com/${repo}/${branch}/${rel(f)}`),
    altText: post.alt || post.slides[0].title || post.slides[0].text || config.brand.name,
    captions: {
      instagram: captionFor('instagram', post, config),
      linkedin: captionFor('linkedin', post, config),
    },
  };
  assertComplete(job.captions, `Les légendes de ${post.id} (ou la signature dans config.yaml)`);
  if (job.captions.instagram.length > 2200) throw new Error(`${post.id} : légende Instagram > 2200 caractères`);
  if (job.captions.linkedin.length > 3000) throw new Error(`${post.id} : légende LinkedIn > 3000 caractères`);

  fs.mkdirSync(path.dirname(JOB_FILE), { recursive: true });
  fs.writeFileSync(JOB_FILE, JSON.stringify(job, null, 2));
  console.log(`Post préparé : ${post.id} (${files.length} visuel(s))`);
  setOutput('has_post', 'true');
  setOutput('post_id', post.id);
}

function publishInstagrapi(job) {
  const tmp = path.join(ROOT, 'out', 'instagrapi.json');
  fs.writeFileSync(tmp, JSON.stringify({ files: job.files.map((f) => path.join(ROOT, f)), caption: job.captions.instagram }));
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
      return publishInstagramGraph({ imageUrls: job.imageUrls, caption: job.captions.instagram });
    },
    linkedin: () => {
      if (!process.env.LINKEDIN_ACCESS_TOKEN) return null;
      return publishLinkedIn({ files: job.files.map((f) => path.join(ROOT, f)), caption: job.captions.linkedin, altText: job.altText });
    },
  };

  for (const [network, fn] of Object.entries(targets)) {
    try {
      const res = await fn();
      if (!res) {
        console.log(`⏭️  ${network} : non configuré, ignoré`);
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
    state.published.push({ id: job.id, date: now, results });
    saveState(state);
  }
  if (!Object.keys(results).length) throw new Error('Aucun réseau configuré : ajoute les secrets GitHub (voir README).');
  if (Object.values(results).some((r) => r.error)) process.exitCode = 1;
}

const [cmd, arg] = process.argv.slice(2);
const commands = { preview: () => preview(arg), prepare, publish };
if (!commands[cmd]) {
  console.error('Usage : node src/run.js <preview [id] | prepare | publish>');
  process.exit(1);
}
await commands[cmd]();
