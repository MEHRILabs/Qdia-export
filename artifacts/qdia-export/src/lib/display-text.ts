/** Corrige les caractères accentués perdus lors d'imports CSV/Excel (é → ?). */
export function fixEncoding(text: string): string {
  return text
    .replace(/Alg\?rie/gi, "Algérie")
    .replace(/B\?ja\?a/gi, "Béjaïa")
    .replace(/\bunit\?s?\b/gi, "unité")
    .replace(/\blit\?re?s?\b/gi, (m) => (m.toLowerCase().endsWith("s") ? "litres" : "litre"));
}

const UNIT_I18N_KEYS: Record<string, string> = {
  unité: "common.unit",
  unite: "common.unit",
  unit: "common.unit",
  units: "common.unit",
  pièce: "common.unit",
  piece: "common.unit",
  pièces: "common.unit",
  pieces: "common.unit",
};

/** Libellé d'unité pour affichage (prix / MOQ) — évite les « unit? » de la base. */
export function formatUnitLabel(
  raw: string | null | undefined,
  tr: (key: string) => string,
): string {
  if (!raw) return tr("common.unit");
  const cleaned = fixEncoding(raw).replace(/^per\s+/i, "").trim();
  if (!cleaned || cleaned.includes("?")) return tr("common.unit");
  const key = UNIT_I18N_KEYS[cleaned.toLowerCase()];
  if (key) return tr(key);
  return cleaned;
}

/** Localisation fournisseur / origine avec repli i18n. */
export function formatLocation(
  raw: string | null | undefined,
  tr: (key: string) => string,
): string {
  if (!raw) return tr("common.algeria");
  const fixed = fixEncoding(raw).trim();
  if (/algérie|algerie|algeria/i.test(fixed)) return tr("common.algeria");
  return fixed;
}
