-- ============================================================
-- QDIA EXPORT — SCHEMA POSTGRESQL COMPLET
-- Architecture validee : Articles + Clients + Grossistes/Fournisseurs
-- + Commandes + Lignes de commande + Factures + Livraisons + Transitaires
-- Objectif : permettre data visualisation (ventes, achats, dettes,
-- creances, livraisons) via vues SQL en bas du fichier.
-- ============================================================

-- ============ 1. ARTICLES (catalogue produits) ============
-- Reprend la structure Master Data Article (19 735 produits)

CREATE TABLE IF NOT EXISTS categories (
    id_categorie        SERIAL PRIMARY KEY,
    nom_categorie       VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS sous_categories (
    id_sous_categorie   SERIAL PRIMARY KEY,
    nom_sous_categorie  VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS marques (
    id_marque           SERIAL PRIMARY KEY,
    nom_marque          VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS produits_meres (
    id_produit_mere     SERIAL PRIMARY KEY,
    nom_produit_mere    VARCHAR(255) NOT NULL,
    id_marque           INTEGER REFERENCES marques(id_marque),
    id_categorie        INTEGER REFERENCES categories(id_categorie),
    id_sous_categorie   INTEGER REFERENCES sous_categories(id_sous_categorie),
    date_creation        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS articles (
    code_id              VARCHAR(40) PRIMARY KEY,   -- ex: DZ-EPI-MO3-00003-N-X-01
    id_produit_mere      INTEGER NOT NULL REFERENCES produits_meres(id_produit_mere) ON DELETE CASCADE,
    code_barre_ean        VARCHAR(20),
    nom_article            VARCHAR(255) NOT NULL,
    format                  VARCHAR(50),
    prix_ht_dzd             NUMERIC(12,2),
    tva                     NUMERIC(5,4) DEFAULT 0.19,
    pays_origine            VARCHAR(100) DEFAULT 'Algérie',
    pays_code               CHAR(2) DEFAULT 'DZ',
    categorie_code          VARCHAR(10),
    marque_code             VARCHAR(10),
    subventionne            BOOLEAN DEFAULT FALSE,    -- segment E du code
    niveau_phytosanitaire   VARCHAR(10),               -- segment F du code
    -- Logistique
    poids_brut_unit_kg      NUMERIC(10,3),
    volume_unit_l           NUMERIC(10,3),
    nb_art_carton           INTEGER,
    nb_cartons_palette      INTEGER,
    carton_long_cm          NUMERIC(8,2),
    carton_larg_cm          NUMERIC(8,2),
    carton_haut_cm          NUMERIC(8,2),
    poids_carton_kg         NUMERIC(10,3) GENERATED ALWAYS AS (poids_brut_unit_kg * nb_art_carton) STORED,
    volume_carton_m3        NUMERIC(12,6) GENERATED ALWAYS AS ((carton_long_cm/100) * (carton_larg_cm/100) * (carton_haut_cm/100)) STORED,
    nb_art_palette          INTEGER GENERATED ALWAYS AS (nb_art_carton * nb_cartons_palette) STORED,
    -- Export
    photo_url                TEXT,
    fob_usd                  NUMERIC(12,2),
    moq                       INTEGER,
    statut_validation         VARCHAR(30) DEFAULT 'a_valider',
    actif                     BOOLEAN DEFAULT FALSE,
    date_creation             TIMESTAMP DEFAULT NOW(),
    date_maj                  TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE VIEW v_articles_logistique AS
SELECT *,
       poids_carton_kg * nb_cartons_palette  AS poids_palette_kg,
       volume_carton_m3 * nb_cartons_palette AS volume_palette_m3
FROM articles;

CREATE INDEX IF NOT EXISTS idx_articles_produit_mere ON articles(id_produit_mere);
CREATE INDEX IF NOT EXISTS idx_articles_ean ON articles(code_barre_ean);

-- ============ 2. CLIENTS (acheteurs) ============

CREATE TABLE IF NOT EXISTS clients (
    id_client            SERIAL PRIMARY KEY,
    nom_entreprise         VARCHAR(255) NOT NULL,
    nom_contact             VARCHAR(150),
    email                    VARCHAR(255) UNIQUE NOT NULL,
    telephone                VARCHAR(30),
    pays                      VARCHAR(100),
    adresse                   TEXT,
    statut_verification       VARCHAR(30) DEFAULT 'en_attente',
    date_creation             TIMESTAMP DEFAULT NOW()
);

-- ============ 3. GROSSISTES / FOURNISSEURS / USINES ============

CREATE TABLE IF NOT EXISTS grossistes (
    id_grossiste          SERIAL PRIMARY KEY,
    nom_entreprise           VARCHAR(255) NOT NULL,
    type_fournisseur          VARCHAR(30),  -- grossiste | usine | producteur
    nom_contact               VARCHAR(150),
    email                      VARCHAR(255),
    telephone                  VARCHAR(30),
    pays                        VARCHAR(100),
    adresse                     TEXT,
    date_creation               TIMESTAMP DEFAULT NOW()
);

-- ============ 4. TRANSITAIRES ============

CREATE TABLE IF NOT EXISTS transitaires (
    id_transitaire         SERIAL PRIMARY KEY,
    nom_entreprise            VARCHAR(255) NOT NULL,
    pays                        VARCHAR(100),
    contact                      VARCHAR(150),
    telephone                    VARCHAR(30),
    date_creation                 TIMESTAMP DEFAULT NOW()
);

-- ============ 5. COMMANDES (achats et ventes) ============

CREATE TABLE IF NOT EXISTS commandes (
    id_commande             SERIAL PRIMARY KEY,
    type_commande              VARCHAR(10) NOT NULL CHECK (type_commande IN ('achat','vente')),
    id_client                   INTEGER REFERENCES clients(id_client),     -- rempli si type='vente'
    id_grossiste                 INTEGER REFERENCES grossistes(id_grossiste), -- rempli si type='achat'
    date_commande                  DATE NOT NULL DEFAULT CURRENT_DATE,
    statut_commande                 VARCHAR(30) DEFAULT 'en_cours',  -- en_cours | confirmee | annulee | terminee
    statut_paiement                  VARCHAR(30) DEFAULT 'en_attente', -- en_attente | partiel | paye
    devise                             VARCHAR(10) DEFAULT 'DZD',
    date_creation                       TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_commande_partie CHECK (
        (type_commande = 'vente' AND id_client IS NOT NULL AND id_grossiste IS NULL) OR
        (type_commande = 'achat' AND id_grossiste IS NOT NULL AND id_client IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS lignes_commande (
    id_ligne                 SERIAL PRIMARY KEY,
    id_commande                INTEGER NOT NULL REFERENCES commandes(id_commande) ON DELETE CASCADE,
    code_id_article             VARCHAR(40) NOT NULL REFERENCES articles(code_id),
    quantite                     INTEGER NOT NULL CHECK (quantite > 0),
    prix_unitaire_dzd             NUMERIC(12,2) NOT NULL,
    montant_ligne                 NUMERIC(14,2) GENERATED ALWAYS AS (quantite * prix_unitaire_dzd) STORED
);

CREATE INDEX IF NOT EXISTS idx_lignes_commande_commande ON lignes_commande(id_commande);
CREATE INDEX IF NOT EXISTS idx_commandes_client ON commandes(id_client);
CREATE INDEX IF NOT EXISTS idx_commandes_grossiste ON commandes(id_grossiste);

-- ============ 6. FACTURES (dettes / creances) ============

CREATE TABLE IF NOT EXISTS factures (
    id_facture                SERIAL PRIMARY KEY,
    id_commande                  INTEGER NOT NULL REFERENCES commandes(id_commande),
    type_facture                  VARCHAR(10) NOT NULL CHECK (type_facture IN ('achat','vente')),
    montant_ht_dzd                  NUMERIC(14,2) NOT NULL,
    tva_dzd                          NUMERIC(14,2) DEFAULT 0,
    montant_ttc_dzd                  NUMERIC(14,2) GENERATED ALWAYS AS (montant_ht_dzd + tva_dzd) STORED,
    montant_paye_dzd                  NUMERIC(14,2) DEFAULT 0,
    statut                              VARCHAR(30) DEFAULT 'emise', -- emise | partiellement_payee | payee | en_retard
    date_echeance                        DATE,
    date_emission                         TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_factures_commande ON factures(id_commande);

-- ============ 7. LIVRAISONS ============

CREATE TABLE IF NOT EXISTS livraisons (
    id_livraison              SERIAL PRIMARY KEY,
    id_commande                  INTEGER NOT NULL REFERENCES commandes(id_commande),
    id_transitaire                 INTEGER REFERENCES transitaires(id_transitaire),
    statut_livraison                 VARCHAR(30) DEFAULT 'en_preparation', -- en_preparation | expediee | en_transit | livree | retard
    date_prevue                       DATE,
    date_reelle                        DATE,
    poids_total_kg                      NUMERIC(12,3),
    volume_total_m3                      NUMERIC(12,6),
    date_creation                         TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_livraisons_commande ON livraisons(id_commande);

-- ============================================================
-- VUES POUR DATA VISUALISATION
-- ============================================================

-- Ventes totales par mois
CREATE OR REPLACE VIEW v_ventes_mensuelles AS
SELECT DATE_TRUNC('month', c.date_commande) AS mois,
       SUM(lc.montant_ligne) AS total_ventes_dzd
FROM commandes c
JOIN lignes_commande lc ON lc.id_commande = c.id_commande
WHERE c.type_commande = 'vente'
GROUP BY 1
ORDER BY 1;

-- Achats totaux par mois
CREATE OR REPLACE VIEW v_achats_mensuels AS
SELECT DATE_TRUNC('month', c.date_commande) AS mois,
       SUM(lc.montant_ligne) AS total_achats_dzd
FROM commandes c
JOIN lignes_commande lc ON lc.id_commande = c.id_commande
WHERE c.type_commande = 'achat'
GROUP BY 1
ORDER BY 1;

-- Creances (factures clients non payees)
CREATE OR REPLACE VIEW v_creances AS
SELECT f.id_facture, c.id_client, cl.nom_entreprise,
       f.montant_ttc_dzd - f.montant_paye_dzd AS montant_restant_dzd,
       f.date_echeance, f.statut
FROM factures f
JOIN commandes c ON c.id_commande = f.id_commande
JOIN clients cl ON cl.id_client = c.id_client
WHERE f.type_facture = 'vente' AND f.statut <> 'payee';

-- Dettes (factures fournisseurs non payees)
CREATE OR REPLACE VIEW v_dettes AS
SELECT f.id_facture, c.id_grossiste, g.nom_entreprise,
       f.montant_ttc_dzd - f.montant_paye_dzd AS montant_restant_dzd,
       f.date_echeance, f.statut
FROM factures f
JOIN commandes c ON c.id_commande = f.id_commande
JOIN grossistes g ON g.id_grossiste = c.id_grossiste
WHERE f.type_facture = 'achat' AND f.statut <> 'payee';

-- Livraisons en retard
CREATE OR REPLACE VIEW v_livraisons_retard AS
SELECT l.*, c.type_commande
FROM livraisons l
JOIN commandes c ON c.id_commande = l.id_commande
WHERE l.date_prevue < CURRENT_DATE AND l.statut_livraison NOT IN ('livree');

-- ============================================================
-- NOTES D'IMPLEMENTATION
-- 1. Importer d'abord categories / sous_categories / marques / produits_meres / articles
--    (depuis QDIA_Export_BaseDeDonnees_Structuree.xlsx + Master_Data_Article_19735.xlsx)
-- 2. clients / grossistes / transitaires seront alimentes par l'application (inscriptions)
-- 3. commandes / lignes_commande / factures / livraisons seront alimentees par l'app
--    au fil des transactions (pas d'import initial necessaire)
-- 4. Les vues v_ventes_mensuelles, v_achats_mensuels, v_creances, v_dettes,
--    v_livraisons_retard sont prevues pour brancher directement un dashboard
--    de data visualisation (site/app).
-- ============================================================
