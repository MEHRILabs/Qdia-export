import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDbPool } from "./db-pool.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL requis");
  process.exit(1);
}

const sql = `
CREATE TABLE IF NOT EXISTS suppliers (
  id serial PRIMARY KEY,
  company_name text NOT NULL,
  country text NOT NULL DEFAULT 'Algeria',
  wilaya text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  verification_level integer NOT NULL DEFAULT 1,
  platform_years integer NOT NULL DEFAULT 1,
  response_rate real NOT NULL DEFAULT 0,
  transaction_count integer NOT NULL DEFAULT 0,
  description text,
  avatar text
);

CREATE TABLE IF NOT EXISTS categories (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT 'Package',
  image_url text,
  product_count integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  sku text,
  image_url text,
  images text[] NOT NULL DEFAULT '{}',
  supplier_id integer NOT NULL REFERENCES suppliers(id),
  supplier_name text,
  supplier_location text,
  moq real NOT NULL,
  moq_unit text NOT NULL DEFAULT 'kg',
  port_depart text NOT NULL DEFAULT 'Alger',
  origin_wilaya text,
  certifications text[] NOT NULL DEFAULT '{}',
  packaging text,
  processing text,
  export_status text NOT NULL DEFAULT 'published',
  price_exw real NOT NULL,
  price_fob real NOT NULL,
  price_cfr real NOT NULL,
  price_cif real NOT NULL,
  price_currency text NOT NULL DEFAULT 'USD',
  price_unit text NOT NULL DEFAULT 'per kg',
  price_retail real,
  price_wholesale real,
  rating real,
  review_count integer,
  orders_fulfilled integer,
  target_markets text[] NOT NULL DEFAULT '{}',
  is_featured boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products(sku) WHERE sku IS NOT NULL;

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  email text UNIQUE,
  phone text UNIQUE,
  password_hash text,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'buyer',
  provider text NOT NULL DEFAULT 'email',
  google_id text UNIQUE,
  supplier_id integer,
  company_name text,
  wilaya text,
  logo_url text,
  subscription_tier text NOT NULL DEFAULT 'bronze',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id serial PRIMARY KEY,
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS rfqs (
  id serial PRIMARY KEY,
  product_name text NOT NULL,
  product_description text,
  quantity real NOT NULL,
  quantity_unit text NOT NULL DEFAULT 'kg',
  destination_country text NOT NULL,
  port_depart text,
  port_arrival text,
  requested_incoterm text NOT NULL,
  target_price real,
  message text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  buyer_id integer,
  supplier_id integer,
  product_id integer,
  quote_price real,
  quote_currency text DEFAULT 'USD',
  quote_message text,
  quote_incoterm text,
  tracking_number text,
  shipped_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_sessions (
  id text PRIMARY KEY,
  supplier_id integer,
  current_step text NOT NULL DEFAULT 'chat',
  status text NOT NULL DEFAULT 'active',
  chat_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_product jsonb,
  pricing_result jsonb,
  studio_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  published_product_id integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_variants (
  id serial PRIMARY KEY,
  master_id text NOT NULL,
  parent_product_id text,
  brand_code text,
  brand_name text,
  category_code text,
  category_name text NOT NULL,
  subcategory text,
  name text NOT NULL,
  description text,
  ean text,
  price_retail_dzd real,
  price_fob_usd real,
  moq real,
  moq_unit text,
  hs_code text,
  weight_kg real,
  volume_l real,
  units_per_carton real,
  cartons_per_pallet real,
  carton_length_cm real,
  carton_width_cm real,
  carton_height_cm real,
  weight_carton_kg real,
  weight_pallet_kg real,
  subsidy_status text NOT NULL DEFAULT 'N',
  phyto_level text NOT NULL DEFAULT 'X',
  export_status text NOT NULL DEFAULT 'a_valider',
  image_url text,
  packaging_notes text,
  ai_enriched_at timestamptz,
  ai_notes text,
  published_product_id integer,
  meta jsonb DEFAULT '{}'::jsonb,
  import_batch text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS catalog_variants_master_id_idx ON catalog_variants(master_id);

CREATE TABLE IF NOT EXISTS ports (
  id serial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  country_code text NOT NULL,
  type text NOT NULL DEFAULT 'seaport',
  region text,
  handling_fee_dzd real NOT NULL DEFAULT 800,
  freight_to_fr_dzd real,
  freight_to_ae_dzd real,
  freight_to_us_dzd real,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS customs_tariffs (
  id serial PRIMARY KEY,
  destination_country text NOT NULL,
  destination_code text NOT NULL,
  product_category text NOT NULL,
  hs_code text,
  duty_rate_pct real NOT NULL DEFAULT 0,
  vat_rate_pct real NOT NULL DEFAULT 0,
  customs_fee_dzd real NOT NULL DEFAULT 0,
  documentation_fee_dzd real NOT NULL DEFAULT 500,
  notes text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS messages (
  id serial PRIMARY KEY,
  rfq_id integer,
  sender_id integer NOT NULL,
  receiver_id integer NOT NULL,
  body text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  product_id integer NOT NULL,
  supplier_id integer,
  rating real NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_views (
  id serial PRIMARY KEY,
  product_id integer NOT NULL,
  user_id integer,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorites (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  product_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_product ON favorites(user_id, product_id);

CREATE TABLE IF NOT EXISTS cart_items (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  product_id integer NOT NULL,
  quantity real NOT NULL,
  incoterm text DEFAULT 'FOB',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id serial PRIMARY KEY,
  rfq_id integer,
  buyer_id integer NOT NULL,
  supplier_id integer,
  amount real NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  commission_rate real NOT NULL DEFAULT 0.03,
  commission_amount real NOT NULL,
  net_amount real NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  swift_reference text,
  lc_number text,
  stripe_session_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id serial PRIMARY KEY,
  buyer_id integer NOT NULL,
  supplier_id integer,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount real NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  incoterm text DEFAULT 'FOB',
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  transaction_id integer,
  source_rfq_id integer,
  tracking_number text,
  carrier text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS disputes (
  id serial PRIMARY KEY,
  transaction_id integer NOT NULL,
  order_id integer,
  buyer_id integer NOT NULL,
  supplier_id integer,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  refund_amount real,
  mediator_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oem_requests (
  id serial PRIMARY KEY,
  product_id integer NOT NULL,
  buyer_id integer NOT NULL,
  supplier_id integer,
  request_type text NOT NULL,
  logo_url text,
  specs text,
  quantity real,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sample_requests (
  id serial PRIMARY KEY,
  product_id integer NOT NULL,
  buyer_id integer NOT NULL,
  supplier_id integer,
  quantity real NOT NULL DEFAULT 1,
  shipping_address text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_reviews (
  id serial PRIMARY KEY,
  supplier_id integer NOT NULL,
  user_id integer NOT NULL,
  rating real NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tracking_events (
  id serial PRIMARY KEY,
  order_id integer,
  rfq_id integer,
  carrier text NOT NULL,
  tracking_number text NOT NULL,
  status text NOT NULL,
  location text,
  description text,
  event_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS fcm_user_token_idx ON fcm_tokens(user_id, token);

CREATE TABLE IF NOT EXISTS invoices (
  id serial PRIMARY KEY,
  number text NOT NULL,
  transaction_id integer,
  rfq_id integer,
  buyer_id integer NOT NULL,
  supplier_id integer,
  amount real NOT NULL,
  commission_amount real NOT NULL,
  net_amount real NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'issued',
  port_depart text,
  port_arrival text,
  incoterm text,
  product_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_views_product ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_messages_rfq ON messages(rfq_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url text;
`;

const pool = createDbPool();

try {
  await pool.query(sql);
  console.log("Tables applicatives vérifiées/créées.");
} finally {
  await pool.end();
}
