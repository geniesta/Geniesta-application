import { getTranslations } from "next-intl/server";
import { searchRepositories } from "@/lib/server/github";
import { RepoCard } from "@/components/repo-card";

// 関連ライブラリ＝そのエコシステム(topic)の人気リポジトリ（star 順）。
// 「一緒によく使われる」の厳密な共起データは GitHub に無いため、topic×人気を目安として提示する。
// 精度向上（C26）: アーカイブを除外し（archived:false）、同一オーナーの重複を1件に間引き、
// エコシステム本体を除いて多様性を確保する。
export async function RelatedLibraries({
  topic,
  label,
}: {
  topic: string;
  label: string;
}) {
  let items;
  try {
    // 母数を多めに取り（30件）、後段の除外・重複排除でも 6 件残るようにする。
    const data = await searchRepositories(`topic:${topic} archived:false`, {
      sort: "stars",
      perPage: 30,
    });
    items = data.items;
  } catch {
    // 関連はベストエフォート。失敗してもメインの結果は壊さない。
    return null;
  }

  // エコシステム本体（名前がそのもの）を除外し、同一オーナーは先頭1件に間引く（多様性）。
  const seenOwner = new Set<string>();
  items = items
    .filter(
      (r) =>
        r.name.toLowerCase() !== topic &&
        r.name.toLowerCase() !== label.toLowerCase(),
    )
    .filter((r) => {
      const o = r.owner.login.toLowerCase();
      if (seenOwner.has(o)) return false;
      seenOwner.add(o);
      return true;
    })
    .slice(0, 6);
  if (items.length === 0) return null;

  const t = await getTranslations("search");
  return (
    <section aria-label={t("relatedRegion")} className="mt-10 border-t pt-8">
      <h2 className="text-lg font-semibold">{t("relatedHeading", { label })}</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        {t("relatedNote", { topic })}
      </p>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
        {items.map((repo) => (
          <RepoCard key={repo.id} repo={repo} mode="search" />
        ))}
      </div>
    </section>
  );
}

export function RelatedSkeleton() {
  return (
    <section className="mt-10 border-t pt-8" aria-busy="true">
      <div className="mb-4 h-6 w-72 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </section>
  );
}
