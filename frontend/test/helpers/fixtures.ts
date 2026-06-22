// テスト共有フィクスチャ。テスト本体の期待値（例: `expect(r.watcher).toBe(reactRepo.subscribers_count)`）
// が参照する「入力リポジトリ」の実値をここに集約する。主要な値の意図：
//   - reactRepo:        active（更新中）の代表。star 230,000・**Watcher(subscribers_count) 6,500**・MIT・非archived。
//   - jwtGoRepo:        中規模 OSS の代表。star 12,000・Watcher 250・MIT。検索結果2件目に使う。
//   - plainArchivedRepo: archived（アーカイブ済み）状態の代表（reactRepo を継承し archived 化・Watcher 30）。
// ※ Watcher は star エイリアスの watchers_count ではなく subscribers_count を採用（製品要件）。
import type { Repo } from "@/lib/server/github";

/** 更新中のリポジトリ（active）。star 230k / Watcher 6,500 / MIT / 非 archived。 */
export const reactRepo: Repo = {
  id: 10270250,
  name: "react",
  full_name: "facebook/react",
  owner: {
    login: "facebook",
    avatar_url: "https://avatars.githubusercontent.com/u/69631?v=4",
    type: "Organization",
  },
  html_url: "https://github.com/facebook/react",
  description: "The library for web and native user interfaces.",
  language: "JavaScript",
  stargazers_count: 230000,
  watchers_count: 230000,
  forks_count: 47000,
  open_issues_count: 900,
  license: { spdx_id: "MIT", name: "MIT License" },
  pushed_at: "2026-06-01T00:00:00Z",
  archived: false,
  subscribers_count: 6500,
};

/** アーカイブ済み＋後継が既知（superseded の代表＝デモの主役）。 */
export const jwtGoRepo: Repo = {
  id: 6088912,
  name: "jwt-go",
  full_name: "dgrijalva/jwt-go",
  owner: {
    login: "dgrijalva",
    avatar_url: "https://avatars.githubusercontent.com/u/123?v=4",
    type: "User",
  },
  html_url: "https://github.com/dgrijalva/jwt-go",
  description: "Golang implementation of JSON Web Tokens (JWT)",
  language: "Go",
  stargazers_count: 12000,
  watchers_count: 12000,
  forks_count: 1500,
  open_issues_count: 120,
  license: { spdx_id: "MIT", name: "MIT License" },
  pushed_at: "2021-03-01T00:00:00Z",
  archived: true,
  subscribers_count: 250,
};

/** 後継は無いがアーカイブされたリポジトリ（archived）。 */
export const plainArchivedRepo: Repo = {
  ...reactRepo,
  id: 999,
  name: "legacy-thing",
  full_name: "someone/legacy-thing",
  html_url: "https://github.com/someone/legacy-thing",
  archived: true,
  pushed_at: "2019-01-01T00:00:00Z",
  subscribers_count: 30,
};

export const searchResponse = {
  total_count: 2,
  items: [reactRepo, jwtGoRepo],
};
