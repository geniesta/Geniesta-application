"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  getCompareSnapshot,
  getCompareServerSnapshot,
  toggleCompare,
  subscribeCompare,
  COMPARE_MAX,
} from "@/lib/stores/compare-store";
import { Button } from "@/components/ui/button";

// 比較リストへの追加/削除トグル。localStorage と同期し、トレイと連動する。
export function CompareButton({
  owner,
  repo,
  className,
}: {
  owner: string;
  repo: string;
  className?: string;
}) {
  const t = useTranslations("compare");
  const slug = `${owner}/${repo}`.toLowerCase();
  const list = useSyncExternalStore(
    subscribeCompare,
    getCompareSnapshot,
    getCompareServerSnapshot,
  );
  const selected = list.includes(slug);
  const full = !selected && list.length >= COMPARE_MAX;

  return (
    <Button
      type="button"
      variant={selected ? "default" : "outline"}
      size="sm"
      aria-pressed={selected}
      disabled={full}
      title={full ? t("full", { max: COMPARE_MAX }) : undefined}
      onClick={() => toggleCompare(slug)}
      className={className}
    >
      {selected ? t("btnSelected") : full ? t("btnFull") : t("btnAdd")}
    </Button>
  );
}
