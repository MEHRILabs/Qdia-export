/**
 * Images de catégories marketplace.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CATEGORY_UPLOAD_DIR = path.join(__dirname, "../uploads/category");

function safeFilename(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function saveCategoryImage(
  categoryKey: string,
  base64: string,
  ext: "jpg" | "png" | "webp" = "jpg",
): Promise<string> {
  await fs.mkdir(CATEGORY_UPLOAD_DIR, { recursive: true });
  const filename = `${safeFilename(categoryKey)}.${ext}`;
  const filepath = path.join(CATEGORY_UPLOAD_DIR, filename);
  const raw = base64.replace(/^data:image\/\w+;base64,/, "");
  await fs.writeFile(filepath, Buffer.from(raw, "base64"));
  return `/uploads/category/${filename}`;
}
