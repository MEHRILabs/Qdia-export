import { logger } from "../../lib/logger";
import type { AiProvider } from "./config";
import { fallbackEnabled, getProvider, hasProviderKey, providerOrder } from "./config";
import * as openai from "./providers/openai-provider";
import * as gemini from "./providers/gemini-provider";
import * as claude from "./providers/claude-provider";
import * as groq from "./providers/groq-provider";
import type { ChatMessage } from "./types";

async function tryProviders<T>(
  kind: "chat" | "vision" | "benchmark" | "image",
  fn: (provider: AiProvider) => Promise<T>,
): Promise<{ result: T; provider: AiProvider }> {
  const primary = getProvider(kind);
  const order = fallbackEnabled() ? providerOrder(primary) : [primary];

  let lastError: unknown;
  for (const provider of order) {
    if (!hasProviderKey(provider)) continue;
    try {
      const result = await fn(provider);
      return { result, provider };
    } catch (err) {
      lastError = err;
      logger.warn({ err, provider, kind }, "AI provider failed, trying fallback");
    }
  }
  throw lastError ?? new Error(`Aucun fournisseur IA configuré pour ${kind}`);
}

export async function aiChatStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<AiProvider> {
  const { provider } = await tryProviders("chat", async p => {
    if (p === "openai") await openai.openaiChatStream(messages, onChunk);
    else if (p === "groq") await groq.groqChatStream(messages, onChunk);
    else if (p === "gemini") await gemini.geminiChatStream(messages, onChunk);
    else await claude.claudeChatStream(messages, onChunk);
    return true;
  });
  return provider;
}

export async function aiCompleteMini(prompt: string): Promise<string> {
  const { result } = await tryProviders("benchmark", async p => {
    if (p === "openai") return openai.openaiCompleteMini(prompt);
    if (p === "groq") return groq.groqCompleteMini(prompt);
    if (p === "gemini") return gemini.geminiCompleteMini(prompt);
    return claude.claudeCompleteMini(prompt);
  });
  return result;
}

export async function aiCompleteTextJson(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ data: string; provider: AiProvider }> {
  const { result, provider } = await tryProviders("chat", async p => {
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];
    if (p === "openai") return openai.openaiComplete(messages, 2000);
    if (p === "groq") return groq.groqComplete(messages, 2000);
    if (p === "gemini") return gemini.geminiComplete(messages, 2000);
    return claude.claudeComplete(messages, 2000);
  });
  return { data: result, provider };
}

export async function aiVisionJson(
  systemPrompt: string,
  userPrompt: string,
  imageBase64?: string,
): Promise<{ data: string; provider: AiProvider }> {
  const { result, provider } = await tryProviders("vision", async p => {
    if (p === "openai") return openai.openaiVisionJson(systemPrompt, userPrompt, imageBase64);
    if (p === "groq") throw new Error("Groq ne supporte pas la vision/image dans ce projet");
    if (p === "gemini") return gemini.geminiVisionJson(systemPrompt, userPrompt, imageBase64);
    return claude.claudeVisionJson(systemPrompt, userPrompt, imageBase64);
  });
  return { data: result, provider };
}

export async function aiImageEdit(
  imageBase64: string,
  prompt: string,
): Promise<{ imageBase64: string; provider: AiProvider }> {
  const primary = getProvider("image");
  const order = fallbackEnabled() ? providerOrder(primary) : [primary];

  let lastError: unknown;
  for (const provider of order) {
    if (!hasProviderKey(provider)) continue;
    try {
      if (provider === "openai") {
        const image = await openai.openaiImageEdit(imageBase64, prompt);
        return { imageBase64: image, provider };
      }
      if (provider === "gemini") {
        const image = await gemini.geminiImageGenerate(
          `${prompt}. Base the result on a professional Algerian export product photo.`,
        );
        return { imageBase64: image, provider };
      }
      if (provider === "groq") throw new Error("Groq ne supporte pas la génération d'images");
    } catch (err) {
      lastError = err;
      logger.warn({ err, provider }, "Image provider failed");
    }
  }
  throw lastError ?? new Error("Aucun fournisseur image disponible");
}

/** Génère une photo produit à partir du nom / catégorie (sans photo source) */
export async function aiGenerateProductImage(
  prompt: string,
): Promise<{ imageBase64: string; provider: AiProvider }> {
  const primary = getProvider("image");
  const order = fallbackEnabled() ? providerOrder(primary) : [primary];

  let lastError: unknown;
  for (const provider of order) {
    if (!hasProviderKey(provider)) continue;
    try {
      if (provider === "openai") {
        const image = await openai.openaiImageGenerate(prompt);
        return { imageBase64: image, provider };
      }
      if (provider === "gemini") {
        const image = await gemini.geminiImageGenerate(prompt);
        return { imageBase64: image, provider };
      }
      if (provider === "groq") throw new Error("Groq ne supporte pas la génération d'images");
    } catch (err) {
      lastError = err;
      logger.warn({ err, provider }, "Product image generation failed");
    }
  }
  throw lastError ?? new Error("Aucun fournisseur image disponible pour génération");
}
