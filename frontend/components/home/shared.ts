import { type Repo } from "@/lib/server/github";
import {
  type RepoStatus,
  type SortKey,
  type OwnerPref,
  type SearchSource,
} from "@/lib/search-query";

// npm / crates.io レジストリのパッケージ検索結果。
export type RegistrySource = Exclude<SearchSource, "github">;

// エンリッチ済み（pkg + 解決した GitHub repo）に、GitHub の事実でフィルタ／並び替えを適用する。
// フレームワーク（topic）は getRepo に無いため対象外。repo 不明のパッケージは repo 依存の
// フィルタが効いているときは落とす（分類できないため）。
export function applyRegistryFilters<T extends { repo: Repo | null }>(
  items: T[],
  f: { owner: OwnerPref; lang: string; status: RepoStatus; license: string; sort: SortKey },
): T[] {
  const repoFilterActive =
    !!f.lang || !!f.license || f.status !== "all" || f.owner === "org-only";

  let list = items.filter(({ repo }) => {
    if (!repo) return !repoFilterActive; // 分類不能：repo 依存フィルタ時は除外
    if (f.lang && (repo.language ?? "").toLowerCase() !== f.lang.toLowerCase()) {
      return false;
    }
    if (
      f.license &&
      (repo.license?.spdx_id ?? "").toLowerCase() !== f.license.toLowerCase()
    ) {
      return false;
    }
    if (f.status === "active" && repo.archived) return false;
    if (f.status === "archived" && !repo.archived) return false;
    if (f.owner === "org-only" && repo.owner.type !== "Organization") return false;
    return true;
  });

  // 並び替え（star / 最近更新）。repo 不明は末尾へ。""＝レジストリの関連度順を維持。
  if (f.sort === "stars" || f.sort === "updated") {
    const key = (e: T) =>
      !e.repo
        ? -Infinity
        : f.sort === "stars"
          ? e.repo.stargazers_count
          : Date.parse(e.repo.pushed_at);
    list = [...list].sort((a, b) => key(b) - key(a));
  }

  // 提供元「団体を優先」：団体(=0)を安定ソートで前へ（関連度の相対順は維持）。
  if (f.owner === "org-first") {
    list = [...list].sort(
      (a, b) =>
        (a.repo?.owner.type === "Organization" ? 0 : 1) -
        (b.repo?.owner.type === "Organization" ? 0 : 1),
    );
  }

  return list;
}
