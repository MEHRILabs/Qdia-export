import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(resolve(root, ".env"), "utf8").split(/\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.error("OPENAI_API_KEY manquante");
  process.exit(1);
}

const client = new OpenAI({ apiKey: key });
const model = process.env.OPENAI_IMAGE_MODEL ?? "dall-e-3";

try {
  const r = await client.images.generate({
    model,
    prompt: "Professional export catalog photo of Algerian olive oil bottle, white background",
    size: "1024x1024",
    response_format: "b64_json",
    n: 1,
  });
  const len = r.data?.[0]?.b64_json?.length ?? 0;
  console.log(`OK generate ${model}: ${len} chars base64`);
} catch (e) {
  console.error(`ERR generate ${model}:`, e.message);
}

try {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const file = new File([png], "product.png", { type: "image/png" });
  const editModel = process.env.OPENAI_IMAGE_EDIT_MODEL ?? "dall-e-2";
  const r2 = await client.images.edit({
    model: editModel,
    image: file,
    prompt: "Professional product photo on white background",
    size: "1024x1024",
    response_format: "b64_json",
  });
  const len2 = r2.data?.[0]?.b64_json?.length ?? 0;
  console.log(`OK edit ${editModel}: ${len2} chars base64`);
} catch (e) {
  console.error("ERR edit:", e.message);
}
