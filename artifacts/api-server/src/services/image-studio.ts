import { aiImageEdit } from "./ai/engine";
import { logger } from "../lib/logger";

export type StudioAction =
  | "remove_background"
  | "white_background"
  | "studio_scene"
  | "enhance";

export interface StudioInput {
  image_base64: string;
  action: StudioAction;
  product_name?: string;
  scene_description?: string;
}

export interface StudioOutput {
  image_base64: string;
  action_applied: StudioAction;
  provider?: string;
  variants?: {
    thumb_base64?: string;
    card_base64?: string;
    hd_base64: string;
  };
}

async function removeBackground(imageBase64: string): Promise<string> {
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) {
    throw new Error("REMOVEBG_API_KEY non configurée. Ajoutez votre clé remove.bg dans .env");
  }

  const form = new FormData();
  form.append("image_file_b64", imageBase64);
  form.append("size", "auto");
  form.append("format", "png");

  const resp = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: form,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    logger.error({ status: resp.status, errText }, "remove.bg failed");
    throw new Error(`remove.bg: ${resp.status} — vérifiez votre clé API`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  return buffer.toString("base64");
}

function buildPrompt(action: StudioAction, productName?: string, scene?: string): string {
  const name = productName ? ` "${productName}"` : " an Algerian product";
  if (action === "studio_scene") {
    return `Professional product photography studio scene for export catalog. Product:${name}. ${scene ?? "Natural lighting, clean warm neutral background, commercial packshot. Made in Algeria."}`;
  }
  if (action === "white_background") {
    return `Same product on completely white clean background, professional product photography, centered, slight shadow, export catalog style.`;
  }
  return `Enhanced professional product photo, better lighting, sharper, export catalog quality, Made in Algeria.`;
}

/** Redimensionnement simple côté serveur via canvas HTML n'est pas dispo — on renvoie HD + métadonnées pour Fabric.js */
export async function processStudioImage(input: StudioInput): Promise<StudioOutput> {
  let imageBase64 = input.image_base64;
  let provider: string | undefined;

  if (input.action === "remove_background") {
    imageBase64 = await removeBackground(imageBase64);
    return {
      image_base64: imageBase64,
      action_applied: input.action,
      provider: "remove.bg",
      variants: { hd_base64: imageBase64 },
    };
  }

  const prompt = buildPrompt(input.action, input.product_name, input.scene_description);
  const { imageBase64: edited, provider: imgProvider } = await aiImageEdit(imageBase64, prompt);

  return {
    image_base64: edited,
    action_applied: input.action,
    provider: imgProvider,
    variants: { hd_base64: edited },
  };
}
