import { extractProductName } from "../local-product-fallback";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const AGENT_SYSTEM_PROMPT = `Tu es l'Agent IA QDIA Export, un assistant expert pour les producteurs algériens qui veulent exporter leurs produits à l'international.

Tes compétences:
- **ProductWriter**: Génère des fiches produit professionnelles en FR/EN/AR
- **ExportPricer**: Calcule les prix EXW, FOB, CFR, CIF selon les coûts fournis
- **ComplianceChecker**: Vérifie les règles export (halal, bio, phytosanitaire, embargo)
- **MOQAdvisor**: Conseille sur les quantités minimales de commande
- **CategoryMatcher**: Classe les produits dans le bon secteur export

Tu guides le producteur étape par étape pour publier son produit sur QDIA Export. Pose UNE question précise à la fois pour collecter: nom du produit, origine (wilaya), coût de revient en DZD, conditionnement, MOQ, marché cible.

Réponds en français par défaut. Si le producteur écrit en arabe ou anglais, réponds dans sa langue.
Sois professionnel, concis et actionnable.`;

export const PRODUCT_SYSTEM_PROMPT = `Tu es l'Agent IA QDIA Export, expert en commerce international algérien et en rédaction de fiches produit B2B.
Tu génères des fiches produit professionnelles pour la plateforme d'export QDIA (style Alibaba) destinées aux acheteurs internationaux.
Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans code block, sans explication.`;

export function buildProductPrompt(description: string, targetMarket?: string, costDzd?: number): string {
  const productName = extractProductName(description);

  return `Génère une fiche produit export complète pour ce produit algérien.

Message du producteur: "${description}"
Nom produit extrait (à utiliser tel quel pour name_fr): "${productName}"
IMPORTANT: Utilise "${productName}" comme name_fr — ne reprends JAMAIS la phrase de commande complète.
${targetMarket ? `Marché cible: ${targetMarket}` : ""}
${costDzd ? `Coût de revient: ${costDzd} DZD` : ""}

Retourne un JSON avec exactement ces champs:
{
  "name_fr": "Nom commercial en français (court, professionnel)",
  "name_en": "Nom commercial en anglais",
  "name_ar": "Nom commercial en arabe",
  "description_fr": "Description SEO professionnelle en français (150-200 mots)",
  "description_en": "Professional SEO description in English (150-200 words)",
  "description_ar": "وصف احترافي بالعربية",
  "category": "Agriculture & Food | Energy & Chemicals | Textiles & Apparel | Construction Materials | Handicrafts & Decor",
  "specs": { "Origine": "Wilaya", "Conditionnement": "...", "Durée de vie": "...", "Normes": "..." },
  "suggested_moq": 500,
  "suggested_moq_unit": "kg | liters | units | tons",
  "suggested_port": "Alger | Oran | Annaba | Béjaïa",
  "certifications": ["Halal Certificate", "ISO 22000", "Bio Certified"],
  "seo_tags": ["tag1", "tag2", "tag3"],
  "compliance_alerts": []
}`;
}

export function parseJsonFromAi(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  }
  return JSON.parse(cleaned) as Record<string, unknown>;
}
