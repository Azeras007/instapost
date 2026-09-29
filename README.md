# Vinea · posts automatiques Instagram & LinkedIn

Publie automatiquement **un post tous les 2 jours** (visuel + légende + hashtags) sur Instagram et LinkedIn.
100 % gratuit : GitHub Actions (gratuit sur un repo public) + génération des visuels en code (pas de Canva, pas d'IA payante).

```
content/posts.yaml ──► visuels PNG 1080×1350 ──► Instagram + LinkedIn ──► state/published.json
     (tes textes)       (src/templates.js)          (tous les 2 jours)       (historique, jamais 2 fois le même)
```

## 1. Démarrage (5 min)

1. Remplace les `A_COMPLETER` dans `content/config.yaml` (compte Instagram, site web).
   **Tant qu'il en reste, rien n'est publié.**
2. Relis les posts dans `content/posts.yaml` et prévisualise-les :
   ```bash
   npm install
   npm run preview            # tous les posts -> out/preview/<id>/slide-*.png + legendes.txt
   npm run preview manifeste  # un seul post
   ```
3. Configure au moins un réseau (ci-dessous), puis lance un premier post à la main :
   onglet **Actions** → *Publier un post Vinea* → **Run workflow** (coche *force*).

Ensuite, c'est automatique : le workflow tourne chaque jour à 18h (Paris) et publie si le dernier post a ≥ 2 jours.

## 2. Ajouter / modifier du contenu

Tout est dans `content/posts.yaml` : les posts sont publiés **dans l'ordre du fichier**, seulement s'ils sont `ready: true`.
Les gabarits disponibles (`cover`, `quote`, `list`, `big`, `domaine`, `cta`) et leurs champs sont décrits en haut du fichier.

- **Carrousel** = plusieurs slides dans un même post (10 max).
- **Photo** : dépose une image dans `assets/photos/` et ajoute `image: assets/photos/ma-photo.jpg` à la slide.
- **Légende différente pour LinkedIn** : ajoute `linkedin: { caption: ... }` au post.
- Les posts **"3 domaines sous-cotés"** et **"domaine du mois"** sont des modèles `ready: false` : remplis-les avec de vrais domaines puis passe-les à `true`.
- Couleurs et polices : `content/config.yaml` et `src/templates.js`.

Il y a 12 posts prêts, donc environ 24 jours de contenu. Quand la file est vide, le workflow le signale dans ses logs sans rien publier.

### Générer de nouveaux posts avec une IA locale (gratuit)

L'IA tourne **sur ton PC** avec [Ollama](https://ollama.com/download) : rien n'est envoyé à un service externe.

```bash
ollama pull mistral                        # une fois (~4 Go), bon niveau en français
npm run generate                           # 3 nouveaux posts
npm run generate -- 6 "vendanges"          # 6 posts sur un thème
```

Les posts sont ajoutés à la fin de `content/posts.yaml` en `ready: false`. Tu les relis (`npm run preview <id>`),
tu corriges si besoin, tu passes les bons en `ready: true`, puis tu fais `git push` : GitHub les publiera dans l'ordre.
Autre modèle : `OLLAMA_MODEL=qwen2.5:7b npm run generate`. Le prompt interdit d'inventer des noms de domaines ou des chiffres, mais relis quand même.

## 3. Brancher Instagram

### Option A : API officielle Meta (recommandée, gratuite, fiable)

Prérequis : un compte Instagram **professionnel** (Créateur ou Entreprise, se change dans les paramètres de l'app Instagram).

1. Va sur <https://developers.facebook.com/apps>, **Créer une app**, cas d'usage *« Gérer les messages et le contenu sur Instagram »*.
2. Dans *API Instagram → Configuration de l'API avec connexion Instagram* : **Ajouter un compte** (ton compte Vinea), puis **Générer un token**.
3. Ce token (valable 60 jours) → secret GitHub **`IG_ACCESS_TOKEN`**.
4. *(Conseillé)* pour que le token se renouvelle tout seul : crée un [token GitHub fine-grained](https://github.com/settings/personal-access-tokens/new)
   limité à ce repo avec la permission **Secrets : Read and write** → secret **`GH_PAT`**.

Pas besoin de soumettre l'app à validation Meta : en mode développement, elle peut publier sur ton propre compte.

### Option B : sans API Meta (non officielle, avec risques)

Utilise [instagrapi](https://github.com/subzeroid/instagrapi), qui se connecte comme l'application mobile.
⚠️ **Contraire aux CGU d'Instagram** : le compte peut recevoir des vérifications ou être bloqué, surtout parce que GitHub se connecte depuis des IP de datacenter.

1. Sur ton PC : `pip install instagrapi` puis `python scripts/ig_session.py` → crée `ig_session.json`.
2. Secrets GitHub : **`IG_USERNAME`**, **`IG_PASSWORD`**, **`IG_SESSION`** (le contenu du fichier), puis supprime le fichier.
3. Variable GitHub (onglet *Variables*, pas *Secrets*) : **`IG_METHOD`** = `instagrapi`.

## 4. Brancher LinkedIn (API officielle, gratuite)

1. Crée une app sur <https://www.linkedin.com/developers/apps> (il faut l'associer à une page LinkedIn, celle de Vinea).
2. Onglet **Products** : ajoute *Share on LinkedIn* et *Sign In with LinkedIn using OpenID Connect*.
3. Onglet **Auth** : ajoute l'URL de redirection `http://localhost:3000/callback`.
4. Sur ton PC :
   ```bash
   LINKEDIN_CLIENT_ID=xxx LINKEDIN_CLIENT_SECRET=yyy node scripts/linkedin-auth.js
   ```
   → affiche **`LINKEDIN_ACCESS_TOKEN`** et **`LINKEDIN_AUTHOR_URN`** à mettre en secrets GitHub.

Limites à connaître :
- Avec *Share on LinkedIn*, on publie sur **ton profil perso**. Pour publier sur la **page entreprise**, il faut le produit *Community Management API* (demande validée par LinkedIn), puis relancer le script avec `LINKEDIN_SCOPES="openid profile w_member_social w_organization_social"` et mettre `LINKEDIN_AUTHOR_URN=urn:li:organization:<id de la page>`.
- Le token LinkedIn expire au bout de **60 jours** : relance le script pour le renouveler (LinkedIn ne permet pas le renouvellement automatique pour ce type d'app).

## Secrets et variables GitHub

*Settings → Secrets and variables → Actions*

| Nom | Type | Usage |
|---|---|---|
| `IG_ACCESS_TOKEN` | secret | Instagram, option A |
| `GH_PAT` | secret | renouvellement auto du token Instagram (option A) |
| `IG_USERNAME`, `IG_PASSWORD`, `IG_SESSION` | secrets | Instagram, option B |
| `IG_METHOD` | variable | `graph` (défaut), `instagrapi` ou `off` |
| `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AUTHOR_URN` | secrets | LinkedIn |

Un réseau sans secret est simplement ignoré.

## Réglages

- **Fréquence** : `MIN_HOURS_BETWEEN_POSTS` (44 h par défaut) dans `src/run.js` ; heure de passage : le `cron` dans `.github/workflows/post.yml` (en UTC).
- **Republier un post** : retire son entrée de `state/published.json`.
- Si un réseau échoue, le workflow passe en rouge (GitHub t'envoie un e-mail) et le détail de l'erreur est dans les logs.
