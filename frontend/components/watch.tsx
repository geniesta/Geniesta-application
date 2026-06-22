"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  toggleWatch,
  removeWatch,
  getWatchSnapshot,
  getWatchServerSnapshot,
  subscribeWatch,
} from "@/lib/stores/watch-store";
import { Button } from "@/components/ui/button";

// ウォッチのトグル（詳細ページ・カード）。localStorage と同期。
export function WatchButton({
  owner,
  repo,
  className,
}: {
  owner: string;
  repo: string;
  className?: string;
}) {
  const t = useTranslations("watch");
  const slug = `${owner}/${repo}`.toLowerCase();
  const list = useSyncExternalStore(
    subscribeWatch,
    getWatchSnapshot,
    getWatchServerSnapshot,
  );
  const on = list.includes(slug);
  return (
    <Button
      type="button"
      variant={on ? "default" : "outline"}
      size="sm"
      aria-pressed={on}
      onClick={() => toggleWatch(slug)}
      className={className}
    >
      {on ? t("watching") : t("add")}
    </Button>
  );
}

// ホームのウォッチ一覧（あるときだけ）。各項目から外せる。
export function WatchList() {
  const t = useTranslations("watch");
  const list = useSyncExternalStore(
    subscribeWatch,
    getWatchSnapshot,
    getWatchServerSnapshot,
  );
  if (list.length === 0) return null;
  return (
    <section aria-label={t("listTitle")} className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">{t("listTitle")}</h2>
      <ul className="flex flex-wrap gap-2">
        {list.map((slug) => {
          const [owner, repo] = slug.split("/");
          return (
            <li key={slug}>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background py-1 pl-3 pr-1 text-sm">
                <Link
                  href={`/repos/${owner}/${repo}`}
                  className="inline-flex items-center gap-1.5 hover:underline"
                >
                  <span className="font-medium">{repo}</span>
                  <span className="text-xs text-muted-foreground">{owner}</span>
                </Link>
                <button
                  type="button"
                  aria-label={t("remove", { repo })}
                  onClick={() => removeWatch(slug)}
                  className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10"
                >
                  ×
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
