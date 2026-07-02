import OpenAI from "openai";
import type { ChatMessage } from "../types";
import { normalizeImageBase64 } from "../../../lib/image-base64";

const client = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function openaiChatStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<void> {
  const stream = await client().chat.completions.create({
    model: "gpt-4o",
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    max_tokens: 1200,
    temperature: 0.7,
    stream: true,
  });
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) onChunk(content);
  }
}

export async function openaiComplete(messages: ChatMessage[], maxTokens = 2000): Promise<string> {
  const res = await client().chat.completions.create({
    model: "gpt-4o",
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    max_tokens: maxTokens,
    temperature: 0.3,
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function openaiCompleteMini(prompt: string): Promise<string> {
  const res = await client().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
    temperature: 0.5,
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function openaiVisionJson(
  systemPrompt: string,
  userPrompt: string,
  imageBase64?: string,
): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];
  if (imageBase64) {
    const { data, mimeType } = normalizeImageBase64(imageBase64);
    messages.push({
      role: "user",
      content: [
        { type: "text", text: userPrompt },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${data}`, detail: "high" } },
      ],
    });
  } else {
    messages.push({ role: "user", content: userPrompt });
  }
  const res = await client().chat.completions.create({
    model: "gpt-4o",
    messages,
    max_tokens: 2000,
    temperature: 0.3,
  });
  return res.choices[0]?.message?.content ?? "{}";
}

export async function openaiImageEdit(
  imageBase64: string,
  prompt: string,
): Promise<string> {
  const model = process.env.OPENAI_IMAGE_EDIT_MODEL ?? process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
  const { data, mimeType } = normalizeImageBase64(imageBase64);
  const imageBuffer = Buffer.from(data, "base64");
  const ext = mimeType.includes("png") ? "png" : "jpg";
  const file = new File([new Blob([imageBuffer], { type: mimeType })], `product.${ext}`, { type: mimeType });

  const params: OpenAI.Images.ImageEditParams = {
    model,
    image: file,
    prompt,
    size: "1024x1024",
  };
  if (model.startsWith("dall-e")) {
    params.response_format = "b64_json";
  }

  const result = await client().images.edit(params);
  const item = result.data?.[0];
  if (item?.b64_json) return item.b64_json;
  if (item?.url) {
    const resp = await fetch(item.url);
    if (!resp.ok) throw new Error(`Téléchargement image OpenAI échoué (${resp.status})`);
    return Buffer.from(await resp.arrayBuffer()).toString("base64");
  }
  throw new Error("OpenAI n'a pas renvoyé d'image");
}

/** Génération photo produit depuis texte (catalogue sans photo source) */
export async function openaiImageGenerate(prompt: string): Promise<string> {
  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
  const params: OpenAI.Images.ImageGenerateParams = {
    model,
    prompt,
    size: "1024x1024",
    n: 1,
  };
  if (model.startsWith("dall-e")) {
    params.response_format = "b64_json";
  }

  const result = await client().images.generate(params);
  const item = result.data?.[0];
  if (item?.b64_json) return item.b64_json;
  if (item?.url) {
    const resp = await fetch(item.url);
    if (!resp.ok) throw new Error(`Téléchargement image OpenAI échoué (${resp.status})`);
    return Buffer.from(await resp.arrayBuffer()).toString("base64");
  }
  throw new Error("OpenAI n'a pas renvoyé d'image");
}
