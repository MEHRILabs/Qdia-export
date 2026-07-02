/** Fiche produit générée localement quand les APIs IA sont indisponibles (quota, erreur réseau). */

export interface GeneratedProductShape {
  name_fr: string;
  name_en: string;
  name_ar: string;
  description_fr: string;
  description_en: string;
  description_ar?: string;
  category: string;
  specs: Record<string, string>;
  suggested_moq: number;
  suggested_moq_unit: string;
  suggested_port: string;
  certifications: string[];
  seo_tags: string[];
  compliance_alerts: string[];
  _provider?: string;
  _fallback?: boolean;
  _fallback_reason?: string;
}

function looksLikeCommandPhrase(text: string): boolean {
  const t = text.normalize("NFC").trim();
  if (t.length > 60) return true;
  return /génér|genere|crée[rz]?|créer|fiche\s+(de|pour)|\bmoi une\b|je veux|j'aimerais|donne[rz]?/i.test(t);
}

/** Corrige une fiche IA qui reprend la phrase de commande au lieu du nom produit */
export function sanitizeGeneratedProduct(
  result: Record<string, unknown>,
  rawDescription: string,
): Record<string, unknown> {
  const extracted = extractProductName(rawDescription);
  const nameFr = String(result.name_fr ?? "").trim();
  const useExtracted = !nameFr || looksLikeCommandPhrase(nameFr) || nameFr.length > 55;

  if (!useExtracted) return result;

  const wilaya = detectWilaya(rawDescription);
  const category = String(result.category ?? detectCategory(rawDescription, extracted));
  const targetMarket = String(
    (result.specs as Record<string, string> | undefined)?.["Marché cible"] ?? "FR",
  );

  return {
    ...result,
    name_fr: extracted,
    name_en: `${extracted} — Premium Algerian Export`,
    name_ar: `${extracted} — منتج جزائري للتصدير`,
    description_fr:
      `Les ${extracted} sont un produit emblématique Made in Algeria 🇩🇿, origine ${wilaya}. ` +
      `Qualité premium adaptée à l'export B2B vers ${targetMarket} : conditionnement professionnel, ` +
      `documentation export et traçabilité fournisseur.`,
    description_en:
      `${extracted} is a premium Algerian export product from ${wilaya}, ready for international B2B trade to ${targetMarket}.`,
    description_ar: `${extracted} منتج جزائري عالي الجودة من ${wilaya}، مناسب للتصدير.`,
    category,
    specs: {
      ...(typeof result.specs === "object" && result.specs ? (result.specs as Record<string, string>) : {}),
      Origine: wilaya,
      Produit: extracted,
    },
    seo_tags: [extracted.toLowerCase(), "export algérie", "made in algeria"],
  };
}

/** Extrait le vrai nom produit depuis une phrase naturelle */
export function extractProductName(raw: string): string {
  let text = raw.normalize("NFC").trim();

  const ficheMatch = text.match(/\bfiche\s+(?:de|pour|produit\s+)?\s*(.+)$/i);
  if (ficheMatch?.[1]) {
    text = ficheMatch[1].trim();
  }

  text = text.replace(
    /^(génère[rz]?|généré|générée|genere|genéré|crée[rz]?|créer|créé|fais|fait|donne[rz]?|je veux|j'aimerais)\s+(moi\s+)?(une\s+)?/gi,
    "",
  );
  text = text.replace(/^(mes\s+|mon\s+|ma\s+|des\s+|les\s+|de\s+|du\s+|d[''])/gi, "");
  text = text.replace(/\s+(pour export|à exporter|export|international).*$/i, "");

  const cleaned = text.split(/[.,;!?\n]/).map(s => s.trim()).find(s => s.length > 2) ?? text;
  const name = cleaned.trim().slice(0, 80);

  if (!name || name.length < 3) return "Produit export algérien";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function detectCategory(desc: string, name: string): string {
  const d = `${desc} ${name}`.toLowerCase();
  if (/canette|boisson|soda|jus|hamoude|hamoud|eau minérale|limonade/.test(d)) return "Agriculture & Food";
  if (/huile|olive|datte|miel|couscous|agri|aliment|food|fruits/.test(d)) return "Agriculture & Food";
  if (/textile|tapis|coton|laine|broderie/.test(d)) return "Textiles & Apparel";
  if (/ciment|marbre|ceramique|construction/.test(d)) return "Construction Materials";
  if (/artisan|cuivre|poterie|decor/.test(d)) return "Handicrafts & Decor";
  if (/phosphate|energie|engrais|chim/.test(d)) return "Energy & Chemicals";
  return "Agriculture & Food";
}

function detectWilaya(desc: string): string {
  const wilayas = ["Béjaïa", "Biskra", "Alger", "Oran", "Constantine", "Ghardaïa", "Tizi Ouzou", "Annaba"];
  for (const w of wilayas) {
    if (desc.toLowerCase().includes(w.toLowerCase())) return w;
  }
  return "Alger";
}

function detectMoqUnit(name: string, desc: string): string {
  const d = `${name} ${desc}`.toLowerCase();
  if (/canette|bouteille|unité|piece|pièce|carton/.test(d)) return "units";
  if (/huile|litre|oil/.test(d)) return "liters";
  if (/tonne|ton/.test(d)) return "tons";
  return "kg";
}

export function generateLocalProduct(
  description: string,
  targetMarket = "FR",
  costDzd?: number,
): GeneratedProductShape {
  const name = extractProductName(description);
  const wilaya = detectWilaya(description);
  const category = detectCategory(description, name);
  const moqUnit = detectMoqUnit(name, description);
  const costNote = costDzd ? ` Coût de revient indicatif : ${costDzd} DZD.` : "";

  return {
    name_fr: name,
    name_en: `${name} — Premium Algerian Export`,
    name_ar: `${name} — منتج جزائري للتصدير`,
    description_fr:
      `Les ${name} sont un produit emblématique Made in Algeria 🇩🇿, origine ${wilaya}. ` +
      `Qualité premium adaptée à l'export B2B vers ${targetMarket} : conditionnement professionnel, ` +
      `documentation export et traçabilité fournisseur. Idéal pour distributeurs et importateurs internationaux.${costNote}`,
    description_en:
      `${name} is a premium Algerian export product from ${wilaya}, ready for international B2B trade to ${targetMarket}. ` +
      `Professional packaging, export documentation and verified supplier traceability included.`,
    description_ar:
      `${name} منتج جزائري عالي الجودة من ${wilaya}، مناسب للتصدير إلى الأسواق الدولية.`,
    category,
    specs: {
      Origine: wilaya,
      Produit: name,
      Conditionnement: "Export B2B",
      "Marché cible": targetMarket,
      Normes: "Halal, Phytosanitaire",
    },
    suggested_moq: moqUnit === "units" ? 1000 : 500,
    suggested_moq_unit: moqUnit,
    suggested_port: wilaya === "Béjaïa" ? "Béjaïa" : wilaya === "Oran" ? "Oran" : "Alger",
    certifications: ["Halal Certificate", "Made in Algeria"],
    seo_tags: [name.toLowerCase(), "export algérie", "made in algeria"],
    compliance_alerts: [
      "Mode secours activé — rechargez le crédit OpenAI/Gemini pour une fiche IA complète en 3 langues.",
    ],
    _provider: "local-fallback",
    _fallback: true,
  };
}

export function formatAiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/billing hard limit|billing_hard_limit/i.test(msg)) {
    return "Crédit OpenAI épuisé pour les photos. Le chat utilise Groq, mais les images passent par OpenAI — ajoutez un moyen de paiement sur platform.openai.com/settings/billing";
  }
  if (/insufficient_quota|exceeded your current quota/i.test(msg)) {
    return "Quota API épuisé (OpenAI). Rechargez votre compte sur platform.openai.com/settings/billing.";
  }
  if (/429|rate.?limit|too many requests/i.test(msg)) {
    return "Trop de requêtes IA. Réessayez dans 1 minute.";
  }
  if (/404.*not found|is not found for API/i.test(msg)) {
    return "Modèle image IA indisponible. Utilisez « Détourage » (remove.bg) ou rechargez OpenAI.";
  }
  if (/not_found_error|model:/i.test(msg)) {
    return "Modèle IA introuvable. Vérifiez la configuration du fournisseur.";
  }
  if (/REMOVEBG_API_KEY/i.test(msg)) {
    return "Clé remove.bg manquante. Ajoutez REMOVEBG_API_KEY dans .env pour le détourage.";
  }
  if (/401|invalid.*api.*key|authentication/i.test(msg)) {
    return "Clé API invalide. Vérifiez OPENAI_API_KEY, GEMINI_API_KEY ou ANTHROPIC_API_KEY dans .env";
  }
  return msg.slice(0, 220);
}
