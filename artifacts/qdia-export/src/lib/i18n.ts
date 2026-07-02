import fr from "@/locales/fr.json";
import en from "@/locales/en.json";
import ar from "@/locales/ar.json";

export type Locale = "fr" | "en" | "ar";

type Dict = Record<string, unknown>;

const dict: Record<Locale, Dict> = { fr, en, ar };

function getNested(obj: Dict, path: string): string | undefined {
  const val = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Dict)) {
      return (acc as Dict)[key];
    }
    return undefined;
  }, obj);
  return typeof val === "string" ? val : undefined;
}

export function t(locale: Locale, key: string): string {
  return getNested(dict[locale], key) ?? getNested(dict.fr, key) ?? key;
}

export function isRtl(locale: Locale) {
  return locale === "ar";
}

/** @deprecated use dot-notation keys e.g. nav.catalog */
export type TranslationKey = string;
