import type { VercelRequest, VercelResponse } from "@vercel/node";

type ServerlessHandler = (req: VercelRequest, res: VercelResponse) => unknown;

let cached: ServerlessHandler | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!cached) {
    const mod = await import("../artifacts/api-server/dist/vercel-handler.mjs");
    cached = mod.default as ServerlessHandler;
  }
  return cached(req, res);
}
