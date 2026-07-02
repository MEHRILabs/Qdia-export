export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export function detectImageMime(base64: string): ImageMime {
  const raw = stripDataUrlPrefix(base64);
  let buf: Buffer;
  try {
    buf = Buffer.from(raw.slice(0, 32), "base64");
  } catch {
    return "image/jpeg";
  }
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (buf.length >= 3 && buf.toString("ascii", 0, 3) === "GIF") {
    return "image/gif";
  }
  return "image/jpeg";
}

export function stripDataUrlPrefix(input: string): string {
  return input.replace(/^data:image\/[\w+.-]+;base64,/, "").trim();
}

export function normalizeImageBase64(input: string): { data: string; mimeType: ImageMime } {
  const match = input.match(/^data:(image\/[\w+.-]+);base64,(.+)$/s);
  if (match) {
    const mime = match[1] as ImageMime;
    const allowed: ImageMime[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    return {
      data: match[2],
      mimeType: allowed.includes(mime) ? mime : detectImageMime(match[2]),
    };
  }
  const data = stripDataUrlPrefix(input);
  return { data, mimeType: detectImageMime(data) };
}

export function toDataUrl(base64: string, mimeType?: ImageMime): string {
  const { data, mimeType: detected } = normalizeImageBase64(base64);
  const mime = mimeType ?? detected;
  return `data:${mime};base64,${data}`;
}
