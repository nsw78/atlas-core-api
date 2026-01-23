"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";
import es from "./locales/es.json";

export type Locale = "en" | "pt-BR" | "es";

type TranslationValue = string | { [key: string]: TranslationValue };
type Translations = { [key: string]: TranslationValue };

const translations: Record<Locale, Translations> = {
  en,
  "pt-BR": ptBR,
  es,
};

const localeNames: Record<Locale, string> = {
  en: "English",
  "pt-BR": "Portugues (BR)",
  es: "Espanol",
};

const localeFlags: Record<Locale, string> = {
  en: "US",
  "pt-BR": "BR",
  es: "ES",
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locales: Locale[];
  localeName: (locale: Locale) => string;
  localeFlag: (locale: Locale) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = "atlas-locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && translations[stored]) {
      setLocaleState(stored);
    } else {
      // Detect browser language
      const browserLang = navigator.language;
      if (browserLang.startsWith("pt")) {
        setLocaleState("pt-BR");
      } else if (browserLang.startsWith("es")) {
        setLocaleState("es");
      }
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split(".");
      let value: TranslationValue | undefined = translations[locale];

      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = (value as Translations)[k];
        } else {
          // Fallback to English
          value = translations.en;
          for (const fallbackKey of keys) {
            if (value && typeof value === "object" && fallbackKey in value) {
              value = (value as Translations)[fallbackKey];
            } else {
              return key; // Return key if not found
            }
          }
          break;
        }
      }

      if (typeof value !== "string") {
        return key;
      }

      // Replace parameters
      if (params) {
        let result = value;
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          result = result.replace(new RegExp(`{{${paramKey}}}`, "g"), String(paramValue));
        });
        return result;
      }

      return value;
    },
    [locale]
  );

  const localeName = useCallback((loc: Locale) => localeNames[loc], []);
  const localeFlag = useCallback((loc: Locale) => localeFlags[loc], []);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        locales: ["en", "pt-BR", "es"],
        localeName,
        localeFlag,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

// Language Switcher Component
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, locales, localeName, localeFlag } = useI18n();

  return (
    <div className={`relative ${className ?? ""}`}>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="appearance-none bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeFlag(loc)} {localeName(loc)}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
