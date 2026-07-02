import { aiCompleteMini } from "./ai/engine";
import type { AiExtractedData } from "@workspace/db";
import * as sessionStore from "./session-store";

const COST_REGEX = /(\d[\d\s.,]*)\s*(dzd|da|dinar)/i;
const RETAIL_REGEX = /(\d[\d\s.,]*)\s*(dzd|da|dinar).{0,20}(pi[eè]ce|unitaire|unit|bouteille|sachet)/i;
const WHOLESALE_REGEX = /(\d[\d\s.,]*)\s*(dzd|da|dinar).{0,20}(gros|wholesale|tonne|palette|carton|moq)/i;
const MOQ_REGEX = /moq\s*[:\s]*(\d+)\s*(\w+)?/i;

export function extractFromText(text: string): Partial<AiExtractedData> {
  const data: Partial<AiExtractedData> = {};
  const cost = text.match(COST_REGEX);
  if (cost) data.cost_dzd = parseFloat(cost[1].replace(/\s/g, "").replace(",", "."));
  const retail = text.match(RETAIL_REGEX);
  if (retail) data.price_retail = parseFloat(retail[1].replace(/\s/g, "").replace(",", "."));
  const wholesale = text.match(WHOLESALE_REGEX);
  if (wholesale) data.price_wholesale = parseFloat(wholesale[1].replace(/\s/g, "").replace(",", "."));
  const moq = text.match(MOQ_REGEX);
  if (moq) {
    data.moq = parseInt(moq[1], 10);
    if (moq[2]) data.moq_unit = moq[2];
  }
  const wilayas = ["Béjaïa", "Biskra", "Ghardaïa", "Constantine", "Tipaza", "Alger", "Oran", "Annaba", "Skikda", "Tizi Ouzou"];
  for (const w of wilayas) {
    if (text.toLowerCase().includes(w.toLowerCase())) {
      data.origin_wilaya = w;
      break;
    }
  }
  return data;
}

export async function extractFromChatWithAi(
  userMessage: string,
  assistantReply: string,
): Promise<Partial<AiExtractedData>> {
  const regexData = extractFromText(`${userMessage} ${assistantReply}`);
  try {
    const prompt = `Extrais les infos produit export de ce dialogue. Réponds UNIQUEMENT en JSON:
{"product_name":"","origin_wilaya":"","cost_dzd":null,"price_retail":null,"price_wholesale":null,"moq":null,"moq_unit":"","packaging":"","target_market":"","category_hint":""}

Producteur: ${userMessage}
Assistant: ${assistantReply}`;

    const raw = await aiCompleteMini(prompt);
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<AiExtractedData>;
      return { ...regexData, ...Object.fromEntries(
        Object.entries(parsed).filter(([, v]) => v != null && v !== ""),
      ) };
    }
  } catch {
    /* fallback regex only */
  }
  return regexData;
}

export async function afterChatTurn(
  sessionId: string,
  userMessage: string,
  assistantReply: string,
): Promise<Partial<AiExtractedData>> {
  await sessionStore.appendChat(sessionId, userMessage, assistantReply);
  const extracted = await extractFromChatWithAi(userMessage, assistantReply);
  if (Object.keys(extracted).length > 0) {
    await sessionStore.updateExtracted(sessionId, extracted);
  }
  return extracted;
}

export function detectIntent(message: string): "pricing" | "image" | "publish" | "product" | "chat" {
  const lower = message.toLowerCase();
  if (/prix|fob|cif|coût|cost|tarif|pricing/.test(lower)) return "pricing";
  if (/photo|image|studio|fond/.test(lower)) return "image";
  if (/publier|publish|soumettre|catalogue/.test(lower)) return "publish";
  if (/fiche|génère|générer|produit/.test(lower)) return "product";
  return "chat";
}
