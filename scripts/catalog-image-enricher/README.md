# QDIA — Enrichissement images catalogue (19k+ produits)

Script Python modulaire pour enrichir automatiquement les photos produits :
recherche d'images → validation → suppression de fond → carré 1024 → filigrane → BDD.

## Structure

```
catalog-image-enricher/
  config.py            # Variables d'environnement
  database.py          # PostgreSQL / CSV
  scraper.py           # Google Images / DuckDuckGo (Playwright)
  image_processor.py   # rembg / Remove.bg, crop, watermark, JPEG
  descriptions.py      # Bonus génération / traduction (OpenAI)
  main.py              # Orchestration + reprise + rapport
  requirements.txt
  .env.example
  assets/watermark.png
  output/images/
  logs/
```

## Installation (Python 3.12+)

```bash
cd scripts/catalog-image-enricher
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
playwright install chromium
```

Copiez `.env.example` → `.env` et renseignez `DATABASE_URL` (même valeur que le monorepo).

Placez un logo PNG transparent dans `assets/watermark.png` (sinon le filigrane est ignoré).

## Utilisation

```bash
# Test sur 20 produits
python main.py --limit 20 --engine duckduckgo

# Production Google Images (plus lent, rate-limit)
python main.py --limit 100 --workers 2 --engine google

# Reprendre après interruption (ignore les IDs déjà OK)
python main.py --resume

# Sans suppression de fond
python main.py --skip-bg --limit 50

# Simulation (pas d'écriture BDD)
python main.py --dry-run --limit 5
```

## Reprise automatique

Le fichier `output/progress.json` mémorise :
- `done_ids` : produits déjà traités
- `hashes` : empreintes pour détecter les doublons d'images

`--resume` saute les `done_ids` et ne retraite que le reste.

## Rapport

À la fin : `output/report.json` avec totaux (succès, ignorés, erreurs, doublons).
Logs détaillés dans `logs/enrich_YYYYMMDD_HHMMSS.log`.

## Mise à jour BDD

Pour chaque succès :

```sql
UPDATE products
SET image_url = '/uploads/catalog/product_{id}.jpg',
    images = ARRAY['/uploads/catalog/product_{id}.jpg']
WHERE id = {id};
```

Copiez ensuite les fichiers de `output/images/` vers le dossier uploads de l'API
(ex. `artifacts/api-server/uploads/catalog/`) ou un bucket cloud.

## Contraintes & bonnes pratiques

- Respectez les délais (`DELAY_MIN` / `DELAY_MAX`) pour limiter les blocages.
- Google Images peut changer son DOM : en cas d'échec, utilisez `--engine duckduckgo`.
- `MAX_WORKERS` ≤ 3 recommandé avec Playwright.
- Remove.bg : crédits API ; sinon `BG_PROVIDER=rembg` (local, plus lent au 1er run).

## Bonus

Dans `.env` :

```
GENERATE_DESCRIPTIONS=true
TRANSLATE_DESCRIPTIONS=true
OPENAI_API_KEY=sk-...
```

Génère une description FR si absente, et traductions EN/AR (stockage description FR en BDD par défaut).
