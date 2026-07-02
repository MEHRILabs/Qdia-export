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

function fallbackSvg(name: string, category?: string | null): string {
  const label = name.slice(0, 36).replace(/[<>&"]/g, "");
  const cat = (category ?? "Export DZ").slice(0, 24).replace(/[<>&"]/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#EAF3FC"/>
      <stop offset="100%" stop-color="#FFF8E8"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="256" cy="200" r="88" fill="#0461A5" opacity="0.12"/>
  <rect x="136" y="300" width="240" height="120" rx="20" fill="#fff" stroke="#0461A5" stroke-width="3"/>
  <text x="256" y="355" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" fill="#0461A5" font-weight="bold">${label}</text>
  <text x="256" y="385" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#555">${cat}</text>
  <text x="256" y="470" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="#888">QDIA Export · Made in Algeria</text>
</svg>`;
}

export function canGenerateClaudeProductVisual(): boolean {
  return hasProviderKey("claude");
}

/** Visuel produit SVG généré par Claude (pas une photo réaliste, mais affichable catalogue). */
export async function generateClaudeProductSvg(input: {
  name: string;
  category?: string | null;
  description?: string | null;
}): Promise<string> {
  if (!canGenerateClaudeProductVisual()) {
    throw new Error("Clé Anthropic (Claude) manquante");
  }

  const prompt = `Tu es designer pour QDIA Export (marketplace export algérien).
Génère UNIQUEMENT du XML SVG valide (512x512, viewBox="0 0 512 512"), sans markdown ni texte autour.
Produit: ${input.name}
Catégorie: ${input.category ?? "Alimentaire"}
${input.description ? `Description: ${input.description.slice(0, 200)}` : ""}

Style: illustration professionnelle catalogue export, couleurs #0461A5 et #F5C518, fond clair,
icône ou silhouette du produit au centre, nom du produit lisible en français, mention discrète "Made in Algeria".
Pas de photo réaliste, pas de watermark externe.`;

  try {
    const raw = await claudeComplete(
      [{ role: "user", content: prompt }],
      3500,
    );
    const svg = extractSvg(raw);
    if (svg && svg.includes("<svg") && svg.length > 200) {
      return svg;
    }
    logger.warn({ product: input.name }, "SVG Claude invalide — modèle local");
  } catch (err) {
    logger.warn({ err, product: input.name }, "Génération SVG Claude échouée");
  }

  return fallbackSvg(input.name, input.category);
}
