import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Suspense } from "react";
import {
  buildSearchQuery,
  parseScopedQuery,
  detectEcosystem,
  LANGUAGES,
  type RepoStatus,
  type SortKey,
  type OwnerPref,
  type SearchSource,
} from "@/lib/search-query";
import { FEATURED_ORGS } from "@/lib/showcase";
import { SearchBar } from "@/components/search-bar";
import { SourceTabs } from "@/components/source-tabs";
import { Filters } from "@/components/filters";
import { ExploreEcosystems } from "@/components/explore-ecosystems";
import { RecentViewed } from "@/components/recent-viewed";
import { WatchList } from "@/components/watch";
import { ResultsSkeleton } from "@/components/states";
import { Card, CardContent } from "@/components/ui/card";
import { Results } from "@/components/home/results";
import { RegistrySection } from "@/components/home/registry-section";
import {
  RelatedLibraries,
  RelatedSkeleton,
} from "@/components/home/related-libraries";

// バイブコーダー（AI 任せに作る人）が AI によく勧められる定番を例示。
// create-react-app は身近かつ 2025 年に公式非推奨化された「後継へ移行」の実例。
const EXAMPLES = ["supabase", "next.js", "tailwind", "create-react-app"];

type SP = {
  q?: string;
  src?: string;
  owner?: string;
  lang?: string;
  status?: string;
  license?: string;
  framework?: string;
  sort?: string;
  page?: string;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const source = (sp.src as SearchSource) ?? "github";

  // C30 スコープ構文：検索窓の `lang:` `license:` `status:` を抽出し、URL のフィルタより優先。
  // 検索窓の表示・URL は入力どおり（query）を保ち、実際の検索にはクリーンな語（cleanQuery）を使う。
  const scoped = parseScopedQuery(query);
  const cleanQuery = scoped.text;

  const filters = {
    q: cleanQuery,
    lang: scoped.lang ?? sp.lang ?? "",
    status: scoped.status ?? (sp.status as RepoStatus) ?? "all",
    license: scoped.license ?? sp.license ?? "",
    framework: sp.framework ?? "",
  };
  const sort = (sp.sort ?? "") as SortKey;
  // 既定は「団体・企業のみ（org-only）」＝信頼ファクト探索の主対象を組織所有リポに絞る。
  // 個人リポを見たい場合はフィルタで「すべて/団体優先」に切り替えられる。
  const owner = (sp.owner as OwnerPref) ?? "org-only";
  const regOwner = (sp.owner as OwnerPref) ?? "org-only";
  const ghQuery = buildSearchQuery(filters);
  const ecosystem = detectEcosystem(cleanQuery);

  // キーワードが空でも、フィルター（言語など）だけで検索が成立するようにする。
  const active = ghQuery.trim() !== "";
  // 検索前のクリーンなホーム＝Snyk 風の「エコシステムから探す」グリッドを出す状態。
  // このときヒーローはタブ・説明を省き検索のみ（探索口はグリッドへ集約）。
  const showExplore = !active && source === "github";
  const langName = LANGUAGES.find(([v]) => v === filters.lang)?.[1];
  const heading = cleanQuery || langName || ghQuery;

  // ページネーション。page 以外の現在パラメータを引き継ぐ base を作る。
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const pageBase = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page" || !v) continue;
    pageBase.set(k, String(v));
  }
  const base = pageBase.toString();

  const t = await getTranslations("search");
  const th = await getTranslations("home");
  const tc = await getTranslations("card");
  return (
    <main id="main" className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-6 py-5 sm:py-8 lg:px-10">
      <section
        aria-label={t("role")}
        // モバイルは余白を詰める（ヒーローが画面を占有してランキングカードが見えない問題の緩和）。
        // ライト＝明るい emerald＋濃緑文字／ダーク＝深い emerald＋明るい文字（眩しさを抑える）。
        className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500 p-5 text-emerald-950 sm:mb-6 sm:p-8 dark:from-emerald-800 dark:via-emerald-900 dark:to-teal-900 dark:text-emerald-50"
      >
        <span className="mb-3 inline-block rounded-full border border-emerald-950/15 bg-white/40 px-3 py-1 text-xs font-semibold dark:border-white/15 dark:bg-white/10">
          {t("badge")}
        </span>
        <h1 className="mb-2 text-2xl font-bold">{t("heroTitle")}</h1>
        <p className="mb-4 max-w-lg text-sm text-emerald-950/80 dark:text-emerald-50/80">{t("heroSubtitle")}</p>
        {/* key にクエリを使い、検索語が変わったら入力欄を確実に同期（前の語が残らない） */}
        <SearchBar key={query} initial={query} src={source} />
        {/* クリーンなホームではタブ・説明を省き、本文の探索グリッドへ集約（Snyk 風）。 */}
        {!showExplore ? (
          <>
            <SourceTabs src={source} />
            {source === "github" ? (
              <>
                <p className="mt-3 text-sm text-emerald-950/80 dark:text-emerald-50/80">{t("githubLead")}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-emerald-950/80 dark:text-emerald-50/80">
                  {t("try")}
                  {EXAMPLES.map((ex) => (
                    <Link
                      key={ex}
                      href={`/?q=${encodeURIComponent(ex)}`}
                      className="rounded-full border border-emerald-950/15 bg-white/40 px-3 py-1 font-medium text-emerald-950 dark:border-white/15 dark:bg-white/10 dark:text-emerald-50"
                    >
                      {ex}
                    </Link>
                  ))}
                </div>
                {/* C30/B20 スコープ構文のヒント（見落とされやすいので少し強める＋枠で囲む）。 */}
                <p className="mt-2 inline-block rounded-lg bg-white/40 px-2.5 py-1 text-xs text-emerald-950 dark:bg-white/10 dark:text-emerald-50">
                  {t("scopedHint")}
                </p>
              </>
            ) : null}
          </>
        ) : null}
      </section>

      {source !== "github" ? (
        query ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px] xl:items-start">
            <section aria-label={t("results")} className="min-w-0">
              <Suspense
                key={`reg-${source}-${query}-${sort}-${regOwner}-${filters.lang}-${filters.status}-${filters.license}-${page}`}
                fallback={<ResultsSkeleton />}
              >
                <RegistrySection
                  source={source}
                  q={cleanQuery}
                  sort={sort}
                  owner={regOwner}
                  lang={filters.lang}
                  status={filters.status}
                  license={filters.license}
                  page={page}
                  base={base}
                />
              </Suspense>
            </section>

            {/* レジストリ結果も GitHub の事実でフィルタ（提供元/状態/並び替え/言語/ライセンス）。 */}
            <div className="xl:sticky xl:top-6">
              <Filters
                src={source}
                registry
                q={query}
                owner={regOwner}
                lang={filters.lang}
                status={filters.status}
                license={filters.license}
                framework=""
                sort={sort}
              />
            </div>
          </div>
        ) : (
          <Suspense key={`reg-${source}`} fallback={<ResultsSkeleton />}>
            <RegistrySection source={source} q="" />
          </Suspense>
        )
      ) : active ? (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px] xl:items-start">
            <section aria-label={t("results")} className="min-w-0">
              <h2 className="mb-4 text-lg font-semibold">
                {t("results")}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  「{heading}」
                </span>
              </h2>
              <Suspense
                key={ghQuery + sort + owner + page}
                fallback={<ResultsSkeleton />}
              >
                <Results
                  q={ghQuery}
                  sort={sort}
                  owner={owner}
                  page={page}
                  base={base}
                />
              </Suspense>
            </section>

            {/* フィルターは右（モック準拠）。狭い画面では結果の下に回り込む。 */}
            <div className="xl:sticky xl:top-6">
              <Filters
                q={query}
                owner={owner}
                lang={filters.lang}
                status={filters.status}
                license={filters.license}
                framework={filters.framework}
                sort={sort}
              />
            </div>
          </div>

          {/* 検索語が既知エコシステムなら、関連ライブラリ（topic を star 順）を併載 */}
          {ecosystem ? (
            <Suspense key={`eco-${ecosystem.topic}`} fallback={<RelatedSkeleton />}>
              <RelatedLibraries
                topic={ecosystem.topic}
                label={ecosystem.label}
              />
            </Suspense>
          ) : null}
        </>
      ) : (
        <div className="space-y-12">
          <WatchList />

          <RecentViewed />

          <ExploreEcosystems />

          <section aria-label={th("orgsTitle")}>
            <h2 className="mb-1 text-lg font-semibold">{th("orgsTitle")}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{th("orgsDesc")}</p>
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]">
              {FEATURED_ORGS.map(([login, name, id]) => (
                <Link
                  key={login}
                  href={`/?q=${encodeURIComponent(`org:${login}`)}`}
                  className="group block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Card className="transition group-hover:shadow-md group-hover:ring-foreground/20">
                    <CardContent className="flex items-center gap-3">
                      <Image
                        src={`https://avatars.githubusercontent.com/u/${id}?s=64&v=4`}
                        alt={tc("ownerIconAlt", { owner: name })}
                        width={36}
                        height={36}
                        unoptimized
                        className="rounded-lg"
                      />
                      <span className="truncate font-semibold">{name}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
