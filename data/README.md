
# Master Data QDIA — répartition des tâches

## Fichiers à placer ici

| Fichier | Rôle |
|---------|------|
| `base_de_donnees_finale.xlsx` | Catalogue 19 735 variantes (feuille Articles / VARIANTES) |
| `catalog_schema.sql` | Création table PostgreSQL (déjà dans le repo) |

## Flux automatique (IA + base de données)

```
Excel importé → catalog_variants (nom, marque, catégorie, prix DZD…)
       ↓
POST /api/catalog/enrich
       ↓
IA génère : FOB USD · MOQ · HS · description export
IA génère : photo produit (Gemini / DALL-E)
       ↓
Photo enregistrée : uploads/catalog/{master_id}.jpg
URL sauvegardée : catalog_variants.image_url
       ↓
Publication marketplace (si statut export validé)
```

**Vous n'avez pas besoin de remplir la colonne photo dans Excel** — l'API IA la crée à partir des données produit.

## Votre travail (Excel / terrain)

Complétez **uniquement** ce que vous seul connaissez :

- **Logistique réelle** : poids unitaire, carton, palette, dimensions
- **Subvention** : `N` par défaut ; `S` seulement après validation officielle
- **Phytosanitaire** : niveau réel si produit concerné
- **Statut export** : `validé` ou `published` après contrôle admin
- **FOB USD** (optionnel) : prix réel négocié — sinon l'IA estime depuis le prix DZD

## Notre travail (application + IA)

- Import Excel → `catalog_variants`
- Enrichissement IA batch : **prix + photo** → enregistrés en base
- Publication vers `products` quand complet : image + FOB + MOQ + HS + statut validé

## Clés API requises (`.env`)

| Variable | Usage |
|----------|--------|
| `OPENAI_API_KEY` ou `GEMINI_API_KEY` | Prix, HS, description |
| `AI_IMAGE_PROVIDER=gemini` ou `openai` | Génération photos |
| `GEMINI_API_KEY` | Recommandé pour images (Gemini 2.5 Flash Image) |

Sans clé image : placeholder SVG temporaire (remplacé au prochain enrich).

## Lot pilote recommandé

Avant les 19 735 lignes, testez **50–100 produits** (Papeterie, Droguerie, Confort maison).

## API (compte exportateur)

```
POST /api/catalog/import        { file_base64, auto_publish? }
GET  /api/catalog/stats
GET  /api/catalog/variants      ?status=a_valider&limit=50
POST /api/catalog/enrich        { limit: 20, generate_photos: true }
POST /api/catalog/publish-ready { limit: 50 }
```

## Mobile

Paramètres → Exportateur → **Catalogue Master Data** → Import → **Enrichir (prix + photos IA)**

## Migration BDD

```bash
psql "$DATABASE_URL" -f data/catalog_schema.sql
```

---

## Schéma relationnel complet v2 (ventes / achats / dettes / créances)

Architecture validée : `articles` + `clients` + `grossistes` + `commandes` +
`lignes_commande` + `factures` + `livraisons` + `transitaires`, avec 5 vues data-viz.

### 1. Créer les tables et vues

```bash
psql "$DATABASE_URL" -f data/schema_postgresql_qdia_export_v2.sql
```

### 2. Importer le catalogue (Excel → tables FR)

```bash
DATABASE_URL=postgres://... node scripts/import-excel-to-postgres.mjs ./data/base_de_donnees_finale.xlsx
```

Remplit `categories`, `sous_categories`, `marques`, `produits_meres`, `articles`.
Les `clients`, `grossistes`, `commandes`, `factures`, `livraisons` sont alimentés
par l'application au fil des transactions.

### 3. Dashboard branché sur les 5 vues

| Vue SQL | Affichage |
|---------|-----------|
| `v_ventes_mensuelles` | Graphique ventes |
| `v_achats_mensuels` | Graphique achats |
| `v_creances` | Clients qui doivent |
| `v_dettes` | Ce qu'on doit aux fournisseurs |
| `v_livraisons_retard` | Retards de livraison |

- **API** : `GET /api/analytics/overview` (lit les 5 vues, repli propre si absentes)
- **Mobile** : Paramètres → Exportateur → **Tableau de bord**
