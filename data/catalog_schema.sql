-- Table catalogue Master Data (variantes avant publication marketplace)
-- Exécuter une fois sur PostgreSQL : psql $DATABASE_URL -f data/catalog_schema.sql

CREATE TABLE IF NOT EXISTS catalog_variants (
  id SERIAL PRIMARY KEY,
  master_id TEXT NOT NULL,
  parent_product_id TEXT,
  brand_code TEXT,
  brand_name TEXT,
  category_code TEXT,
  category_name TEXT NOT NULL,
  subcategory TEXT,
  name TEXT NOT NULL,
  description TEXT,
  ean TEXT,
  price_retail_dzd REAL,
  price_fob_usd REAL,
  moq REAL,
  moq_unit TEXT,
  hs_code TEXT,
  weight_kg REAL,
  volume_l REAL,
  units_per_carton REAL,
  cartons_per_pallet REAL,
  carton_length_cm REAL,
  carton_width_cm REAL,
  carton_height_cm REAL,
  weight_carton_kg REAL,
  weight_pallet_kg REAL,
  subsidy_status TEXT NOT NULL DEFAULT 'N',
  phyto_level TEXT NOT NULL DEFAULT 'X',
  export_status TEXT NOT NULL DEFAULT 'a_valider',
  image_url TEXT,
  packaging_notes TEXT,
  ai_enriched_at TIMESTAMPTZ,
  ai_notes TEXT,
  published_product_id INTEGER,
  meta JSONB DEFAULT '{}',
  import_batch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_variants_master_id_idx ON catalog_variants (master_id);

CREATE INDEX IF NOT EXISTS catalog_variants_export_status_idx ON catalog_variants (export_status);
CREATE INDEX IF NOT EXISTS catalog_variants_category_idx ON catalog_variants (category_name);
