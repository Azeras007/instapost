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

// Un conteneur doit être FINISHED avant publication (surtout pour les carrousels).
async function waitReady(containerId) {
  for (let i = 0; i < 30; i++) {
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

// Le token longue durée expire au bout de 60 jours : on le prolonge à chaque exécution.
export async function refreshInstagramToken() {
  const url = new URL('https://graph.instagram.com/refresh_access_token');
  url.search = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: process.env.IG_ACCESS_TOKEN });
  const json = await (await fetch(url)).json();
  if (json.error) throw new Error(`Refresh token Instagram : ${json.error.message}`);
  return json.access_token;
}
