/**
 * Traitement image catalogue : fond clair, carré 1024, filigrane QDIA, JPEG.
 * sharp optionnel (externe esbuild). Pas de rembg Python — fond blanc via contain.
 */
import { logger } from "../lib/logger";

const SIZE = 1024;
const JPEG_QUALITY = 82;

export interface ProcessedImage {
  base64: string;
  mime: "image/jpeg";
  bytes: number;
}

async function loadSharp(): Promise<typeof import("sharp") | null> {
  try {
    return await import("sharp");
  } catch {
    return null;
  }
}

/** Carré 1024 fond blanc, filigrane, compression. */
export async function processCatalogPhoto(
  inputBase64: string,
  _productName?: string,
): Promise<ProcessedImage | null> {
  const sharpMod = await loadSharp();
  const raw = Buffer.from(inputBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  if (raw.byteLength < 4000) return null;

  if (!sharpMod) {
    logger.warn("sharp indisponible — image brute conservée");
    return {
      base64: raw.toString("base64"),
      mime: "image/jpeg",
      bytes: raw.byteLength,
    };
  }

  const sharp = sharpMod.default;
  try {
    // flatten = retire transparence (fond blanc) ; contain = packshot centré
    const prepared = await sharp(raw)
      .rotate()
      .ensureAlpha()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize(SIZE, SIZE, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    const watermarkSvg = Buffer.from(`
      <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${SIZE - 210}" y="${SIZE - 56}" width="190" height="36" rx="8"
          fill="rgba(255,255,255,0.72)"/>
        <text x="${SIZE - 24}" y="${SIZE - 30}" text-anchor="end"
          font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700"
          fill="rgba(4,97,165,0.55)">QDIA Export</text>
      </svg>
    `);

    const out = await sharp(prepared)
      .composite([{ input: watermarkSvg, gravity: "southeast" }])
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    return { base64: out.toString("base64"), mime: "image/jpeg", bytes: out.byteLength };
  } catch (err) {
    logger.warn({ err }, "processCatalogPhoto échoué");
    return null;
  }
}
