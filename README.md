# QDIA Export

Plateforme marketplace export algérienne — catalogue produits, espace fournisseur, agent IA, admin.

## Dépôt

https://github.com/MEHRILabs/Qdia-export

## Démarrage local (Windows)

```powershell
copy .env.example .env
# Éditez .env (DATABASE_URL, clés API…)
.\scripts\start-demo.ps1
```

- Site : http://localhost:25180  
- API : http://localhost:8080  
- Compte **administration** (unique) : `administration@qdiadz.com` / `QDIA@Admin2026`
- Les **exportateurs** créent leur compte via **Inscription** (email, Gmail ou téléphone)

## Hébergement Vercel (recommandé)

### 1. Base PostgreSQL (gratuit)

Créez une base sur [Neon](https://neon.tech) ou [Supabase](https://supabase.com) et copiez l’URL :

```
postgresql://user:pass@host/db?sslmode=require
```

### 2. Importer sur Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Importez `MEHRILabs/Qdia-export`
3. Framework : **Other** (détecté via `vercel.json`)
4. Ne changez rien — `vercel.json` configure tout

### 3. Variables d’environnement (Vercel → Settings → Environment)

| Variable | Obligatoire |
|----------|-------------|
| `DATABASE_URL` | Oui (Neon / Supabase) |
| `JWT_SECRET` | Oui (chaîne longue aléatoire) |
| `GROQ_API_KEY` | Oui (chat IA) |
| `GOOGLE_CLIENT_ID` | Oui (connexion Gmail) |
| `VITE_GOOGLE_CLIENT_ID` | Même valeur que `GOOGLE_CLIENT_ID` |
| `ANTHROPIC_API_KEY` | Optionnel |
| `OPENAI_API_KEY` | Optionnel |

### 4. Déployer

Cliquez **Deploy**. Le build crée les tables + comptes test automatiquement.

### 5. Google OAuth

Dans Google Cloud → **Origines JavaScript autorisées**, ajoutez :

```
https://votre-projet.vercel.app
```

### Limites Vercel (plan gratuit)

- Pas de WebSocket temps réel
- Uploads photos : stockage temporaire (préférer Neon + URL externes pour prod)

## Structure

| Dossier | Rôle |
|---------|------|
| `artifacts/api-server` | API Node/Express |
| `artifacts/qdia-export` | Site React/Vite |
| `api/index.ts` | Handler serverless Vercel |
| `vercel.json` | Config déploiement Vercel |
| `lib/db` | Schéma PostgreSQL (Drizzle) |
