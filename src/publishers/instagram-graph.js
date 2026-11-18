import fs from 'node:fs';

// Publication via l'API officielle "Instagram API with Instagram Login" (gratuite).
// Doc : https://developers.facebook.com/docs/instagram-platform/content-publishing
// Les images doivent être accessibles par URL publique : on utilise les URL raw GitHub du repo.

const API = `https://graph.instagram.com/${process.env.IG_GRAPH_VERSION || 'v23.0'}`;

async function call(method, endpoint, params) {
  const url = new URL(`${API}/${endpoint}`);
  const body = new URLSearchParams({ ...params, access_token: process.env.IG_ACCESS_TOKEN });
  const res =
    method === 'GET'
      ? await fetch(`${url}?${body}`)
      : await fetch(url, { method, body });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Instagram ${endpoint} : ${json.error?.message || res.status} ${JSON.stringify(json.error || {})}`);
  }
  return json;
}

// Un conteneur doit être FINISHED avant publication (surtout pour les carrousels et les vidéos).
async function waitReady(containerId, tries = 30) {
  for (let i = 0; i < tries; i++) {
    const { status_code } = await call('GET', containerId, { fields: 'status_code' });
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') {
      throw new Error(`Conteneur Instagram ${containerId} en état ${status_code}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Conteneur Instagram ${containerId} jamais prêt`);
}

export async function publishInstagramGraph({ imageUrls, caption }) {
  if (!process.env.IG_ACCESS_TOKEN) throw new Error('IG_ACCESS_TOKEN manquant');

  let creationId;
  if (imageUrls.length === 1) {
    ({ id: creationId } = await call('POST', 'me/media', { image_url: imageUrls[0], caption }));
  } else {
    const children = [];
    for (const image_url of imageUrls) {
      const { id } = await call('POST', 'me/media', { image_url, is_carousel_item: 'true' });
      children.push(id);
    }
    for (const id of children) await waitReady(id);
    ({ id: creationId } = await call('POST', 'me/media', {
      media_type: 'CAROUSEL',
      children: children.join(','),
      caption,
    }));
  }
  await waitReady(creationId);
  const { id } = await call('POST', 'me/media_publish', { creation_id: creationId });
  return { id };
}

// Reel : la vidéo est envoyée directement (upload "resumable"), sans dépendre d'une URL publique.
// Si cet envoi échoue, on retente avec l'URL raw GitHub de la vidéo.
// Doc : https://developers.facebook.com/docs/instagram-platform/content-publishing#reels-posts
export async function publishInstagramReel({ file, videoUrl, coverUrl, caption }) {
  if (!process.env.IG_ACCESS_TOKEN) throw new Error('IG_ACCESS_TOKEN manquant');
  const base = { media_type: 'REELS', caption, share_to_feed: 'true', ...(coverUrl ? { cover_url: coverUrl } : {}) };
  let creationId;
  try {
    const { id, uri } = await call('POST', 'me/media', { ...base, upload_type: 'resumable' });
    const data = fs.readFileSync(file);
    const res = await fetch(uri || `https://rupload.facebook.com/ig-api-upload/${process.env.IG_GRAPH_VERSION || 'v23.0'}/${id}`, {
      method: 'POST',
      headers: { Authorization: `OAuth ${process.env.IG_ACCESS_TOKEN}`, offset: '0', file_size: String(data.length) },
      body: data,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new Error(`upload vidéo : ${res.status} ${JSON.stringify(json)}`);
    creationId = id;
  } catch (e) {
    console.log(`Upload direct impossible (${e.message}), essai avec l'URL publique de la vidéo…`);
    ({ id: creationId } = await call('POST', 'me/media', { ...base, video_url: videoUrl }));
  }
  await waitReady(creationId, 60); // jusqu'à 5 min de traitement côté Instagram
  const { id } = await call('POST', 'me/media_publish', { creation_id: creationId });
  return { id };
}

// Le token longue durée expire au bout de 60 jours : on le prolonge à chaque exécution.
export async function refreshInstagramToken() {
  const url = new URL('https://graph.instagram.com/refresh_access_token');
  url.search = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: process.env.IG_ACCESS_TOKEN });
  const json = await (await fetch(url)).json();
  if (json.error) throw new Error(`Refresh token Instagram : ${json.error.message}`);
  return json.access_token;
}
