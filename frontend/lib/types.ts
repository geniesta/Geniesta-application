// ドメイン型（最内層）。フレームワーク（React/Next）・インフラ（GitHub API クライアント）に
// 一切依存しない素の TypeScript の型。クリーンアーキテクチャの「依存は内向き」を守るため、
// リポジトリの形をここ（ドメイン）で定義し、ゲートウェイ（lib/server/github.ts）が外部 JSON を
// この型へマッピングして返す。ドメインロジック（lib/trust・lib/facts 等）はこの型だけを参照し、
// インフラ層（@/lib/server/*）を import しない。

export type RepoOwner = {
  login: string;
  avatar_url: string;
  // "Organization"（団体・企業）か "User"（個人）。提供元の優先表示に使う。
  type?: "User" | "Organization" | string;
};

export type RepoLicense = { spdx_id: string | null; name: string } | null;

export type Repo = {
  id: number;
  name: string;
  full_name: string;
  owner: RepoOwner;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  watchers_count: number; // ※ star のエイリアス
  forks_count: number;
  open_issues_count: number;
  license: RepoLicense;
  pushed_at: string;
  archived: boolean;
  // 正確な Watcher 数。REST は repos/{owner}/{repo}、GraphQL は watchers.totalCount。
  subscribers_count?: number;
  // 既定ブランチ（raw マニフェスト取得に使う）。
  default_branch?: string;
  // 最新リリース公開日時（GraphQL 取得時のみ。REST 検索では未設定）。
  latest_release_at?: string | null;
  // 既定ブランチの最終コミット日時（GraphQL 取得時のみ）。pushed_at より厳密。
  last_commit_at?: string | null;
};

export type SearchResult = { total_count: number; items: Repo[] };
