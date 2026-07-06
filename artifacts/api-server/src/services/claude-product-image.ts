import { claudeComplete } from "./ai/providers/claude-provider";
import { hasProviderKey } from "./ai/config";
import { logger } from "../lib/logger";

function extractSvg(raw: string): string | null {
  const cleaned = raw
    .replace(/^```(?:svg|xml)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = cleaned.indexOf("<svg");
  const end = cleaned.lastIndexOf("</svg>");
  if (start === -1 || end === -1) return null;
  return cleaned.slice(start, end + 6);
}

/** Visuel minimal sans texte — packshot illustré fond blanc */
function fallbackSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#FAFBFC"/>
  <ellipse cx="256" cy="420" rx="120" ry="18" fill="#E8EEF4"/>
  <rect x="176" y="160" width="160" height="200" rx="16" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
  <rect x="196" y="180" width="120" height="80" rx="8" fill="#0461A5" opacity="0.08"/>
  <circle cx="256" cy="300" r="36" fill="#F5C518" opacity="0.25"/>
</svg>`;
}

export function canGenerateClaudeProductVisual(): boolean {
  return hasProviderKey("claude");
}

/** Visuel produit SVG minimal — sans texte ni labels sur l'image */
export async function generateClaudeProductSvg(input: {
  name: string;
  category?: string | null;
  description?: string | null;
}): Promise<string> {
  if (!canGenerateClaudeProductVisual()) {
    throw new Error("Clé Anthropic (Claude) manquante");
  }

  const prompt = `Tu es photographe packshot e-commerce pour QDIA Export.
Génère UNIQUEMENT du XML SVG valide (512x512, viewBox="0 0 512 512"), sans markdown.
Produit: ${input.name}
Catégorie: ${input.category ?? "Alimentaire"}

RÈGLES STRICTES:
- Fond blanc ou gris très clair uni (#FAFBFC)
- Illustration minimaliste du produit au centre (silhouette / emballage stylisé)
- AUCUN texte, AUCUNE étiquette, AUCUN logo, AUCUNE écriture dans le SVG
- Maximum 3 couleurs discrètes (#0461A5, #F5C518, gris clair)
- Style catalogue premium épuré, pas de dégradés criards`;

  try {
    const raw = await claudeComplete(
      [{ role: "user", content: prompt }],
      3500,
    );
    const svg = extractSvg(raw);
    if (svg && svg.includes("<svg") && svg.length > 200 && !/<text[\s>]/i.test(svg)) {
      return svg;
    }
    logger.warn({ product: input.name }, "SVG Claude invalide ou avec texte — fallback minimal");
  } catch (err) {
    logger.warn({ err, product: input.name }, "Génération SVG Claude échouée");
  }

  return fallbackSvg();
}
