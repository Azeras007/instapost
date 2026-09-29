// Publication LinkedIn via l'API officielle (gratuite).
// - Profil perso : produit "Share on LinkedIn" (scope w_member_social), auteur urn:li:person:XXX
// - Page entreprise : produit "Community Management API" (scope w_organization_social), auteur urn:li:organization:XXX
// Doc : https://learn.microsoft.com/linkedin/marketing/community-management/shares/posts-api
import fs from 'node:fs';

// LinkedIn exige une version "AAAAMM" encore supportée (~1 an) : par défaut, il y a 2 mois.
function apiVersion() {
  if (process.env.LINKEDIN_VERSION) return process.env.LINKEDIN_VERSION;
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - 2);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function headers(extra = {}) {
  return {
    Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
    'LinkedIn-Version': apiVersion(),
    'X-Restli-Protocol-Version': '2.0.0',
    ...extra,
  };
}

// Le format "little text" de LinkedIn tronque le post sur ces caractères s'ils ne sont pas échappés.
export const escapeLinkedIn = (text) => text.replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`);

async function uploadImage(file, owner) {
  const init = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ initializeUploadRequest: { owner } }),
  });
  if (!init.ok) throw new Error(`LinkedIn initializeUpload : ${init.status} ${await init.text()}`);
  const { value } = await init.json();

  const put = await fetch(value.uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}` },
    body: fs.readFileSync(file),
  });
  if (!put.ok) throw new Error(`LinkedIn upload image : ${put.status} ${await put.text()}`);
  return value.image;
}

export async function publishLinkedIn({ files, caption, altText }) {
  const author = process.env.LINKEDIN_AUTHOR_URN;
  if (!process.env.LINKEDIN_ACCESS_TOKEN || !author) {
    throw new Error('LINKEDIN_ACCESS_TOKEN ou LINKEDIN_AUTHOR_URN manquant');
  }

  const images = [];
  for (const f of files) images.push({ id: await uploadImage(f, author), altText });

  const content = images.length === 1 ? { media: { id: images[0].id, altText } } : { multiImage: { images } };
  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      author,
      commentary: escapeLinkedIn(caption),
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      content,
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn post : ${res.status} ${await res.text()}`);
  return { id: res.headers.get('x-restli-id') };
}
