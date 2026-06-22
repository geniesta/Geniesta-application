// 契約（contract）テスト：実 GitHub / OSV API に1回だけ当て、コードが依存するレスポンスの
// 「形（スキーマ）」が今も存続しているかを検証する。MSW のモックは“自分が書いた形”をテストする
// ため、外部 API のフィールド改名・削除（contract drift）を見逃す。その盲点を塞ぐのが目的。
//
// 既定の `vitest run`（include: test/{unit,component}）からは除外され、`bun run test:contract` /
// nightly CI でのみ実行する（レート制限・ネットワーク依存・トークン要のため PR ゲートには載せない）。
//
// 失敗＝「外部 API の契約が変わった可能性」。MSW モックと実 API の乖離を早期に検知する。

import { describe, it, expect } from "vitest";

const TOKEN = process.env.GITHUB_TOKEN;
const ghHeaders: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

describe("contract: GitHub REST /repos", () => {
  it("Repo が依存するフィールドが実レスポンスに存在する（特に subscribers_count=正確なWatcher）", async () => {
    const res = await fetch("https://api.github.com/repos/facebook/react", {
      headers: ghHeaders,
    });
    expect(res.ok).toBe(true);
    const d = (await res.json()) as Record<string, unknown>;

    // lib/types.ts の Repo が読むフィールド。1つでも欠ければ contract drift。
    for (const key of [
      "id",
      "name",
      "full_name",
      "html_url",
      "language",
      "stargazers_count",
      "watchers_count",
      "forks_count",
      "open_issues_count",
      "subscribers_count", // ★ 正確な Watcher。star エイリアス watchers_count と別物
      "pushed_at",
      "archived",
      "default_branch",
    ]) {
      expect(d, `欠落フィールド: ${key}`).toHaveProperty(key);
    }
    // 型の健全性（数値であるべきもの）。
    expect(typeof d.stargazers_count).toBe("number");
    expect(typeof d.subscribers_count).toBe("number");
    // owner.login / avatar_url / type（提供元の判定に使う）。
    const owner = d.owner as Record<string, unknown>;
    for (const key of ["login", "avatar_url", "type"]) {
      expect(owner, `owner.${key} 欠落`).toHaveProperty(key);
    }
    // license は object(spdx_id を持つ) または null。
    if (d.license !== null) {
      expect(d.license).toHaveProperty("spdx_id");
    }
  });
});

describe("contract: OSV /v1/query", () => {
  it("脆弱性照会のレスポンス形（vulns 配列）が存続している", async () => {
    const res = await fetch("https://api.osv.dev/v1/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package: { ecosystem: "npm", name: "lodash" },
        version: "4.17.20", // 既知の脆弱性があるバージョン
      }),
    });
    expect(res.ok).toBe(true);
    const d = (await res.json()) as { vulns?: unknown };
    // vulns は配列（該当が無ければ空 or 省略）。少なくとも形が壊れていないこと。
    if (d.vulns !== undefined) {
      expect(Array.isArray(d.vulns)).toBe(true);
    }
  });
});
