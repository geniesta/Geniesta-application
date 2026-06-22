import { getTranslations } from "next-intl/server";
import { searchRepositories, GitHubError } from "@/lib/server/github";
import { recordEvent } from "@/lib/server/observability";
import {
  applyOwnerPreference,
  type SortKey,
  type OwnerPref,
} from "@/lib/search-query";
import { RepoCard } from "@/components/repo-card";
import { NoResults, ErrorState } from "@/components/states";
import { Pagination } from "@/components/home/pagination";

export async function Results({
  q,
  sort,
  owner,
  page,
  base,
}: {
  q: string;
  sort: SortKey;
  owner: OwnerPref;
  page: number;
  base: string;
}) {
  const ts = await getTranslations("search");
  let data;
  try {
    data = await searchRepositories(q, { sort, perPage: 30, page });
  } catch (e) {
    return (
      <ErrorState
        message={e instanceof GitHubError ? e.message : ts("failed")}
      />
    );
  }
  const items = applyOwnerPreference(data.items, owner);

  // 156 検索クエリ分析：1ページ目のみ検索1回として計上、GitHub の総件数0を0件として記録。
  if (page === 1) {
    recordEvent("search");
    if (data.total_count === 0) recordEvent("search_zero");
  }

  if (items.length === 0) {
    return page > 1 ? (
      <p className="text-sm text-muted-foreground">{ts("pageEmpty")}</p>
    ) : (
      <NoResults q={q} />
    );
  }

  // GitHub の検索結果は最大 1000 件までアクセス可能（page * per_page ≤ 1000）。
  const totalPages = Math.min(
    Math.ceil(Math.min(data.total_count, 1000) / 30),
    33,
  );

  return (
    <>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
        {items.map((repo) => (
          <RepoCard key={repo.id} repo={repo} />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} base={base} />
    </>
  );
}
