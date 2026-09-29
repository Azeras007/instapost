// Génère de nouveaux posts avec une IA LOCALE (Ollama, gratuit, rien ne sort de ton PC)
// et les ajoute à la fin de content/posts.yaml en "ready: false" pour relecture.
//
//   1. Installe Ollama : https://ollama.com/download  puis  ollama pull mistral
//   2. node scripts/generate.js            -> 3 posts
//      node scripts/generate.js 6 "thème"  -> 6 posts sur un thème donné (ex: "vendanges", "Noël")
//   3. npm run preview, relis, passe les bons en ready: true, puis git push.
//
// Options (variables d'env) : OLLAMA_MODEL (défaut mistral), OLLAMA_URL (défaut http://localhost:11434)
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { ROOT, loadPosts } from '../src/content.js';
import { templates } from '../src/templates.js';

const MODEL = process.env.OLLAMA_MODEL || 'mistral';
const URL_ = process.env.OLLAMA_URL || 'http://localhost:11434';
const count = Number(process.argv[2] || 3);
const theme = process.argv[3] || '';

const BRIEF = `Vinea est une marketplace française de vins et d'expériences œnotouristiques.
Mission : faire consommer local, faire découvrir les domaines viticoles proches de chez soi,
permettre de soutenir financièrement ces domaines, avec des vins moins chers qu'en grande surface
(achat en direct, sans intermédiaires). Offre : achat de vins en direct, expériences au domaine
(visites, dégustations, vendanges, ateliers), soutien financier aux vignerons.
Ton : chaleureux, direct, tutoiement, jamais snob, un peu pédagogique. Français impeccable.`;

const SCHEMA = `Réponds UNIQUEMENT avec un JSON de la forme {"posts": [ ... ]}. Chaque post :
{
  "id": "slug-court-en-minuscules",
  "slides": [ ...1 slide (post simple) ou 3 à 6 slides (carrousel, finir par une slide "cta")... ],
  "caption": "légende Instagram, 400 à 900 caractères, emojis modérés, finit par une question ou un appel à l'action, SANS hashtags",
  "hashtags": ["2 à 4 hashtags sans #, en minuscules, sans accents"]
}
Types de slides ("template") et champs (textes COURTS, "\\n" pour aller à la ligne) :
- {"template":"quote","theme":"wine|cream|vine","kicker":"2-3 mots","text":"citation < 90 caractères"}
- {"template":"cover","theme":"...","kicker":"...","title":"titre < 40 caractères","subtitle":"< 90 caractères"}
- {"template":"list","theme":"...","kicker":"...","title":"< 45 caractères","items":[{"title":"< 30 caractères","text":"< 90 caractères"}]}  (3 ou 4 items)
- {"template":"big","theme":"...","kicker":"...","big":"1 mot ou chiffre","title":"< 60 caractères","text":"< 160 caractères"}
- {"template":"cta","theme":"wine","title":"< 45 caractères","text":"< 100 caractères"}
Règles : n'invente AUCUN nom de domaine, de vigneron, de lieu précis ni de statistique chiffrée.
Varie les types de posts (conviction, pédagogie vin, idée reçue, question à la communauté, coulisses, conseil).`;

const existing = loadPosts();
const prompt = `${BRIEF}

Posts déjà publiés ou prévus (NE PAS les répéter) :
${existing.map((p) => `- ${p.id}`).join('\n')}

Écris ${count} nouveaux posts${theme ? ` sur le thème : ${theme}` : ''}.

${SCHEMA}`;

const slug = (s) =>
  String(s || 'post')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'post';

// Nettoie et valide ce que renvoie le modèle ; rejette ce qui n'est pas exploitable.
export function sanitize(raw, takenIds) {
  const out = [];
  for (const p of raw?.posts || []) {
    const slides = (p.slides || [])
      .filter((s) => s && templates[s.template])
      .map((s) => ({ ...s, theme: ['wine', 'cream', 'vine'].includes(s.theme) ? s.theme : 'wine' }))
      .slice(0, 10);
    if (!slides.length || !p.caption) continue;
    let id = slug(p.id || slides[0].title || slides[0].text);
    while (takenIds.has(id)) id += '-2';
    takenIds.add(id);
    out.push({
      id,
      ready: false,
      generated: new Date().toISOString().slice(0, 10),
      slides,
      caption: String(p.caption).replace(/#\S+/g, '').trim() + '\n',
      hashtags: (p.hashtags || []).map((h) => slug(h).replace(/-/g, '')).filter(Boolean).slice(0, 4),
    });
  }
  return out;
}

async function main() {
  console.log(`Génération de ${count} post(s) avec ${MODEL}… (peut prendre 1 à 3 min)`);
  const res = await fetch(`${URL_}/api/chat`, {
    method: 'POST',
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      format: 'json',
      options: { temperature: 0.8 },
      messages: [{ role: 'user', content: prompt }],
    }),
  }).catch(() => {
    throw new Error(`Ollama injoignable sur ${URL_}. Il est installé et lancé ? (https://ollama.com/download)`);
  });
  if (!res.ok) throw new Error(`Ollama : ${res.status} ${await res.text()} (modèle téléchargé ? "ollama pull ${MODEL}")`);
  const { message } = await res.json();

  const posts = sanitize(JSON.parse(message.content), new Set(existing.map((p) => p.id)));
  if (!posts.length) throw new Error(`Le modèle n'a rien renvoyé d'exploitable :\n${message.content}`);

  const file = path.join(ROOT, 'content', 'posts.yaml');
  const block = YAML.stringify(posts, { lineWidth: 0 });
  fs.appendFileSync(file, `\n# --- Générés par IA (${MODEL}) : à relire, puis ready: true ---\n${block}`);
  console.log(`✅ ${posts.length} post(s) ajouté(s) à content/posts.yaml (ready: false) :`);
  posts.forEach((p) => console.log(`   - ${p.id}`));
  console.log('Relis-les avec : npm run preview <id>');
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((e) => {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  });
}
