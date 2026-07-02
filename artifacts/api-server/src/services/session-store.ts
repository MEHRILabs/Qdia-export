import { db, aiSessionsTable, type AiChatMessage, type AiExtractedData, type AiSession, type AiStudioVersion } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const memoryStore = new Map<string, AiSession>();

function now() {
  return new Date();
}

export function createSessionId(): string {
  return crypto.randomUUID();
}

export async function createSession(supplierId?: number): Promise<AiSession> {
  const id = createSessionId();
  const row = {
    id,
    supplierId: supplierId ?? null,
    currentStep: "chat" as const,
    status: "active" as const,
    chatHistory: [] as AiChatMessage[],
    extractedData: {} as AiExtractedData,
    generatedProduct: null,
    pricingResult: null,
    studioImages: [] as AiStudioVersion[],
    publishedProductId: null,
    metadata: {},
    createdAt: now(),
    updatedAt: now(),
  };

  try {
    const [inserted] = await db.insert(aiSessionsTable).values(row).returning();
    return inserted;
  } catch (err) {
    logger.warn({ err }, "DB session insert failed — mémoire locale");
    const mem = { ...row } as AiSession;
    memoryStore.set(id, mem);
    return mem;
  }
}

export async function getSession(id: string): Promise<AiSession | null> {
  if (memoryStore.has(id)) return memoryStore.get(id)!;
  try {
    const [row] = await db.select().from(aiSessionsTable).where(eq(aiSessionsTable.id, id));
    return row ?? null;
  } catch {
    return memoryStore.get(id) ?? null;
  }
}

async function persist(id: string, patch: Partial<AiSession>): Promise<AiSession | null> {
  const updated = { ...patch, updatedAt: now() };
  if (memoryStore.has(id)) {
    const current = memoryStore.get(id)!;
    const merged = { ...current, ...updated } as AiSession;
    memoryStore.set(id, merged);
    return merged;
  }
  try {
    const [row] = await db
      .update(aiSessionsTable)
      .set(updated)
      .where(eq(aiSessionsTable.id, id))
      .returning();
    return row ?? null;
  } catch (err) {
    logger.warn({ err, id }, "DB session update failed");
    return null;
  }
}

export async function appendChat(id: string, userMsg: string, assistantMsg: string): Promise<void> {
  const session = await getSession(id);
  if (!session) return;
  const chatHistory: AiChatMessage[] = [
    ...session.chatHistory,
    { role: "user", content: userMsg },
    { role: "assistant", content: assistantMsg },
  ];
  await persist(id, { chatHistory });
}

export async function updateExtracted(id: string, data: Partial<AiExtractedData>): Promise<void> {
  const session = await getSession(id);
  if (!session) return;
  await persist(id, { extractedData: { ...session.extractedData, ...data } });
}

export async function setStep(id: string, step: AiSession["currentStep"]): Promise<void> {
  await persist(id, { currentStep: step });
}

export async function saveGeneratedProduct(id: string, product: unknown): Promise<void> {
  await persist(id, { generatedProduct: product, currentStep: "pricing" });
}

export async function savePricing(id: string, pricing: unknown): Promise<void> {
  await persist(id, { pricingResult: pricing, currentStep: "studio" });
}

export async function saveStudioVersion(id: string, version: AiStudioVersion): Promise<void> {
  const session = await getSession(id);
  if (!session) return;
  const studioImages = [...session.studioImages, version];
  await persist(id, { studioImages, currentStep: "publish" });
}

export async function completeSession(id: string, productId: number): Promise<void> {
  await persist(id, {
    publishedProductId: productId,
    status: "completed",
    currentStep: "publish",
  });
}

export async function resetSession(id: string): Promise<AiSession | null> {
  return persist(id, {
    currentStep: "chat",
    status: "active",
    chatHistory: [],
    extractedData: {},
    generatedProduct: null,
    pricingResult: null,
    studioImages: [],
    publishedProductId: null,
  });
}
