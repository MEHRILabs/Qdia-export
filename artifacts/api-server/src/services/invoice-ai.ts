import { aiCompleteTextJson } from "./ai/engine";
import { hasProviderKey, getProvider } from "./ai/config";

export interface InvoiceLineItem {
  description: string;
  hs_code?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export interface ProductInvoiceInput {
  product_id?: number;
  product_name: string;
  category?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  price_fob?: number;
  currency?: string;
  incoterm?: string;
  port_depart?: string;
  port_arrival?: string;
  moq?: number;
  moq_unit?: string;
  certifications?: string[];
}

function fallbackLines(input: ProductInvoiceInput): InvoiceLineItem[] {
  const qty = input.quantity ?? input.moq ?? 500;
  const unit = input.unit ?? input.moq_unit ?? "kg";
  const unitPrice = input.price_fob ?? 4.5;
  const productTotal = Math.round(qty * unitPrice * 100) / 100;

  return [
    {
      description: input.product_name,
      hs_code: guessHs(input.category),
      quantity: qty,
      unit,
      unit_price: unitPrice,
      total: productTotal,
    },
    {
      description: `Emballage export professionnel — ${input.category ?? "Agroalimentaire"}`,
      hs_code: "3923.10",
      quantity: 1,
      unit: "forfait",
      unit_price: Math.round(unitPrice * qty * 0.02 * 100) / 100 || 120,
      total: Math.round(unitPrice * qty * 0.02 * 100) / 100 || 120,
    },
    {
      description: `Fret maritime ${input.port_depart ?? "Béjaïa"} → ${input.port_arrival ?? "Marseille"}`,
      hs_code: "—",
      quantity: 1,
      unit: "conteneur 20'",
      unit_price: 1850,
      total: 1850,
    },
    {
      description: "Documentation export (certificat origine, phyto, facture commerciale)",
      hs_code: "—",
      quantity: 1,
      unit: "forfait",
      unit_price: 95,
      total: 95,
    },
    {
      description: "Assurance transport CIF (si applicable)",
      hs_code: "—",
      quantity: 1,
      unit: "forfait",
      unit_price: Math.round(productTotal * 0.015 * 100) / 100,
      total: Math.round(productTotal * 0.015 * 100) / 100,
    },
  ];
}

function guessHs(category?: string): string {
  const c = (category ?? "").toLowerCase();
  if (c.includes("agri") || c.includes("food") || c.includes("huile")) return "1509.90";
  if (c.includes("textile")) return "6204.62";
  if (c.includes("handicraft") || c.includes("artisan")) return "6912.00";
  if (c.includes("energy") || c.includes("chemical")) return "2710.19";
  return "—";
}

function parseLinesJson(raw: string): InvoiceLineItem[] | null {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { lines?: InvoiceLineItem[] } | InvoiceLineItem[];
    const lines = Array.isArray(parsed) ? parsed : parsed.lines;
    if (!Array.isArray(lines) || !lines.length) return null;
    return lines.map(l => ({
      description: String(l.description ?? ""),
      hs_code: l.hs_code ? String(l.hs_code) : undefined,
      quantity: Number(l.quantity) || 1,
      unit: String(l.unit ?? "u"),
      unit_price: Number(l.unit_price) || 0,
      total: Number(l.total) || Number(l.quantity) * Number(l.unit_price) || 0,
    })).filter(l => l.description);
  } catch {
    return null;
  }
}

export async function generateInvoiceLines(input: ProductInvoiceInput): Promise<{
  lines: InvoiceLineItem[];
  source: "ai" | "template";
  notes?: string;
}> {
  if (!hasProviderKey(getProvider("benchmark"))) {
    return { lines: fallbackLines(input), source: "template", notes: "Modèle automatique (IA non configurée)" };
  }

  const prompt = `Tu es expert export algérien QDIA. Génère un tableau de lignes de facture commerciale export en JSON strict.
Produit: ${input.product_name}
Catégorie: ${input.category ?? "—"}
Quantité: ${input.quantity ?? input.moq ?? 500} ${input.unit ?? input.moq_unit ?? "kg"}
Prix FOB unitaire: ${input.price_fob ?? "—"} ${input.currency ?? "USD"}
Incoterm: ${input.incoterm ?? "FOB"}
Port départ: ${input.port_depart ?? "Béjaïa"}
Port arrivée: ${input.port_arrival ?? "Marseille"}
Certifications: ${(input.certifications ?? []).join(", ") || "—"}

Réponds UNIQUEMENT avec JSON: {"lines":[{"description":"...","hs_code":"....","quantity":number,"unit":"...","unit_price":number,"total":number}]}
Inclus 4 à 6 lignes: marchandise, emballage, fret, documentation, assurance si CIF. Montants réalistes en ${input.currency ?? "USD"}.`;

  try {
    const { data } = await aiCompleteTextJson(
      "Tu génères des factures export algériennes en JSON valide uniquement.",
      prompt,
    );
    const lines = parseLinesJson(data);
    if (lines?.length) {
      return { lines, source: "ai", notes: "Lignes générées par IA selon le produit" };
    }
  } catch {
    /* fallback */
  }

  return { lines: fallbackLines(input), source: "template", notes: "Modèle automatique QDIA" };
}
