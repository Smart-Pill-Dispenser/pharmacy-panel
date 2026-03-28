import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { hu } from "./locales/hu";
import { sk } from "./locales/sk";

const STORAGE_KEY = "pharmacy_app_language";

export type AppI18nLang = "en" | "hu" | "sk";

function initialLanguage(): AppI18nLang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "en" || v === "hu" || v === "sk") return v;
  } catch {
    /* non-fatal */
  }
  return "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hu: { translation: hu },
    sk: { translation: sk },
  },
  lng: initialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function syncI18nLanguage(locale: AppI18nLang): void {
  void i18n.changeLanguage(locale);
  try {
    document.documentElement.lang = locale;
    document.title = i18n.t("app.documentTitle");
  } catch {
    /* ignore */
  }
}

export default i18n;
