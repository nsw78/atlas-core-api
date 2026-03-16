"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

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
  "pt-BR": "Português (BR)",
  es: "Español",
};

const localeFlags: Record<Locale, string> = {
  en: "🇺🇸",
  "pt-BR": "🇧🇷",
  es: "🇪🇸",
};

const localeFlagCodes: Record<Locale, string> = {
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
    // Update HTML lang attribute
    document.documentElement.lang = newLocale === "pt-BR" ? "pt" : newLocale;
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
  const localeFlag = useCallback((loc: Locale) => localeFlagCodes[loc], []);

  // Always provide context so children never throw "useI18n must be used within I18nProvider".
  // Before mount, we use the default locale ("en") which is the same as the SSR render,
  // preventing hydration mismatch while keeping children in the tree.
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

// Premium Language Switcher Component
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, locales } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className ?? ""}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] hover:border-white/[0.1] transition-all text-sm"
      >
        <span className="text-base leading-none">{localeFlags[locale]}</span>
        <span className="text-gray-300 font-medium text-xs hidden sm:inline">{localeFlagCodes[locale]}</span>
        <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 glass-elevated rounded-xl shadow-2xl z-50 animate-scale-in overflow-hidden py-1">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => { setLocale(loc); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                locale === loc
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-gray-300 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <span className="text-base leading-none">{localeFlags[loc]}</span>
              <span className="font-medium">{localeNames[loc]}</span>
              {locale === loc && (
                <svg className="w-4 h-4 ml-auto text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
