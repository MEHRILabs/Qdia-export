import type { AiWizardStep } from "@workspace/db";
import * as sessionStore from "./session-store";
import { afterChatTurn, detectIntent } from "./extraction";
import { aiChatStream, aiVisionJson, aiCompleteMini, aiCompleteTextJson } from "./ai/engine";
import { AGENT_SYSTEM_PROMPT, PRODUCT_SYSTEM_PROMPT, buildProductPrompt, parseJsonFromAi } from "./ai/types";
import { processStudioImage, type StudioAction } from "./image-studio";
import { logger } from "../lib/logger";
import { generateLocalProduct, formatAiError, sanitizeGeneratedProduct } from "./local-product-fallback";
import { FALLBACK_PORTS, getFreightDzd, calculateCustoms } from "./ports-customs";

export class AgentOrchestrator {
  async createSession(supplierId?: number) {
    return sessionStore.createSession(supplierId);
  }

  async getSession(sessionId: string) {
    return sessionStore.getSession(sessionId);
  }

  async resetSession(sessionId: string) {
    return sessionStore.resetSession(sessionId);
  }

  async runChat(
    sessionId: string,
    message: string,
    onChunk: (text: string) => void,
  ) {
    const session = await sessionStore.getSession(sessionId);
    if (!session) throw new Error("Session introuvable");

    const history = session.chatHistory.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const messages = [
      { role: "system" as const, content: AGENT_SYSTEM_PROMPT },
      ...history,
      { role: "user" as const, content: message },
    ];

    let fullReply = "";
    const provider = await aiChatStream(messages, chunk => {
      fullReply += chunk;
      onChunk(chunk);
    });

    const extracted = await afterChatTurn(sessionId, message, fullReply);
    const intent = detectIntent(message);

    if (intent === "product") await sessionStore.setStep(sessionId, "generate");
    else if (intent === "pricing") await sessionStore.setStep(sessionId, "pricing");
    else if (intent === "image") await sessionStore.setStep(sessionId, "studio");
    else if (intent === "publish") await sessionStore.setStep(sessionId, "publish");

    return { provider, extracted, intent, suggested_step: intent };
  }

  async runGenerateProduct(
    sessionId: string,
    input: {
      description: string;
      image_base64?: string;
      target_market?: string;
      cost_dzd?: number;
    },
  ) {
    const session = await sessionStore.getSession(sessionId);
    const merged = {
      description: input.description || session?.extractedData?.product_name || "",
      target_market: input.target_market || session?.extractedData?.target_market,
      cost_dzd: input.cost_dzd ?? session?.extractedData?.cost_dzd,
      image_base64: input.image_base64,
    };

    if (!merged.description.trim()) {
      throw new Error("Description produit requise");
    }

    let result: Record<string, unknown>;
    let provider = "local-fallback";

    try {
      const prompt = buildProductPrompt(merged.description, merged.target_market, merged.cost_dzd);
      if (merged.image_base64) {
        const { data: raw, provider: p } = await aiVisionJson(
          PRODUCT_SYSTEM_PROMPT,
          prompt,
          merged.image_base64,
        );
        result = sanitizeGeneratedProduct(parseJsonFromAi(raw), merged.description);
        provider = p;
      } else {
        const { data: raw, provider: p } = await aiCompleteTextJson(PRODUCT_SYSTEM_PROMPT, prompt);
        result = sanitizeGeneratedProduct(parseJsonFromAi(raw), merged.description);
        provider = p;
      }
    } catch (err) {
      logger.warn({ err }, "AI generate failed — using local fallback");
      result = generateLocalProduct(
        merged.description,
        merged.target_market ?? "FR",
        merged.cost_dzd,
      ) as unknown as Record<string, unknown>;
      result._fallback_reason = formatAiError(err);
    }

    result._provider = provider;
    await sessionStore.saveGeneratedProduct(sessionId, result);
    await sessionStore.setStep(sessionId, "pricing" as AiWizardStep);

    return { ...result, _provider: provider };
  }

  async runPricing(
    sessionId: string,
    input: {
      product_name: string;
      cost_dzd: number;
      quantity: number;
      quantity_unit?: string;
      destination_country: string;
      packaging_cost_dzd?: number;
      local_transport_dzd?: number;
      vendor_margin_pct?: number;
      port_code?: string;
    },
  ) {
    const USD_RATE = parseFloat(process.env.DZD_USD_RATE ?? "0.0074");
    const EUR_RATE = parseFloat(process.env.DZD_EUR_RATE ?? "0.0068");
    const AED_RATE = parseFloat(process.env.DZD_AED_RATE ?? String(USD_RATE * 3.6725));

    const port = FALLBACK_PORTS.find(p => p.code === input.port_code)
      ?? FALLBACK_PORTS.find(p => p.country_code === "DZ");

    const handling = port?.handling_fee_dzd ?? 800;
    const exw_dzd = input.cost_dzd + (input.packaging_cost_dzd ?? 0);
    const fob_dzd = exw_dzd + (input.local_transport_dzd ?? 0) + handling;
    const freight_dzd = port ? getFreightDzd(port, input.destination_country) : 2000;
    const cfr_dzd = fob_dzd + freight_dzd;
    const insurance_dzd = cfr_dzd * 0.005;
    const cif_dzd = cfr_dzd + insurance_dzd;

    const customs = calculateCustoms({
      product_category: "Agriculture & Food",
      destination_code: input.destination_country as "FR" | "AE" | "US" | "DZ",
      cif_value_dzd: cif_dzd,
      port_code: input.port_code,
    });
    const margin = 1 + (input.vendor_margin_pct ?? 15) / 100;
    const qdia_fee = 1.03;

    const exwFinalDzd = exw_dzd * margin * qdia_fee;
    const fobFinalDzd = fob_dzd * margin * qdia_fee;
    const cfrFinalDzd = cfr_dzd * margin * qdia_fee;
    const cifFinalDzd = cif_dzd * margin * qdia_fee;

    const result = {
      exw_dzd: parseFloat(exwFinalDzd.toFixed(0)),
      fob_dzd: parseFloat(fobFinalDzd.toFixed(0)),
      cfr_dzd: parseFloat(cfrFinalDzd.toFixed(0)),
      cif_dzd: parseFloat(cifFinalDzd.toFixed(0)),
      exw_usd: parseFloat((exwFinalDzd * USD_RATE).toFixed(2)),
      fob_usd: parseFloat((fobFinalDzd * USD_RATE).toFixed(2)),
      cfr_usd: parseFloat((cfrFinalDzd * USD_RATE).toFixed(2)),
      cif_usd: parseFloat((cifFinalDzd * USD_RATE).toFixed(2)),
      exw_eur: parseFloat((exwFinalDzd * EUR_RATE).toFixed(2)),
      fob_eur: parseFloat((fobFinalDzd * EUR_RATE).toFixed(2)),
      cfr_eur: parseFloat((cfrFinalDzd * EUR_RATE).toFixed(2)),
      cif_eur: parseFloat((cifFinalDzd * EUR_RATE).toFixed(2)),
      exw_aed: parseFloat((exwFinalDzd * AED_RATE).toFixed(2)),
      fob_aed: parseFloat((fobFinalDzd * AED_RATE).toFixed(2)),
      cfr_aed: parseFloat((cfrFinalDzd * AED_RATE).toFixed(2)),
      cif_aed: parseFloat((cifFinalDzd * AED_RATE).toFixed(2)),
      exchange_rate_dzd_usd: USD_RATE,
      exchange_rate_dzd_eur: EUR_RATE,
      exchange_rate_dzd_aed: parseFloat(AED_RATE.toFixed(6)),
      breakdown: {
        "Coût produit (DZD)": input.cost_dzd,
        "Emballage (DZD)": input.packaging_cost_dzd ?? 0,
        "Transport local (DZD)": input.local_transport_dzd ?? 0,
        "Frais port + docs (DZD)": handling,
        "Port départ": port ? `${port.name} (${port.code})` : "Alger",
        "Fret maritime (DZD)": freight_dzd,
        "Assurance (DZD)": parseFloat(insurance_dzd.toFixed(0)),
        "Douane — droits (DZD)": customs.duty_dzd,
        "Douane — TVA (DZD)": customs.vat_dzd,
        "Douane — frais (DZD)": customs.customs_fee_dzd + customs.documentation_fee_dzd,
        "Marge vendeur (%)": input.vendor_margin_pct ?? 15,
        "Commission QDIA (%)": 3,
      },
      customs,
      market_benchmark: null as string | null,
      price_range_note: `Prix indicatif FOB pour ${input.quantity} ${input.quantity_unit ?? "kg"} vers ${input.destination_country}`,
    };

    try {
      result.market_benchmark = await aiCompleteMini(
        `Analyse concise (2 phrases) du prix FOB ${result.fob_usd} USD pour "${input.product_name}" exporté d'Algérie vers ${input.destination_country}. Réponds en français.`,
      );
    } catch (err) {
      logger.warn({ err }, "benchmark failed");
    }

    await sessionStore.savePricing(sessionId, result);
    return result;
  }

  async runStudio(
    sessionId: string,
    input: {
      image_base64: string;
      action: StudioAction;
      product_name?: string;
      scene_description?: string;
    },
  ) {
    const output = await processStudioImage(input);
    const session = await sessionStore.getSession(sessionId);
    const version = session?.studioImages.length ?? 0;

    await sessionStore.saveStudioVersion(sessionId, {
      version: version + 1,
      action: input.action,
      image_base64: output.image_base64,
      created_at: new Date().toISOString(),
    });

    return output;
  }

  async markPublished(sessionId: string, productId: number) {
    await sessionStore.completeSession(sessionId, productId);
  }
}

export const agentOrchestrator = new AgentOrchestrator();
