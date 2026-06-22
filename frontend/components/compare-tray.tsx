"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  getCompareSnapshot,
  getCompareServerSnapshot,
  removeCompare,
  clearCompare,
  subscribeCompare,
} from "@/lib/stores/compare-store";
import { Button } from "@/components/ui/button";

// 全ページ常駐の比較トレイ。選択中があるときだけ画面下部に固定表示。
export function CompareTray() {
  const t = useTranslations("compare");
  const list = useSyncExternalStore(
    subscribeCompare,
    getCompareSnapshot,
    getCompareServerSnapshot,
  );
  if (list.length === 0) return null;

  const href = `/compare?repos=${encodeURIComponent(list.join(","))}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] backdrop-blur">
      <div
        role="region"
        aria-label={t("trayLabel")}
        className="mx-auto flex max-w-5xl flex-wrap items-center gap-2"
      >
        <span className="text-sm font-semibold">{t("trayCount", { n: list.length })}</span>
        <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {list.map((slug) => (
            <li key={slug}>
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pl-2.5 pr-1 text-xs">
                {slug}
                <button
                  type="button"
                  aria-label={t("removeFrom", { slug })}
                  onClick={() => removeCompare(slug)}
                  className="ml-0.5 flex size-5 items-center justify-center rounded-full hover:bg-foreground/10"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={clearCompare}
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          {t("clear")}
        </button>
        <Button asChild size="sm" disabled={list.length < 2}>
          {list.length < 2 ? (
            <span aria-disabled className="opacity-60">
              {t("view")}
            </span>
          ) : (
            <Link href={href}>{t("view")} →</Link>
          )}
        </Button>
      </div>
    </div>
  );
}
