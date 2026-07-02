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
- Comptes test : `supplier@qdiadz.com` / `demo1234` · `admin@qdiadz.com` / `demo1234`

## Hébergement Render (gratuit)

1. [render.com](https://render.com) → **New** → **Blueprint**
2. Connectez le repo `MEHRILabs/Qdia-export`
3. Le fichier `render.yaml` crée API + PostgreSQL
4. Ajoutez les secrets dans le dashboard Render :
   - `GROQ_API_KEY` (chat IA)
   - `ANTHROPIC_API_KEY` (optionnel, visuels SVG)
   - `GOOGLE_CLIENT_ID` (connexion Gmail)
   - `JWT_SECRET` (généré automatiquement)
5. Après déploiement, exécutez les migrations DB (Render Shell) :

```bash
cd artifacts/api-server
pnpm -C ../../lib/db run push
pnpm -C ../.. run seed
```

L’app est servie en mode `SERVE_WEB=1` (API + site sur le même port).

## Structure

| Dossier | Rôle |
|---------|------|
| `artifacts/api-server` | API Node/Express |
| `artifacts/qdia-export` | Site React/Vite |
| `artifacts/qdia_mobile` | App Flutter |
| `lib/db` | Schéma PostgreSQL (Drizzle) |
| `render.yaml` | Config déploiement Render |
