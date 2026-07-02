import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type Locale, t, isRtl } from "@/lib/i18n";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  tr: (key: string) => string;
  rtl: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem("qdia_locale") as Locale | null;
    return saved && ["fr", "en", "ar"].includes(saved) ? saved : "fr";
  });

  const setLocale = (l: Locale) => {
    localStorage.setItem("qdia_locale", l);
    setLocaleState(l);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
  }, [locale]);

  return (
    <I18nContext.Provider value={{
      locale,
      setLocale,
      tr: (key) => t(locale, key),
      rtl: isRtl(locale),
    }}>
      {children}
    </I18nContext.Provider>
  );
}

function readSavedLocale(): Locale {
  try {
    const saved = localStorage.getItem("qdia_locale") as Locale | null;
    return saved && ["fr", "en", "ar"].includes(saved) ? saved : "fr";
  } catch {
    return "fr";
  }
}

function fallbackI18n(): I18nContextValue {
  const locale = readSavedLocale();
  return {
    locale,
    setLocale: () => {},
    tr: (key) => t(locale, key),
    rtl: isRtl(locale),
  };
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  return ctx ?? fallbackI18n();
}
