import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "../src/locales");

const fr = JSON.parse(fs.readFileSync(path.join(localesDir, "fr.json"), "utf8"));

const enOverlay = JSON.parse(fs.readFileSync(path.join(localesDir, "en.overlay.json"), "utf8"));
const arOverlay = JSON.parse(fs.readFileSync(path.join(localesDir, "ar.overlay.json"), "utf8"));

function deepMerge(base, overlay) {
  const out = { ...base };
  for (const key of Object.keys(overlay)) {
    const val = overlay[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      out[key] = deepMerge(out[key] ?? {}, val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

function buildLocale(overlay) {
  return deepMerge(fr, overlay);
}

fs.writeFileSync(path.join(localesDir, "en.json"), JSON.stringify(buildLocale(enOverlay), null, 2) + "\n");
fs.writeFileSync(path.join(localesDir, "ar.json"), JSON.stringify(buildLocale(arOverlay), null, 2) + "\n");
console.log("Synced en.json and ar.json from fr.json + overlays");
