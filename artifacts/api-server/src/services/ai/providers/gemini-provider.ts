import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage } from "../types";
import { normalizeImageBase64 } from "../../../lib/image-base64";

function client() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

function toGeminiHistory(messages: ChatMessage[]) {
  return messages.slice(0, -1).map(m => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }],
  }));
}

export async function geminiChatStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<void> {
  const model = client().getGenerativeModel({ model: "gemini-2.0-flash" });
  const last = messages[messages.length - 1];
  const chat = model.startChat({ history: toGeminiHistory(messages) });
  const result = await chat.sendMessageStream(last.content);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) onChunk(text);
  }
}

export async function geminiComplete(messages: ChatMessage[], maxTokens = 2000): Promise<string> {
  const model = client().getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
  });
  const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n\n");
  const res = await model.generateContent(prompt);
  return res.response.text();
}

export async function geminiCompleteMini(prompt: string): Promise<string> {
  const model = client().getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { maxOutputTokens: 300, temperature: 0.5 },
  });
  const res = await model.generateContent(prompt);
  return res.response.text();
}

export async function geminiVisionJson(
  systemPrompt: string,
  userPrompt: string,
  imageBase64?: string,
): Promise<string> {
  const model = client().getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: { maxOutputTokens: 2000, temperature: 0.3 },
  });
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: userPrompt },
  ];
  if (imageBase64) {
    const { data, mimeType } = normalizeImageBase64(imageBase64);
    parts.push({ inlineData: { mimeType, data } });
  }
  const res = await model.generateContent({ contents: [{ role: "user", parts }] });
  return res.response.text();
}

export async function geminiImageGenerate(prompt: string): Promise<string> {
  const candidates = [
    process.env.GEMINI_IMAGE_MODEL,
    "gemini-2.5-flash-image",
    "gemini-2.0-flash-preview-image-generation",
  ].filter((m): m is string => Boolean(m));

  let lastError: unknown;
  for (const modelName of candidates) {
    const model = client().getGenerativeModel({ model: modelName });
    try {
      const res = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] } as Record<string, unknown>,
      });
      const parts = res.response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if ("inlineData" in part && part.inlineData?.data) {
          return part.inlineData.data;
        }
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error(
    "Génération image Gemini indisponible. Rechargez OpenAI ou configurez GEMINI_IMAGE_MODEL dans .env",
  );
}
