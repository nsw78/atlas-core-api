"use client";

import { useI18n } from "@/i18n";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">{t("errorPage.somethingWentWrong")}</h2>
        <p className="text-sm text-gray-400 mb-4">
          {error.message || t("errorPage.unexpectedError")}
        </p>
        {error.digest && (
          <p className="text-xs text-gray-600 mb-4 font-mono">{t("errorPage.errorId", { id: error.digest })}</p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition-colors"
          >
            {t("errorPage.tryAgain")}
          </button>
          <a
            href="/login"
            className="px-6 py-2.5 bg-white/[0.06] text-gray-300 text-sm font-medium rounded-xl hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
          >
            {t("errorPage.goToLogin")}
          </a>
        </div>
      </div>
    </div>
  );
}
