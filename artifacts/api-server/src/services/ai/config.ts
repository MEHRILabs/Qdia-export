export type AiProvider = "openai" | "gemini" | "claude" | "groq";

export function getProvider(kind: "chat" | "vision" | "benchmark" | "image"): AiProvider {
  const map: Record<string, string | undefined> = {
    chat: process.env.AI_CHAT_PROVIDER,
    vision: process.env.AI_VISION_PROVIDER,
    benchmark: process.env.AI_BENCHMARK_PROVIDER,
    image: process.env.AI_IMAGE_PROVIDER,
  };
  const raw = map[kind]?.toLowerCase();
  if (raw === "gemini" || raw === "claude" || raw === "openai" || raw === "groq") return raw;
  return "openai";
}

export function fallbackEnabled(): boolean {
  return process.env.AI_FALLBACK_ENABLED !== "false";
}

export function providerOrder(primary: AiProvider): AiProvider[] {
  const all: AiProvider[] = ["openai", "groq", "gemini", "claude"];
  const rest = all.filter(p => p !== primary);
  return [primary, ...rest];
}

export function hasProviderKey(provider: AiProvider): boolean {
  if (provider === "openai") return !!process.env.OPENAI_API_KEY;
  if (provider === "groq") return !!process.env.GROQ_API_KEY;
  if (provider === "gemini") return !!process.env.GEMINI_API_KEY;
  if (provider === "claude") return !!process.env.ANTHROPIC_API_KEY;
  return false;
}
