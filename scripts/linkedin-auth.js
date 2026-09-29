// Récupère un token LinkedIn (valable 60 jours) et ton URN d'auteur.
//
//   1. Crée une app sur https://www.linkedin.com/developers/apps
//   2. Onglet Products : ajoute "Share on LinkedIn" et "Sign In with LinkedIn using OpenID Connect"
//   3. Onglet Auth : ajoute l'URL de redirection http://localhost:3000/callback
//   4. LINKEDIN_CLIENT_ID=xxx LINKEDIN_CLIENT_SECRET=yyy node scripts/linkedin-auth.js
//
// Pour publier sur une PAGE entreprise, ajoute LINKEDIN_SCOPES="openid profile w_member_social w_organization_social"
// (nécessite le produit "Community Management API", soumis à validation par LinkedIn).
import http from 'node:http';

const { LINKEDIN_CLIENT_ID: id, LINKEDIN_CLIENT_SECRET: secret } = process.env;
const scopes = process.env.LINKEDIN_SCOPES || 'openid profile w_member_social';
const redirect = 'http://localhost:3000/callback';
if (!id || !secret) {
  console.error('Définis LINKEDIN_CLIENT_ID et LINKEDIN_CLIENT_SECRET.');
  process.exit(1);
}

const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
authUrl.search = new URLSearchParams({ response_type: 'code', client_id: id, redirect_uri: redirect, scope: scopes });

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get('code');
  if (!code) return res.end('Pas de code.');
  const tok = await (
    await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect, client_id: id, client_secret: secret }),
    })
  ).json();
  const me = await (
    await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${tok.access_token}` } })
  ).json();
  res.end('OK, tu peux fermer cet onglet et revenir au terminal.');
  console.log('\nSecrets GitHub à créer :');
  console.log(`LINKEDIN_ACCESS_TOKEN = ${tok.access_token}`);
  console.log(`LINKEDIN_AUTHOR_URN   = urn:li:person:${me.sub}`);
  console.log(`(expire dans ${Math.round(tok.expires_in / 86400)} jours)`);
  console.log('Pour une page entreprise : LINKEDIN_AUTHOR_URN = urn:li:organization:<id numérique de la page>');
  server.close();
});

server.listen(3000, () => console.log(`Ouvre ce lien dans ton navigateur :\n${authUrl}`));
