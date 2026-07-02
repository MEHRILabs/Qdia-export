import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

export interface MonthlyPoint {
  mois: string;
  total_dzd: number;
}

export interface CreanceRow {
  id_facture: number;
  partenaire: string;
  montant_restant_dzd: number;
  date_echeance: string | null;
  statut: string;
}

export interface LivraisonRetardRow {
  id_livraison: number;
  id_commande: number;
  type_commande: string;
  statut_livraison: string;
  date_prevue: string | null;
}

export interface AnalyticsOverview {
  ventes_mensuelles: MonthlyPoint[];
  achats_mensuels: MonthlyPoint[];
  creances: CreanceRow[];
  dettes: CreanceRow[];
  livraisons_retard: LivraisonRetardRow[];
  totaux: {
    total_ventes_dzd: number;
    total_achats_dzd: number;
    total_creances_dzd: number;
    total_dettes_dzd: number;
    nb_livraisons_retard: number;
  };
  schema_ready: boolean;
}

const SCHEMA_HINT =
  "Vues introuvables — exécutez data/schema_postgresql_qdia_export_v2.sql sur PostgreSQL";

/** Exécute une requête, renvoie [] si la relation/vue n'existe pas encore */
async function safeQuery<T>(sql: string, label: string): Promise<{ rows: T[]; ok: boolean }> {
  try {
    const result = await pool.query(sql);
    return { rows: result.rows as T[], ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/relation .* does not exist|does not exist/i.test(message)) {
      logger.warn({ label }, SCHEMA_HINT);
    } else {
      logger.error({ err, label }, "Analytics query failed");
    }
    return { rows: [], ok: false };
  }
}

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function toMonthStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 7);
  return String(v ?? "").slice(0, 7);
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const [ventes, achats, creances, dettes, retards] = await Promise.all([
    safeQuery<{ mois: unknown; total_ventes_dzd: unknown }>(
      "SELECT mois, total_ventes_dzd FROM v_ventes_mensuelles ORDER BY mois", "v_ventes_mensuelles"),
    safeQuery<{ mois: unknown; total_achats_dzd: unknown }>(
      "SELECT mois, total_achats_dzd FROM v_achats_mensuels ORDER BY mois", "v_achats_mensuels"),
    safeQuery<{ id_facture: number; nom_entreprise: string; montant_restant_dzd: unknown; date_echeance: unknown; statut: string }>(
      "SELECT id_facture, nom_entreprise, montant_restant_dzd, date_echeance, statut FROM v_creances ORDER BY date_echeance NULLS LAST", "v_creances"),
    safeQuery<{ id_facture: number; nom_entreprise: string; montant_restant_dzd: unknown; date_echeance: unknown; statut: string }>(
      "SELECT id_facture, nom_entreprise, montant_restant_dzd, date_echeance, statut FROM v_dettes ORDER BY date_echeance NULLS LAST", "v_dettes"),
    safeQuery<{ id_livraison: number; id_commande: number; type_commande: string; statut_livraison: string; date_prevue: unknown }>(
      "SELECT id_livraison, id_commande, type_commande, statut_livraison, date_prevue FROM v_livraisons_retard ORDER BY date_prevue", "v_livraisons_retard"),
  ]);

  const ventesPts: MonthlyPoint[] = ventes.rows.map(r => ({ mois: toMonthStr(r.mois), total_dzd: toNumber(r.total_ventes_dzd) }));
  const achatsPts: MonthlyPoint[] = achats.rows.map(r => ({ mois: toMonthStr(r.mois), total_dzd: toNumber(r.total_achats_dzd) }));
  const creancesRows: CreanceRow[] = creances.rows.map(r => ({
    id_facture: r.id_facture, partenaire: r.nom_entreprise,
    montant_restant_dzd: toNumber(r.montant_restant_dzd),
    date_echeance: r.date_echeance ? toMonthStr(r.date_echeance) : null, statut: r.statut,
  }));
  const dettesRows: CreanceRow[] = dettes.rows.map(r => ({
    id_facture: r.id_facture, partenaire: r.nom_entreprise,
    montant_restant_dzd: toNumber(r.montant_restant_dzd),
    date_echeance: r.date_echeance ? toMonthStr(r.date_echeance) : null, statut: r.statut,
  }));
  const retardsRows: LivraisonRetardRow[] = retards.rows.map(r => ({
    id_livraison: r.id_livraison, id_commande: r.id_commande,
    type_commande: r.type_commande, statut_livraison: r.statut_livraison,
    date_prevue: r.date_prevue ? String(r.date_prevue).slice(0, 10) : null,
  }));

  return {
    ventes_mensuelles: ventesPts,
    achats_mensuels: achatsPts,
    creances: creancesRows,
    dettes: dettesRows,
    livraisons_retard: retardsRows,
    totaux: {
      total_ventes_dzd: ventesPts.reduce((s, p) => s + p.total_dzd, 0),
      total_achats_dzd: achatsPts.reduce((s, p) => s + p.total_dzd, 0),
      total_creances_dzd: creancesRows.reduce((s, r) => s + r.montant_restant_dzd, 0),
      total_dettes_dzd: dettesRows.reduce((s, r) => s + r.montant_restant_dzd, 0),
      nb_livraisons_retard: retardsRows.length,
    },
    schema_ready: ventes.ok && achats.ok && creances.ok && dettes.ok && retards.ok,
  };
}
