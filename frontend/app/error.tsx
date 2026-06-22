"use client";

// アプリ全体のエラー境界（RSC/レンダリングで投げられた例外を捕捉）。
// レイアウト内に描画されるため next-intl の Provider が使え、サイドバーは保持される。

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // instrumentation.ts の onRequestError がサーバー側を拾う。ここは可視化のみ。
    console.error(error);
  }, [error]);

  const t = useTranslations("errors");
  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 lg:px-10">
      <div
        role="alert"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        <h1 className="text-lg font-semibold">{t("appErrorTitle")}</h1>
        <p className="mt-1 text-sm">{t("appErrorBody")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {t("retry")}
          </button>
          <Link
            href="/"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("home")}
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-amber-800/80 dark:text-amber-300/80">
            ref: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
