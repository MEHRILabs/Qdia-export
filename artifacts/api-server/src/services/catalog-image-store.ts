import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** dist/ → ../uploads/catalog (aligné avec express.static dans app.ts) */
export const CATALOG_UPLOAD_DIR = path.join(__dirname, "../uploads/catalog");

function safeFilename(masterId: string): string {
  return masterId.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Enregistre une image base64 sur disque → URL publique /uploads/catalog/… */
export async function saveCatalogImage(
  masterId: string,
  base64: string,
  ext: "jpg" | "png" | "webp" = "jpg",
): Promise<string> {
  await fs.mkdir(CATALOG_UPLOAD_DIR, { recursive: true });
  const filename = `${safeFilename(masterId)}.${ext}`;
  const filepath = path.join(CATALOG_UPLOAD_DIR, filename);
  const raw = base64.replace(/^data:image\/\w+;base64,/, "");
  await fs.writeFile(filepath, Buffer.from(raw, "base64"));
  return `/uploads/catalog/${filename}`;
}

/** Enregistre un SVG catalogue (ex. visuel Claude) */
export async function saveCatalogSvg(masterId: string, svg: string): Promise<string> {
  await fs.mkdir(CATALOG_UPLOAD_DIR, { recursive: true });
  const filename = `${safeFilename(masterId)}.svg`;
  const filepath = path.join(CATALOG_UPLOAD_DIR, filename);
  const body = svg.trim().startsWith("<?xml") ? svg : `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`;
  await fs.writeFile(filepath, body, "utf8");
  return `/uploads/catalog/${filename}`;
}

/** Placeholder SVG si aucune clé IA image (nom produit visible) */
export async function saveCatalogPlaceholder(masterId: string, productName: string): Promise<string> {
  await fs.mkdir(CATALOG_UPLOAD_DIR, { recursive: true });
  const filename = `${safeFilename(masterId)}.svg`;
  const filepath = path.join(CATALOG_UPLOAD_DIR, filename);
  const label = productName.slice(0, 40).replace(/[<>&"]/g, "");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#f5f0e8"/>
  <rect x="48" y="48" width="416" height="416" rx="24" fill="#fff" stroke="#1a4d2e" stroke-width="4"/>
  <text x="256" y="240" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" fill="#0461A5" font-weight="bold">QDIA Photo</text>
  <text x="256" y="280" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#555">${label}</text>
  <text x="256" y="320" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="#888">Photo IA à générer</text>
</svg>`;
  await fs.writeFile(filepath, svg, "utf8");
  return `/uploads/catalog/${filename}`;
}
