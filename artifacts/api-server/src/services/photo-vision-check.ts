/**
 * Vérification IA vision des photos scrapées :
 * « cette image est-elle bien un packshot de CE produit ? »
 * Utilise la clé disponible (OpenAI / Gemini / Claude). Sans clé → pas de vérif (comportement inchangé).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../lib/logger";
import { hasProviderKey } from "./ai/config";

const VISION_TIMEOUT_MS = 25_000;

export function visionCheckAvailable(): boolean {
  return hasProviderKey("openai") || hasProviderKey("gemini") || hasProviderKey("claude");
}

const SYSTEM_PROMPT = `Tu es contrôleur qualité d'un catalogue B2B de produits algériens (alimentaire, agro, consommation).
On te montre une image candidate pour la fiche d'un produit donné.
Réponds UNIQUEMENT en JSON strict: {"match": true ou false, "confidence": 0 à 100, "reason": "explication courte"}.
match=true seulement si l'image montre clairement CE produit (packshot / emballage) :
- bon TYPE de produit (ex. huile d'olive vs datte, farine vs lait)
- idéalement la bonne MARQUE si elle est lisible sur l'emballage
match=false pour : paysages, personnes, dessins ou cartoons, logos seuls sans produit, citations, produits d'un autre type, mauvaises marques claires et différentes, captures d'écran, flou illisible.
En cas de doute sérieux, match=false.`;

export type VisionCheckResult = {
  /** true si une IA a réellement vérifié l'image */
  checked: boolean;
  /** true = image acceptée (ou vérification indisponible) */
  match: boolean;
  confidence: number;
  reason?: string;
};

async function resolveImagePayload(imageInput: string): Promise<string> {
  // data URL ou base64 brut
  if (imageInput.startsWith("data:") || imageInput.length > 200) {
    return imageInput.replace(/^data:image\/\w+;base64,/, "");
  }
  // Chemin local /uploads/...
  if (imageInput.startsWith("/uploads/") || imageInput.startsWith("uploads/")) {
    const rel = imageInput.replace(/^\//, "");
    const candidates = [
      join(process.cwd(), "public", rel),
      join(process.cwd(), rel),
      join(process.cwd(), "artifacts", "api-server", "public", rel),
    ];
    for (const p of candidates) {
      try {
        const buf = await readFile(p);
        return buf.toString("base64");
      } catch {
        /* try next */
      }
    }
  }
  return imageInput.replace(/^data:image\/\w+;base64,/, "");
}

export async function verifyProductPhoto(
  imageBase64: string,
  productName: string,
  description?: string | null,
  brand?: string | null,
): Promise<VisionCheckResult> {
  if (!visionCheckAvailable()) return { checked: false, match: true, confidence: 0 };

  try {
    const { aiVisionJson } = await import("./ai/engine");
    const payload = await resolveImagePayload(imageBase64);
    const prompt =
      `Produit: ${productName}` +
      (brand ? `\nMarque attendue: ${brand}` : "") +
      (description ? `\nDescription: ${description.slice(0, 200)}` : "") +
      `\nCette image correspond-elle à CE produit (bon type, idéalement bonne marque) ? JSON uniquement.`;

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("vision timeout")), VISION_TIMEOUT_MS),
    );
    const { data, provider } = await Promise.race([
      aiVisionJson(SYSTEM_PROMPT, prompt, payload),
      timeout,
    ]);

    const jsonMatch = data.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>) : null;
    if (!parsed || typeof parsed.match !== "boolean") {
      logger.warn({ productName: productName.slice(0, 40), data: data.slice(0, 120) }, "vision: réponse illisible");
      return { checked: false, match: true, confidence: 0, reason: "réponse illisible" };
    }

    const result: VisionCheckResult = {
      checked: true,
      match: parsed.match,
      confidence: Number(parsed.confidence) || 0,
      reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
    };
    logger.info(
      { productName: productName.slice(0, 40), provider, match: result.match, confidence: result.confidence, reason: result.reason?.slice(0, 80) },
      "vision check photo",
    );
    return result;
  } catch (err) {
    // Vérification indisponible → ne pas bloquer le scrape
    logger.warn({ err, productName: productName.slice(0, 40) }, "vision check indisponible");
    return { checked: false, match: true, confidence: 0 };
  }
}
