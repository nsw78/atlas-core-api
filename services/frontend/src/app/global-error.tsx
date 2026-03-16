"use client";

import en from "@/i18n/locales/en.json";
import ptBR from "@/i18n/locales/pt-BR.json";
import es from "@/i18n/locales/es.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const translations: Record<string, any> = { en, "pt-BR": ptBR, es };

function getStoredLocale(): string {
  try {
    if (typeof window !== "undefined") {
      return localStorage.getItem("atlas-locale") || "en";
    }
  } catch {}
  return "en";
}

function gt(key: string): string {
  const locale = getStoredLocale();
  const keys = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let val: any = translations[locale] || translations.en;
  for (const k of keys) {
    val = val?.[k];
  }
  if (typeof val === "string") return val;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fallback: any = translations.en;
  for (const k of keys) {
    fallback = fallback?.[k];
  }
  return typeof fallback === "string" ? fallback : key;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">{gt("errorPage.somethingWentWrong")}</h2>
          <p className="text-sm text-gray-400 mb-6">
            {error.message || gt("errorPage.unexpectedError")}
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition-colors"
          >
            {gt("errorPage.tryAgain")}
          </button>
        </div>
      </body>
    </html>
  );
}
