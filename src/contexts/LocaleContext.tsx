import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { syncI18nLanguage } from "@/i18n/index";

export type AppLocale = "en" | "hu" | "sk";

const STORAGE_KEY = "pharmacy_app_language";

export const localeLabels: Record<AppLocale, string> = {
  en: "English",
  hu: "Magyar",
  sk: "Slovenčina",
};

export const supportedLocales: AppLocale[] = ["en", "hu", "sk"];

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
};

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<AppLocale>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "hu" || stored === "sk" || stored === "en") return stored;
    return "en";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    syncI18nLanguage(locale);
  }, [locale]);

  const setLocale = useCallback((value: AppLocale) => {
    setLocaleState(value);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
};
