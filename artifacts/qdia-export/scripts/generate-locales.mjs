import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../src/locales");

const fr = JSON.parse(fs.readFileSync(path.join(dir, "fr.json"), "utf8"));
const legacyEn = JSON.parse(fs.readFileSync(path.join(dir, "en.json"), "utf8"));
const legacyAr = JSON.parse(fs.readFileSync(path.join(dir, "ar.json"), "utf8"));

function deepMerge(a, b) {
  const out = { ...a };
  for (const k of Object.keys(b ?? {})) {
    const v = b[k];
    if (v && typeof v === "object" && !Array.isArray(v)) out[k] = deepMerge(out[k] ?? {}, v);
    else out[k] = v;
  }
  return out;
}

function unflatten(flat) {
  const out = {};
  for (const [p, val] of Object.entries(flat)) {
    const parts = p.split(".");
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] ?? {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = val;
  }
  return out;
}

/** English strings for keys missing from legacy locale files */
const enFlat = JSON.parse(fs.readFileSync(path.join(dir, "en.translated.json"), "utf8"));
const arFlat = JSON.parse(fs.readFileSync(path.join(dir, "ar.translated.json"), "utf8"));

const en = deepMerge(deepMerge(fr, unflatten(enFlat)), legacyEn);
const ar = deepMerge(deepMerge(fr, unflatten(arFlat)), legacyAr);

fs.writeFileSync(path.join(dir, "en.json"), JSON.stringify(en, null, 2) + "\n");
fs.writeFileSync(path.join(dir, "ar.json"), JSON.stringify(ar, null, 2) + "\n");
console.log("Generated en.json and ar.json");
