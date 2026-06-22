// 【概念テスト】対象: @/lib/server/github ＋ @/lib/server/osv ＋ @/lib/trust（複数モジュール横断）。
// 単一ソースに対応しない統合テストのため、ファイル名は対象ファイル名でなく振る舞い（degradation）で命名。
import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../helpers/msw";

// 製品テーゼの保証：ある源が落ちても、その軸だけ省いて他は出す（graceful degradation）。
// GitHub は生かしつつ（コア事実は出る）、拡張源（OSV）を 5xx にして、
// 該当軸が null/空に縮退し、コアは壊れないことを統合的に確認する。

vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

import { getRepoDetail } from "@/lib/server/github";
import { buildTrustReport } from "@/lib/trust";
import { getOsvCrossCheck } from "@/lib/server/osv";

describe("graceful degradation（拡張源ダウン時のコア生存）", () => {
  it("GitHub 生存・OSV ダウンでも、コアは出て該当軸だけ縮退する", async () => {
    server.use(
      // GitHub GraphQL は空 → REST フォールバックで facebook/react を取得（msw 既定）。
      http.post("https://api.github.com/graphql", () => HttpResponse.json({ data: {} })),
      // 拡張源（OSV）は 5xx。
      http.post("https://api.osv.dev/v1/query", () => new HttpResponse(null, { status: 503 })),
    );

    // ── コア（GitHub）は生きている ─────────────────────────────
    const repo = await getRepoDetail("facebook", "react");
    expect(repo.full_name).toBe("facebook/react");
    const report = buildTrustReport(repo, { locale: "en" });
    expect(report.evidence.length).toBeGreaterThan(0); // 5軸の事実が出る
    expect(report.status.state).toBeTruthy();

    // ── 拡張軸は「落ちた源の分だけ」縮退（例外を投げず null）─────
    expect(await getOsvCrossCheck("NPM", "react")).toBeNull();
  });
});
