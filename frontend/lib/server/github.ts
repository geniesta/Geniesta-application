import "server-only";
// GitHub REST API クライアント（サーバー側専用）。
// token は GITHUB_TOKEN（環境変数・サーバー側のみ）。未設定でも 60req/h で動くが、
// 認証ありで 5,000req/h・検索 30req/min になる。クライアントには絶対に露出しない。

import { unstable_cache } from "next/cache";
import {
  tracked,
  recordGithubRate,
  observeRateHeaders,
  noteHttpIssue,
} from "@/lib/server/observability";

// GitHub API のベース URL。既定は本番。テスト（e2e）では GITHUB_API_BASE で
// モックサーバへ差し替え、決定的・トークンレスに回せる seam にする。REST/GraphQL 共通。
const GH = process.env.GITHUB_API_BASE ?? "https://api.github.com";

function ghHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// リポジトリ型はドメイン層（lib/types）が所有する。ゲートウェイ（このファイル）は外部 JSON を
// この型へマッピングして返すだけ。ローカルで使うため import し、後方互換のため再 export する
// （UI/ページは従来どおり @/lib/server/github から型を取れる＝外側→内側の依存は許容）。
import type { RepoOwner, RepoLicense, Repo, SearchResult } from "@/lib/types";
export type { RepoOwner, RepoLicense, Repo, SearchResult };

/** GitHub API のエラー（status を保持） */
export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

async function ghMessage(res: Response): Promise<string> {
  if (res.status === 403 || res.status === 429) {
    return "GitHub API のレート制限に達しました。しばらく待つか、GITHUB_TOKEN を設定してください。";
  }
  try {
    const body = (await res.json()) as { message?: string };
    return body?.message ?? `GitHub API エラー (${res.status})`;
  } catch {
    return `GitHub API エラー (${res.status})`;
  }
}

// レート残枠ヘッダを観測（REST/GraphQL 共通）。
function observeRate(res: Response, source: string): void {
  // 源ごとの残枠を一元管理（112）。GitHub は REST/GraphQL で枠が別なので個別に記録。
  observeRateHeaders(source, res.headers);
  // 後方互換: トップバー等が参照する github 残枠は REST の値で代表させる。
  if (source === "github-rest") {
    const rem = res.headers.get("x-ratelimit-remaining");
    const lim = res.headers.get("x-ratelimit-limit");
    if (rem != null && lim != null) recordGithubRate(Number(rem), Number(lim));
  }
}

async function ghFetch(path: string, revalidate: number): Promise<Response> {
  return tracked("github-rest", async () => {
    const res = await fetch(`${GH}${path}`, {
      headers: ghHeaders(),
      next: { revalidate },
    });
    observeRate(res, "github-rest");
    // 呼び出し側は Response を期待するため throw せず、!ok は計測に反映するのみ。
    // ただし 404 は「リソース不在＝事実」（CI/community profile/contributors の有無判定など）で
    // 正常な往復＝サービス障害ではないため、健全性のエラーには計上しない（縮退の誤検知を防ぐ）。
    if (!res.ok && res.status !== 404) noteHttpIssue("github-rest", res.status);
    return res;
  });
}

/** キーワードでリポジトリを検索（search/repositories）。 */
export async function searchRepositories(
  q: string,
  opts: { perPage?: number; sort?: "stars" | "updated" | ""; page?: number } = {},
): Promise<SearchResult> {
  const params = new URLSearchParams({
    q,
    per_page: String(opts.perPage ?? 20),
  });
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));

  const res = await ghFetch(`/search/repositories?${params.toString()}`, 120);
  if (!res.ok) throw new GitHubError(res.status, await ghMessage(res));
  return (await res.json()) as SearchResult;
}

/** リポジトリ詳細（repos/{owner}/{repo}）。subscribers_count=正確な Watcher を含む。 */
export async function getRepo(owner: string, repo: string): Promise<Repo> {
  const res = await ghFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    300,
  );
  if (res.status === 404) throw new GitHubError(404, "リポジトリが見つかりません");
  if (!res.ok) throw new GitHubError(res.status, await ghMessage(res));
  return (await res.json()) as Repo;
}

// ── GraphQL：複数リポジトリを 1 リクエストでバッチ取得 ─────────────────────────
// パッケージ検索のエンリッチ（解決した N リポジトリの事実取得）を REST の N コールから
// GraphQL 1 リクエストに集約する。REST と同じ Repo 形に整形して返す。
// 注意: GraphQL は認証必須。renamed/transferred は null になる（呼び出し側が REST で補完）。

type GqlRepo = {
  databaseId: number | null;
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  isArchived: boolean;
  pushedAt: string | null;
  stargazerCount: number;
  forkCount: number;
  issues: { totalCount: number };
  watchers: { totalCount: number };
  primaryLanguage: { name: string } | null;
  licenseInfo: { spdxId: string | null; name: string } | null;
  owner: { login: string; avatarUrl: string; __typename: string };
  defaultBranchRef: {
    name: string;
    target: { committedDate?: string } | null;
  } | null;
  latestRelease: { publishedAt: string | null } | null;
};

const REPO_FRAGMENT = `fragment F on Repository {
  databaseId name nameWithOwner description url isArchived pushedAt
  stargazerCount forkCount
  issues(states: OPEN) { totalCount }
  watchers { totalCount }
  primaryLanguage { name }
  licenseInfo { spdxId name }
  owner { login avatarUrl __typename }
  defaultBranchRef { name target { ... on Commit { committedDate } } }
  latestRelease { publishedAt }
}`;

function mapGqlRepo(g: GqlRepo): Repo {
  return {
    id: g.databaseId ?? 0,
    name: g.name,
    full_name: g.nameWithOwner,
    owner: {
      login: g.owner.login,
      avatar_url: g.owner.avatarUrl,
      type: g.owner.__typename === "Organization" ? "Organization" : "User",
    },
    html_url: g.url,
    description: g.description,
    language: g.primaryLanguage?.name ?? null,
    stargazers_count: g.stargazerCount,
    watchers_count: g.stargazerCount, // REST 互換（star の別名）
    forks_count: g.forkCount,
    open_issues_count: g.issues.totalCount,
    license: g.licenseInfo
      ? { spdx_id: g.licenseInfo.spdxId, name: g.licenseInfo.name }
      : null,
    pushed_at: g.pushedAt ?? "",
    archived: g.isArchived,
    subscribers_count: g.watchers.totalCount, // 正確な Watcher
    default_branch: g.defaultBranchRef?.name,
    latest_release_at: g.latestRelease?.publishedAt ?? null,
    last_commit_at: g.defaultBranchRef?.target?.committedDate ?? null,
  };
}

async function ghGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  return tracked("github-graphql", async () => {
    const res = await fetch(`${GH}/graphql`, {
      method: "POST",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    observeRate(res, "github-graphql");
    if (!res.ok) throw new GitHubError(res.status, await ghMessage(res));
    const json = (await res.json()) as {
      data?: T;
      errors?: Array<{ message?: string }>;
    };
    // 一部 null（renamed 等）は errors に出ても data は返るため、data があれば採用する。
    if (!json.data) {
      throw new GitHubError(res.status, json.errors?.[0]?.message ?? "GraphQL エラー");
    }
    return json.data;
  });
}

/**
 * 複数リポジトリの事実を 1 リクエストでまとめて取得する（owner/repo 小文字キーの Map）。
 * 解決できなかった（null＝rename/不存在）ものはキーに含めない＝呼び出し側が REST で補完。
 */
// 実取得（エントリ配列で返す＝unstable_cache が直列化できる形）。
// 同一 refs なら 300s キャッシュ → ページ送り・再検索でネットワークを叩かない。
// 1 クエリに多数の repository を詰めると GitHub 側でタイムアウト/502 になりやすい。
// 小さめのチャンクに分け、チャンクは並列・失敗は隔離（失敗塊のみ呼び出し側が REST 補完）。
const BATCH_CHUNK = 25;
// 107 動的調整：チャンクが失敗（タイムアウト/502）したら半分に割って再試行し、
// MIN_CHUNK まで縮小する。成功する塊は大きいまま、重い塊だけ細かくして取りこぼしを減らす。
const MIN_CHUNK = 5;

// 1 回分の GraphQL バッチ。成功＝結果配列（0件もあり得る）、失敗（例外）＝null を返す。
async function fetchChunkOnce(
  slice: Array<{ owner: string; repo: string }>,
): Promise<Array<[string, Repo]> | null> {
  try {
    const fields = slice
      .map(
        (r, j) =>
          `r${j}: repository(owner: ${JSON.stringify(r.owner)}, name: ${JSON.stringify(r.repo)}) { ...F }`,
      )
      .join("\n");
    const data = await ghGraphQL<Record<string, GqlRepo | null>>(
      `query {\n${fields}\n}\n${REPO_FRAGMENT}`,
    );
    const out: Array<[string, Repo]> = [];
    slice.forEach((r, j) => {
      const node = data[`r${j}`];
      if (node) out.push([`${r.owner}/${r.repo}`.toLowerCase(), mapGqlRepo(node)]);
    });
    return out;
  } catch {
    return null; // 失敗（呼び出し側が縮小再試行 or REST で補完）
  }
}

// 失敗したら半分に割って再帰的に再試行（動的縮小）。MIN_CHUNK 以下まで縮めても失敗なら隔離。
async function fetchChunk(
  slice: Array<{ owner: string; repo: string }>,
): Promise<Array<[string, Repo]>> {
  const out = await fetchChunkOnce(slice);
  if (out !== null) return out;
  if (slice.length <= MIN_CHUNK) return []; // これ以上縮小できない＝この塊は諦める
  const mid = Math.floor(slice.length / 2);
  const halves = await Promise.all([
    fetchChunk(slice.slice(0, mid)),
    fetchChunk(slice.slice(mid)),
  ]);
  return halves.flat();
}

const fetchReposBatchEntries = unstable_cache(
  async (
    refs: Array<{ owner: string; repo: string }>,
  ): Promise<Array<[string, Repo]>> => {
    const chunks: Array<Array<{ owner: string; repo: string }>> = [];
    for (let i = 0; i < refs.length; i += BATCH_CHUNK) {
      chunks.push(refs.slice(i, i + BATCH_CHUNK));
    }
    const results = await Promise.all(chunks.map(fetchChunk));
    return results.flat();
  },
  ["repos-batch-v2"],
  { revalidate: 300 },
);

export async function getReposBatch(
  refs: Array<{ owner: string; repo: string }>,
): Promise<Map<string, Repo>> {
  if (refs.length === 0) return new Map();
  return new Map(await fetchReposBatchEntries(refs));
}

/**
 * 詳細ページ用：1 リポジトリの事実を GraphQL 1 リクエストで取得する
 * （repo＋正確な Watcher＋最終コミット＋最新リリースを一括）。
 * GraphQL が解決できない（rename/未認証/レート/不存在）ときは REST `getRepo` にフォールバック。
 * 404 は REST 経由で正しく GitHubError(404) を投げる（呼び出し側の notFound 用）。
 */
export async function getRepoDetail(owner: string, repo: string): Promise<Repo> {
  try {
    const map = await getReposBatch([{ owner, repo }]);
    const hit = map.get(`${owner}/${repo}`.toLowerCase());
    if (hit) return hit;
  } catch {
    // GraphQL 失敗（未認証/レート/通信）→ REST フォールバックへ。
  }
  return getRepo(owner, repo);
}

// ── GraphQL：公開脆弱性アドバイザリ（GHSA）─────────────────────────────────────
// securityVulnerabilities(ecosystem, package) は「その依存に該当する」公開アドバイザリ。
// 採点はせず、深刻度・CVSS・修正版の有無という“事実”を出典(GHSA)つきで提示する。

export type Severity = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type Advisory = {
  ghsaId: string;
  cve: string | null;
  severity: Severity;
  cvss: number | null; // 0/未設定は null 扱い
  summary: string;
  permalink: string;
  publishedAt: string;
  patched: boolean; // 修正版が存在するか（いずれかの脆弱範囲に firstPatchedVersion あり）
  // 影響範囲（特定バージョンが該当するかの判定に使う）。
  ranges: Array<{ range: string; firstPatched: string | null }>;
};

type GqlVulnNode = {
  severity: Severity;
  vulnerableVersionRange: string;
  firstPatchedVersion: { identifier: string } | null;
  advisory: {
    ghsaId: string;
    summary: string;
    permalink: string;
    publishedAt: string;
    withdrawnAt: string | null;
    cvss: { score: number } | null;
    identifiers: Array<{ type: string; value: string }>;
  };
};

const fetchAdvisories = unstable_cache(
  async (ecosystem: string, pkg: string): Promise<Advisory[]> => {
    const query = `query($eco: SecurityAdvisoryEcosystem!, $pkg: String!) {
      securityVulnerabilities(ecosystem: $eco, package: $pkg, first: 100, orderBy: {field: UPDATED_AT, direction: DESC}) {
        nodes {
          severity
          vulnerableVersionRange
          firstPatchedVersion { identifier }
          advisory {
            ghsaId summary permalink publishedAt withdrawnAt
            cvss { score }
            identifiers { type value }
          }
        }
      }
    }`;
    let nodes: GqlVulnNode[];
    try {
      const data = await ghGraphQL<{
        securityVulnerabilities: { nodes: GqlVulnNode[] };
      }>(query, { eco: ecosystem, pkg });
      nodes = data.securityVulnerabilities.nodes;
    } catch {
      return [];
    }

    // アドバイザリ(GHSA)単位に集約。撤回済みは除外。修正版は「いずれかの範囲に存在」で patched。
    const byId = new Map<string, Advisory>();
    for (const n of nodes) {
      const a = n.advisory;
      if (a.withdrawnAt) continue;
      const cve =
        a.identifiers.find((i) => i.type === "CVE")?.value ?? null;
      const existing = byId.get(a.ghsaId);
      const patchedHere = n.firstPatchedVersion != null;
      const rangeEntry = {
        range: n.vulnerableVersionRange,
        firstPatched: n.firstPatchedVersion?.identifier ?? null,
      };
      if (existing) {
        existing.patched = existing.patched || patchedHere;
        existing.ranges.push(rangeEntry);
      } else {
        byId.set(a.ghsaId, {
          ghsaId: a.ghsaId,
          cve,
          severity: n.severity,
          cvss: a.cvss && a.cvss.score > 0 ? a.cvss.score : null,
          summary: a.summary,
          permalink: a.permalink,
          publishedAt: a.publishedAt,
          patched: patchedHere,
          ranges: [rangeEntry],
        });
      }
    }

    // 深刻度（高→低）→ 公開日（新しい順）でソート。
    const rank: Record<Severity, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MODERATE: 2,
      LOW: 3,
    };
    return [...byId.values()].sort(
      (a, b) =>
        rank[a.severity] - rank[b.severity] ||
        b.publishedAt.localeCompare(a.publishedAt),
    );
  },
  ["security-advisories-v1"],
  { revalidate: 3600 }, // アドバイザリは変化が緩やか
);

/** パッケージに該当する公開アドバイザリ（GHSA 単位・深刻度順）。失敗時は空配列。 */
export function getSecurityVulnerabilities(
  ecosystem: string,
  pkg: string,
): Promise<Advisory[]> {
  return fetchAdvisories(ecosystem, pkg);
}

// ── GraphQL：活動（リリース頻度・コミット推移）─────────────────────────────────
// 生存性軸の可視化。releases とコミット履歴を 1 リクエストで取得する。

export type RepoActivity = {
  releaseTotal: number;
  lastReleaseAt: string | null;
  releasesLastYear: number;
  // リリース間隔の中央値（日）。直近のリリース日付列から算出（2件以上で値・なければ null）。
  releaseMedianGapDays: number | null;
  // 最新リリースからの経過日数（空白期間。リリースが無ければ null）。
  daysSinceLastRelease: number | null;
  commitsTotal: number;
  commitsLastYear: number;
  monthly: number[]; // 直近12か月の月次コミット数（古い→新しい）
};

// 日付降順のリリース日列から、連続間隔の中央値（日）を出す。
function medianGapDays(datesDesc: string[]): number | null {
  const ms = datesDesc
    .map((d) => Date.parse(d))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a); // 新しい→古い
  if (ms.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 0; i < ms.length - 1; i++) {
    gaps.push((ms[i] - ms[i + 1]) / 86400000);
  }
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const med =
    gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
  return Math.round(med);
}

const fetchRepoActivity = unstable_cache(
  async (owner: string, repo: string): Promise<RepoActivity | null> => {
    // 直近12か月の月境界（サーバー時刻で算出。日次 revalidate で十分新しい）。
    const now = new Date();
    const bounds: string[] = [];
    for (let i = 12; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      bounds.push(d.toISOString());
    }
    const yearAgo = bounds[0];
    const buckets = bounds
      .slice(0, 12)
      .map(
        (since, i) =>
          `m${i}: history(since: ${JSON.stringify(since)}, until: ${JSON.stringify(bounds[i + 1])}) { totalCount }`,
      )
      .join("\n");

    const query = `query {
      repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(repo)}) {
        releases(first: 50, orderBy: {field: CREATED_AT, direction: DESC}) {
          totalCount
          nodes { publishedAt }
        }
        defaultBranchRef { target { ... on Commit {
          total: history { totalCount }
          lastYear: history(since: ${JSON.stringify(yearAgo)}) { totalCount }
          ${buckets}
        } } }
      }
    }`;

    type Hist = { totalCount: number };
    type Data = {
      repository: {
        releases: { totalCount: number; nodes: Array<{ publishedAt: string | null }> };
        defaultBranchRef: {
          target:
            | ({ total: Hist; lastYear: Hist } & Record<string, Hist>)
            | null;
        } | null;
      } | null;
    };

    let data: Data;
    try {
      data = await ghGraphQL<Data>(query);
    } catch {
      return null;
    }
    const r = data.repository;
    if (!r) return null;
    const t = r.defaultBranchRef?.target ?? null;

    const yearMs = yearAgo;
    const releaseDates = r.releases.nodes
      .map((n) => n.publishedAt)
      .filter((d): d is string => !!d);
    const releasesLastYear = releaseDates.filter((d) => d >= yearMs).length;
    const lastReleaseAt = releaseDates[0] ?? null;
    const daysSinceLastRelease = lastReleaseAt
      ? Math.round((now.getTime() - Date.parse(lastReleaseAt)) / 86400000)
      : null;

    return {
      releaseTotal: r.releases.totalCount,
      lastReleaseAt,
      releasesLastYear,
      releaseMedianGapDays: medianGapDays(releaseDates),
      daysSinceLastRelease,
      commitsTotal: t?.total.totalCount ?? 0,
      commitsLastYear: t?.lastYear.totalCount ?? 0,
      monthly: Array.from({ length: 12 }, (_, i) => t?.[`m${i}`]?.totalCount ?? 0),
    };
  },
  ["repo-activity-v1"],
  { revalidate: 86400 },
);

/** リポジトリの活動（リリース頻度・月次コミット）。失敗時は null。 */
export function getRepoActivity(
  owner: string,
  repo: string,
): Promise<RepoActivity | null> {
  return fetchRepoActivity(owner, repo);
}

// ── 姿勢（security posture）：community profile ─────────────────────────────────
// セキュリティ姿勢の“事実”：SECURITY.md・開示ポリシー・行動規範等の有無と health %。
// 採点はしない（有無を出典つきで示すだけ）。REST /community/profile を使う。

export type RepoPosture = {
  healthPercentage: number; // GitHub の community health（0-100）
  hasSecurityPolicy: boolean; // SECURITY.md / 開示ポリシー
  hasCodeOfConduct: boolean;
  hasContributing: boolean;
  hasIssueTemplate: boolean;
  hasPullRequestTemplate: boolean;
  hasCI: boolean; // .github/workflows の有無（CI 設定の存在＝基本健全性 38）
};

// .github/workflows ディレクトリの有無で CI 設定の存在を判定（中身まで踏み込まない＝事実のみ）。
async function detectCI(owner: string, repo: string): Promise<boolean> {
  try {
    const res = await ghFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/.github/workflows`,
      86400,
    );
    if (!res.ok) return false;
    const arr = (await res.json()) as unknown;
    return Array.isArray(arr) && arr.length > 0;
  } catch {
    return false;
  }
}

const fetchRepoPosture = unstable_cache(
  async (owner: string, repo: string): Promise<RepoPosture | null> => {
    try {
      // community profile と CI 検出は独立なので並列（不要な直列待ちを排除）。
      const [res, hasCI] = await Promise.all([
        ghFetch(
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/community/profile`,
          86400,
        ),
        detectCI(owner, repo),
      ]);
      if (!res.ok) return null;
      const d = (await res.json()) as {
        health_percentage?: number;
        files?: {
          security_policy?: unknown;
          code_of_conduct?: unknown;
          contributing?: unknown;
          issue_template?: unknown;
          pull_request_template?: unknown;
        };
      };
      const f = d.files ?? {};
      return {
        healthPercentage: d.health_percentage ?? 0,
        hasSecurityPolicy: !!f.security_policy,
        hasCodeOfConduct: !!f.code_of_conduct,
        hasContributing: !!f.contributing,
        hasIssueTemplate: !!f.issue_template,
        hasPullRequestTemplate: !!f.pull_request_template,
        hasCI,
      };
    } catch {
      return null;
    }
  },
  ["repo-posture-v2"],
  { revalidate: 86400 },
);

/** リポジトリの姿勢（SECURITY.md 等の有無・health%）。失敗は null。 */
export function getRepoPosture(
  owner: string,
  repo: string,
): Promise<RepoPosture | null> {
  return fetchRepoPosture(owner, repo);
}

// ── メンテナ集中（bus factor 目安）：contributors ──────────────────────────────
// 「活発な人数・トップ貢献者の占有率」を事実として示す。採点しない。
// REST /contributors は最大100/page。上位ページのみ（bound）で占有率の“目安”を出す。

export type Maintainership = {
  topContributors: Array<{ login: string; contributions: number; avatarUrl: string }>;
  top1Share: number; // トップ1人の占有率（%・上位サンプル内）
  top3Share: number; // 上位3人の占有率（%）
  sampleCount: number; // 占有率の母数（上位ページの人数）
  hasMore: boolean; // さらに貢献者がいるか（Link ヘッダ）
};

const fetchMaintainership = unstable_cache(
  async (owner: string, repo: string): Promise<Maintainership | null> => {
    try {
      const res = await ghFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contributors?per_page=25&anon=false`,
        86400,
      );
      if (!res.ok) return null;
      const list = (await res.json()) as Array<{
        login?: string;
        contributions?: number;
        avatar_url?: string;
      }>;
      if (!Array.isArray(list) || list.length === 0) return null;
      const cleaned = list
        .filter((c) => c.login && typeof c.contributions === "number")
        .map((c) => ({
          login: c.login as string,
          contributions: c.contributions as number,
          avatarUrl: c.avatar_url ?? "",
        }));
      if (cleaned.length === 0) return null;
      const total = cleaned.reduce((s, c) => s + c.contributions, 0) || 1;
      const share = (n: number) =>
        Math.round(
          (cleaned.slice(0, n).reduce((s, c) => s + c.contributions, 0) / total) *
            100,
        );
      return {
        topContributors: cleaned.slice(0, 5),
        top1Share: share(1),
        top3Share: share(3),
        sampleCount: cleaned.length,
        hasMore: /rel="next"/.test(res.headers.get("link") ?? ""),
      };
    } catch {
      return null;
    }
  },
  ["repo-maintainership-v1"],
  { revalidate: 86400 },
);

/** メンテナ集中（上位貢献者・占有率の目安）。失敗は null。 */
export function getMaintainership(
  owner: string,
  repo: string,
): Promise<Maintainership | null> {
  return fetchMaintainership(owner, repo);
}

// 39 メンテナ応答性：直近 issue の「作成→初回応答（作成者以外の最初のコメント）」までの中央値。
// 応答有無のサンプル比も返す。1 GraphQL クエリ（issues + 各 issue の先頭コメント）。
export type Responsiveness = {
  medianHours: number; // 初回応答までの中央値（時間）
  responded: number; // サンプル内で応答のあった issue 数
  sample: number; // 評価対象 issue 数
};

const fetchResponsiveness = unstable_cache(
  async (owner: string, repo: string): Promise<Responsiveness | null> => {
    try {
      const data = await ghGraphQL<{
        repository: {
          issues: {
            nodes: Array<{
              createdAt: string;
              author: { login: string } | null;
              comments: { nodes: Array<{ createdAt: string; author: { login: string } | null }> };
            }>;
          };
        } | null;
      }>(
        `query($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            issues(first: 30, orderBy: {field: CREATED_AT, direction: DESC}, states: [OPEN, CLOSED]) {
              nodes {
                createdAt
                author { login }
                comments(first: 1) { nodes { createdAt author { login } } }
              }
            }
          }
        }`,
        { owner, repo },
      );
      const nodes = data.repository?.issues.nodes ?? [];
      if (nodes.length === 0) return null;
      const hours: number[] = [];
      let responded = 0;
      for (const n of nodes) {
        const first = n.comments.nodes[0];
        // 作成者以外による初回コメント＝応答とみなす（self-reply は応答に数えない）。
        if (
          first &&
          first.author?.login &&
          first.author.login !== n.author?.login
        ) {
          const dt = Date.parse(first.createdAt) - Date.parse(n.createdAt);
          if (Number.isFinite(dt) && dt >= 0) {
            hours.push(dt / 3_600_000);
            responded++;
          }
        }
      }
      if (responded === 0) {
        return { medianHours: 0, responded: 0, sample: nodes.length };
      }
      hours.sort((a, b) => a - b);
      const median = hours[Math.floor((hours.length - 1) / 2)];
      return {
        medianHours: Math.round(median * 10) / 10,
        responded,
        sample: nodes.length,
      };
    } catch {
      return null;
    }
  },
  ["repo-responsiveness-v1"],
  { revalidate: 86400 },
);

/** メンテナ応答性（直近 issue の初回応答中央値）。失敗は null。 */
export function getResponsiveness(
  owner: string,
  repo: string,
): Promise<Responsiveness | null> {
  return fetchResponsiveness(owner, repo);
}
