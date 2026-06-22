"use client";

// 詳細ページ専用のエラー境界。多数の外部照会のいずれかが致命的に失敗した場合に、
// 真っ白でなく「再試行／検索へ戻る」を出す。一覧・サイドバーは保持される。

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function RepoDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const t = useTranslations("errors");
  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <div
        role="alert"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        <h1 className="text-lg font-semibold">{t("detailErrorTitle")}</h1>
        <p className="mt-1 text-sm">{t("detailErrorBody")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {t("retry")}
          </button>
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            {t("search")}
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
