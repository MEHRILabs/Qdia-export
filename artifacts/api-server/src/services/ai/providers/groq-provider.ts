import OpenAI from "openai";
import type { ChatMessage } from "../types";

const client = () => new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const model = () => process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

export async function groqChatStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<void> {
  const stream = await client().chat.completions.create({
    model: model(),
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

export async function groqComplete(messages: ChatMessage[], maxTokens = 2000): Promise<string> {
  const res = await client().chat.completions.create({
    model: model(),
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    max_tokens: maxTokens,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function groqCompleteMini(prompt: string): Promise<string> {
  const res = await client().chat.completions.create({
    model: model(),
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
    temperature: 0.5,
  });
  return res.choices[0]?.message?.content ?? "";
}
