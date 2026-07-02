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

/** English full mirror — merged on top of fr, then legacy en wins on overlap */
const enFull = deepMerge(fr, JSON.parse(fs.readFileSync(path.join(dir, "en.full.json"), "utf8")));
const en = deepMerge(deepMerge(fr, enFull), legacyEn);

/** Arabic full mirror */
const arFull = deepMerge(fr, JSON.parse(fs.readFileSync(path.join(dir, "ar.full.json"), "utf8")));
const ar = deepMerge(deepMerge(fr, arFull), legacyAr);

fs.writeFileSync(path.join(dir, "en.json"), JSON.stringify(en, null, 2) + "\n");
fs.writeFileSync(path.join(dir, "ar.json"), JSON.stringify(ar, null, 2) + "\n");
console.log("Built en.json and ar.json");
