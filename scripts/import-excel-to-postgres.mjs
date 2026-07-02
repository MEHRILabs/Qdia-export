#!/usr/bin/env node
/**
 * Import Excel → PostgreSQL (schéma français QDIA Export v2)
 * Remplit : categories, sous_categories, marques, produits_meres, articles
 *
 * Usage :
 *   DATABASE_URL=postgres://... node scripts/import-excel-to-postgres.mjs ./data/base_de_donnees_finale.xlsx
 *
 * Prérequis : exécuter d'abord data/schema_postgresql_qdia_export_v2.sql
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pg = require(resolve(__dirname, "../lib/db/node_modules/pg"));
const XLSX = require(resolve(__dirname, "../artifacts/api-server/node_modules/xlsx"));

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/import-excel-to-postgres.mjs <fichier.xlsx>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL requis (ex: postgres://user:pass@localhost:5432/qdia_export)");
  process.exit(1);
}

function norm(h) {
  return String(h ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const ALIASES = {
  code_id: ["code_id", "master_id", "id_variante", "code_article", "id_article", "sku"],
  ean: ["code_barre_ean", "ean", "an", "code_barres", "gtin"],
  nom_article: ["nom_article", "nom", "designation", "libelle", "name", "description"],
  format: ["format", "conditionnement"],
  prix_ht_dzd: ["prix_ht_dzd", "prix_ht", "pvht", "prix_detail_ht"],
  prix_ttc: ["pvttc", "prix_ttc", "prix_vente_ttc"],
  categorie: ["rayon", "categorie", "category", "nom_categorie"],
  categorie_code: ["categorie_code", "code_categorie", "code_rayon"],
  sous_categorie: ["sous_categorie", "ub", "sous_cat", "nom_sous_categorie"],
  marque: ["marque", "brand", "nom_marque"],
  marque_code: ["marque_code", "code_marque"],
  produit_mere: ["produit_mere", "nom_produit_mere", "id_produit_mere", "produit"],
  subventionne: ["subventionne", "subvention", "segment_e"],
  phyto: ["niveau_phytosanitaire", "phytosanitaire", "phyto", "segment_f"],
  poids_brut_unit_kg: ["poids_brut_unit_kg", "poids_brut", "poids_unitaire_kg", "poids_kg"],
  volume_unit_l: ["volume_unit_l", "volume_unitaire_l", "volume"],
  nb_art_carton: ["nb_art_carton", "articles_par_carton", "nb_art_par_carton"],
  nb_cartons_palette: ["nb_cartons_palette", "cartons_par_palette"],
  carton_long_cm: ["carton_long_cm", "longueur_carton"],
  carton_larg_cm: ["carton_larg_cm", "largeur_carton"],
  carton_haut_cm: ["carton_haut_cm", "hauteur_carton"],
  photo_url: ["photo_url", "url_image", "image_url", "photo"],
  fob_usd: ["fob_usd", "prix_fob_usd", "prix_fob"],
  moq: ["moq", "quantite_min"],
};

function buildColMap(headers) {
  const normalized = headers.map(norm);
  const map = {};
  for (const [field, aliases] of Object.entries(ALIASES)) {
    const a = aliases.map(norm);
    map[field] = normalized.findIndex(h => a.some(x => h === x || h.includes(x)));
  }
  return map;
}

function num(v) {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function str(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}
function boolFromSegment(v) {
  const s = (str(v) ?? "N").toUpperCase();
  return s === "S" || s === "Y" || s === "1" || s === "OUI" || s === "TRUE";
}

// DZ-EPI-MO3-00003-N-X-01 → { categorie_code: EPI, marque_code: MO3, subv: N, phyto: X }
function parseCodeId(codeId) {
  const parts = String(codeId ?? "").split("-");
  return {
    categorie_code: parts[1] ?? null,
    marque_code: parts[2] ?? null,
    seg_subv: parts[4] ?? null,
    seg_phyto: parts[5] ?? null,
  };
}

function pickSheet(wb) {
  const pref = ["articles", "variantes", "produits", "catalogue"];
  for (const p of pref) {
    const hit = wb.SheetNames.find(n => norm(n).includes(p));
    if (hit) return wb.Sheets[hit];
  }
  return wb.Sheets[wb.SheetNames[0]];
}

async function main() {
  const wb = XLSX.read(readFileSync(resolve(file)), { type: "buffer" });
  const sheet = pickSheet(wb);
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (rows.length < 2) { console.error("Feuille vide"); process.exit(1); }

  const headers = rows[0].map(h => String(h ?? ""));
  const col = buildColMap(headers);
  const get = (row, f) => (col[f] >= 0 ? row[col[f]] : undefined);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const catCache = new Map();
  const sousCatCache = new Map();
  const marqueCache = new Map();
  const produitMereCache = new Map();

  async function upsertLookup(cache, table, idCol, nameCol, name) {
    if (!name) return null;
    if (cache.has(name)) return cache.get(name);
    const res = await client.query(
      `INSERT INTO ${table} (${nameCol}) VALUES ($1)
       ON CONFLICT (${nameCol}) DO UPDATE SET ${nameCol} = EXCLUDED.${nameCol}
       RETURNING ${idCol}`,
      [name],
    );
    const id = res.rows[0][idCol];
    cache.set(name, id);
    return id;
  }

  let inserted = 0, skipped = 0, errors = 0;
  await client.query("BEGIN");

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const codeId = str(get(row, "code_id"));
    const nomArticle = str(get(row, "nom_article"));
    if (!codeId || !nomArticle) { skipped++; continue; }

    try {
      await client.query("SAVEPOINT row_import");
      const seg = parseCodeId(codeId);
      const idCat = await upsertLookup(catCache, "categories", "id_categorie", "nom_categorie", str(get(row, "categorie")) ?? "NON_CLASSE");
      const sousCatName = str(get(row, "sous_categorie"));
      const idSousCat = sousCatName ? await upsertLookup(sousCatCache, "sous_categories", "id_sous_categorie", "nom_sous_categorie", sousCatName) : null;
      const marqueName = str(get(row, "marque"));
      const idMarque = marqueName ? await upsertLookup(marqueCache, "marques", "id_marque", "nom_marque", marqueName) : null;

      const produitMereName = str(get(row, "produit_mere")) ?? nomArticle;
      const mereKey = `${produitMereName}|${idMarque}|${idCat}`;
      let idProduitMere = produitMereCache.get(mereKey);
      if (!idProduitMere) {
        const res = await client.query(
          `INSERT INTO produits_meres (nom_produit_mere, id_marque, id_categorie, id_sous_categorie)
           VALUES ($1,$2,$3,$4) RETURNING id_produit_mere`,
          [produitMereName, idMarque, idCat, idSousCat],
        );
        idProduitMere = res.rows[0].id_produit_mere;
        produitMereCache.set(mereKey, idProduitMere);
      }

      const prixHt = num(get(row, "prix_ht_dzd")) ?? (num(get(row, "prix_ttc")) != null ? num(get(row, "prix_ttc")) / 1.19 : null);

      await client.query(
        `INSERT INTO articles (
            code_id, id_produit_mere, code_barre_ean, nom_article, format, prix_ht_dzd,
            categorie_code, marque_code, subventionne, niveau_phytosanitaire,
            poids_brut_unit_kg, volume_unit_l, nb_art_carton, nb_cartons_palette,
            carton_long_cm, carton_larg_cm, carton_haut_cm,
            photo_url, fob_usd, moq
         ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
         )
         ON CONFLICT (code_id) DO UPDATE SET
            nom_article = EXCLUDED.nom_article,
            prix_ht_dzd = EXCLUDED.prix_ht_dzd,
            photo_url = COALESCE(EXCLUDED.photo_url, articles.photo_url),
            fob_usd = COALESCE(EXCLUDED.fob_usd, articles.fob_usd),
            moq = COALESCE(EXCLUDED.moq, articles.moq),
            date_maj = NOW()`,
        [
          codeId, idProduitMere, str(get(row, "ean")), nomArticle, str(get(row, "format")), prixHt,
          str(get(row, "categorie_code")) ?? seg.categorie_code,
          str(get(row, "marque_code")) ?? seg.marque_code,
          boolFromSegment(get(row, "subventionne") ?? seg.seg_subv),
          str(get(row, "phyto")) ?? seg.seg_phyto,
          num(get(row, "poids_brut_unit_kg")), num(get(row, "volume_unit_l")),
          num(get(row, "nb_art_carton")), num(get(row, "nb_cartons_palette")),
          num(get(row, "carton_long_cm")), num(get(row, "carton_larg_cm")), num(get(row, "carton_haut_cm")),
          str(get(row, "photo_url")), num(get(row, "fob_usd")), num(get(row, "moq")),
        ],
      );
      inserted++;
      await client.query("RELEASE SAVEPOINT row_import");
      if (inserted % 500 === 0) console.log(`… ${inserted} articles importés`);
    } catch (e) {
      await client.query("ROLLBACK TO SAVEPOINT row_import");
      errors++;
      if (errors <= 10) console.error(`Ligne ${i + 1} (${codeId}): ${e.message}`);
    }
  }

  await client.query("COMMIT");
  await client.end();
  console.log(`\nTerminé : ${inserted} articles, ${skipped} ignorés, ${errors} erreurs`);
  console.log(`Catégories: ${catCache.size} · Marques: ${marqueCache.size} · Produits mères: ${produitMereCache.size}`);
}

main().catch(err => { console.error(err); process.exit(1); });
