import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "../types";
import { normalizeImageBase64, type ImageMime } from "../../../lib/image-base64";

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

export async function claudeChatStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<void> {
  const system = messages.find(m => m.role === "system")?.content;
  const chatMessages = messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  const stream = client().messages.stream({
    model: MODEL,
    max_tokens: 1200,
    system: system ?? undefined,
    messages: chatMessages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      onChunk(event.delta.text);
    }
  }
}

export async function claudeComplete(messages: ChatMessage[], maxTokens = 2000): Promise<string> {
  const system = messages.find(m => m.role === "system")?.content;
  const chatMessages = messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: system ?? undefined,
    messages: chatMessages,
  });
  const block = res.content.find(b => b.type === "text");
  return block?.type === "text" ? block.text : "";
}

export async function claudeCompleteMini(prompt: string): Promise<string> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });
  const block = res.content.find(b => b.type === "text");
  return block?.type === "text" ? block.text : "";
}

export async function claudeVisionJson(
  systemPrompt: string,
  userPrompt: string,
  imageBase64?: string,
): Promise<string> {
  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = imageBase64
    ? (() => {
        const { data, mimeType } = normalizeImageBase64(imageBase64);
        return [
          { type: "image" as const, source: { type: "base64" as const, media_type: mimeType as ImageMime, data } },
          { type: "text" as const, text: userPrompt },
        ];
      })()
    : [{ type: "text", text: userPrompt }];

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content }],
  });
  const block = res.content.find(b => b.type === "text");
  return block?.type === "text" ? block.text : "{}";
}
