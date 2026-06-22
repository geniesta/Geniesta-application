"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  recordRecent,
  clearRecent,
  getRecentSnapshot,
  getRecentServerSnapshot,
  subscribeRecent,
} from "@/lib/stores/recent-store";

// 詳細ページに置く：閲覧を記録するだけ（表示なし）。
export function RecordRecent({ owner, repo }: { owner: string; repo: string }) {
  useEffect(() => {
    recordRecent(owner, repo);
  }, [owner, repo]);
  return null;
}

// ホームに置く：最近見たパッケージのチップ一覧（あるときだけ）。
export function RecentViewed() {
  const t = useTranslations("home");
  const items = useSyncExternalStore(
    subscribeRecent,
    getRecentSnapshot,
    getRecentServerSnapshot,
  );
  if (items.length === 0) return null;

  return (
    <section aria-label={t("recentTitle")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("recentTitle")}</h2>
        {/* B26 履歴の消去（誤入力等で残った履歴をクリア）。 */}
        <button
          type="button"
          onClick={clearRecent}
          className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
        >
          {t("recentClear")}
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {items.map(({ owner, repo }) => (
          <li key={`${owner}/${repo}`}>
            <Link
              href={`/repos/${owner}/${repo}`}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm hover:bg-muted/60"
            >
              <span className="font-medium">{repo}</span>
              <span className="text-xs text-muted-foreground">{owner}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
