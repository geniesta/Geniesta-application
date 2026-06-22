import { getTranslations } from "next-intl/server";
import {
  getRepo,
  getReposBatch,
  GitHubError,
  type Repo,
} from "@/lib/server/github";
import { recordEvent } from "@/lib/server/observability";
import {
  searchNpm,
  searchCrates,
  searchRubyGems,
  searchPackagist,
  searchHex,
  searchNuGet,
  searchPub,
  type RegistryPackage,
} from "@/lib/server/registries";
import {
  SOURCE_LABELS,
  GHSA_ECOSYSTEM,
  type RepoStatus,
  type SortKey,
  type OwnerPref,
} from "@/lib/search-query";
import { RepoCard } from "@/components/repo-card";
import { PackageCard } from "@/components/package-card";
import { NoResults, ErrorState } from "@/components/states";
import {
  applyRegistryFilters,
  type RegistrySource,
} from "@/components/home/shared";
import { Pagination } from "@/components/home/pagination";
import { RegistryExamples } from "@/components/home/registry-examples";
import { PopularLibraries } from "@/components/home/popular-libraries";
import { POPULAR_BY_SOURCE } from "@/lib/showcase";

function registrySearch(source: RegistrySource, q: string): Promise<RegistryPackage[]> {
  switch (source) {
    case "npm":
      return searchNpm(q);
    case "crates":
      return searchCrates(q);
    case "rubygems":
      return searchRubyGems(q);
    case "composer":
      return searchPackagist(q);
    case "hex":
      return searchHex(q);
    case "nuget":
      return searchNuGet(q);
    case "pub":
      return searchPub(q);
  }
}

// エンリッチ済み（pkg + 解決した GitHub repo）。
type Enriched = { pkg: RegistryPackage; repo: Repo | null };

// 並列数を制限して順に処理する（GitHub の二次レート制限＝同時接続過多を避ける）。
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

const REG_PAGE_SIZE = 20;

export async function RegistrySection({
  source,
  q,
  sort = "",
  owner = "org-only",
  lang = "",
  status = "all",
  license = "",
  page = 1,
  base = "",
}: {
  source: RegistrySource;
  q: string;
  sort?: SortKey;
  owner?: OwnerPref;
  lang?: string;
  status?: RepoStatus;
  license?: string;
  page?: number;
  base?: string;
}) {
  // 空クエリは検索を促す誘導。キュレーションがあるレジストリは「ライブラリから探す（例）」の
  // カテゴリ別グリッド、無ければ軽量な例示チップ。
  if (!q)
    return POPULAR_BY_SOURCE[source] ? (
      <PopularLibraries source={source} />
    ) : (
      <RegistryExamples source={source} />
    );

  const tReg = await getTranslations("registry");
  const tSearch = await getTranslations("search");
  let pkgs;
  try {
    pkgs = await registrySearch(source, q);
  } catch (e) {
    return (
      <ErrorState
        message={e instanceof Error ? e.message : tSearch("failed")}
      />
    );
  }

  // 156 検索クエリ分析：レジストリ検索も1ページ目を1回として計上（0件も記録）。
  if (page === 1) {
    recordEvent("search");
    if (pkgs.length === 0) recordEvent("search_zero");
  }

  if (pkgs.length === 0) return <NoResults q={q} src={source} />;

  // 同一 monorepo の別パッケージ（例: react / react-dom / react-is → facebook/react）は
  // 同じ GitHub リポジトリに解決され重複するため、repo キーで先勝ち重複排除する。
  // これは getRepo の呼び出し回数（＝レート消費）も大きく減らす。
  const seenRepo = new Set<string>();
  const deduped = pkgs.filter((pkg) => {
    if (!pkg.repo) return true; // repo 不明はそのまま（レジストリカード）
    const key = `${pkg.repo.owner}/${pkg.repo.repo}`.toLowerCase();
    if (seenRepo.has(key)) return false;
    seenRepo.add(key);
    return true;
  });

  // フィルタ（特に既定の「団体・企業のみ」）は GitHub の事実を要するため、候補すべてを
  // エンリッチしてから絞り込む。
  // 1) GraphQL バッチで解決済みリポジトリの事実を 1 リクエストでまとめて取得。
  const refs = deduped
    .map((p) => p.repo)
    .filter((r): r is { owner: string; repo: string } => r !== null);
  let batch = new Map<string, Repo>();
  let graphqlRateHit = false;
  try {
    batch = await getReposBatch(refs);
  } catch (e) {
    // GraphQL 全滅（未認証/レート等）。下の REST フォールバックで救済する。
    graphqlRateHit =
      e instanceof GitHubError && (e.status === 403 || e.status === 429);
  }

  // 2) バッチに無いもの（rename/不存在/GraphQL 失敗）だけ REST で補完（同時接続制限）。
  const enriched: Array<Enriched & { rateHit?: boolean }> = await mapLimit(
    deduped,
    8,
    async (pkg) => {
      if (!pkg.repo) return { pkg, repo: null };
      const hit = batch.get(`${pkg.repo.owner}/${pkg.repo.repo}`.toLowerCase());
      if (hit) return { pkg, repo: hit };
      try {
        return { pkg, repo: await getRepo(pkg.repo.owner, pkg.repo.repo) };
      } catch (e) {
        // レート制限（403/429）は縮退表示の理由として控えておく。
        const rateHit =
          e instanceof GitHubError && (e.status === 403 || e.status === 429);
        return { pkg, repo: null, rateHit };
      }
    },
  );
  const rateLimited = graphqlRateHit || enriched.some((e) => e.rateHit);

  const items = applyRegistryFilters(enriched, { owner, lang, status, license, sort });

  // 1 ページ 20 枚で分割。base は src・フィルタを含む（page 以外の現在パラメータ）。
  const totalPages = Math.max(1, Math.ceil(items.length / REG_PAGE_SIZE));
  const pageItems = items.slice((page - 1) * REG_PAGE_SIZE, page * REG_PAGE_SIZE);

  return (
    <section aria-label={tReg("resultsTitle", { label: SOURCE_LABELS[source] })} className="min-w-0">
      <h2 className="mb-1 text-lg font-semibold">
        {tReg("resultsTitle", { label: SOURCE_LABELS[source] })}
        <span className="text-sm font-normal text-muted-foreground">
          {" "}
          「{q}」
        </span>
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        {tReg("resultsNote", {
          source,
          count: items.length,
          size: REG_PAGE_SIZE,
        })}
      </p>
      {rateLimited ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {tReg("rateLimited")}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tReg("filteredEmpty")}</p>
      ) : pageItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tReg("pageEmpty")}</p>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
          {pageItems.map(({ pkg, repo }) => {
            // パッケージ文脈（エコシステム＋名前）を詳細リンクに渡す＝脆弱性パネル用。
            const eco = GHSA_ECOSYSTEM[source];
            const params = eco
              ? `eco=${eco}&pkg=${encodeURIComponent(pkg.name)}` +
                (pkg.version ? `&ver=${encodeURIComponent(pkg.version)}` : "")
              : undefined;
            return repo ? (
              <RepoCard key={pkg.id} repo={repo} params={params} />
            ) : (
              <PackageCard key={pkg.id} pkg={pkg} />
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} base={base} />
    </section>
  );
}
