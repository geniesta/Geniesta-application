// 【unit/MSW】lib/server/github の GraphQL バッチ(getReposBatch)を MSW で GitHub GraphQL をモックして検証（N件1リクエスト・部分失敗のフォールバック）。
import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../helpers/msw";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

import { getSecurityVulnerabilities, getRepoDetail } from "@/lib/server/github";

const GQL = "https://api.github.com/graphql";

function vulnNode(over: Record<string, unknown> = {}) {
  return {
    severity: "MODERATE",
    vulnerableVersionRange: "< 1.0.0",
    firstPatchedVersion: { identifier: "1.0.0" },
    advisory: {
      ghsaId: "GHSA-mmmm",
      summary: "moderate issue",
      permalink: "https://github.com/advisories/GHSA-mmmm",
      publishedAt: "2023-01-01T00:00:00Z",
      withdrawnAt: null,
      cvss: { score: 5.3 },
      identifiers: [{ type: "CVE", value: "CVE-2023-0001" }],
    },
    ...over,
  };
}

describe("getSecurityVulnerabilities (GraphQL parsing)", () => {
  it("撤回済みを除外し、深刻度順にソートし、CVE/CVSS/patched を正しく抽出する", async () => {
    server.use(
      http.post(GQL, () =>
        HttpResponse.json({
          data: {
            securityVulnerabilities: {
              nodes: [
                vulnNode(),
                vulnNode({
                  severity: "CRITICAL",
                  vulnerableVersionRange: "< 2.0.0",
                  firstPatchedVersion: null,
                  advisory: {
                    ghsaId: "GHSA-cccc",
                    summary: "critical, unpatched",
                    permalink: "l",
                    publishedAt: "2024-01-01T00:00:00Z",
                    withdrawnAt: null,
                    cvss: { score: 0 }, // 0 は null 扱い
                    identifiers: [],
                  },
                }),
                vulnNode({
                  advisory: {
                    ghsaId: "GHSA-wwww",
                    summary: "withdrawn",
                    permalink: "l",
                    publishedAt: "2024-02-01T00:00:00Z",
                    withdrawnAt: "2024-03-01T00:00:00Z",
                    cvss: null,
                    identifiers: [],
                  },
                }),
              ],
            },
          },
        }),
      ),
    );
    const adv = await getSecurityVulnerabilities("NPM", "react");
    // 撤回済み(GHSA-wwww)は除外 → 2件
    expect(adv.map((a) => a.ghsaId)).toEqual(["GHSA-cccc", "GHSA-mmmm"]);
    // CRITICAL が先頭、未修正、CVSS は 0→null、CVE 無し
    expect(adv[0]).toMatchObject({ severity: "CRITICAL", patched: false, cvss: null, cve: null });
    // MODERATE は CVE/CVSS/patched を持つ
    expect(adv[1]).toMatchObject({ cve: "CVE-2023-0001", cvss: 5.3, patched: true });
  });

  it("GraphQL がエラーのとき（ベストエフォート）は空配列", async () => {
    server.use(http.post(GQL, () => new HttpResponse(null, { status: 502 })));
    const adv = await getSecurityVulnerabilities("NPM", "left-pad");
    expect(adv).toEqual([]);
  });
});

describe("getRepoDetail (GraphQL→REST フォールバック)", () => {
  it("GraphQL が解決できない時は REST getRepo にフォールバックする", async () => {
    // GraphQL は空 data（r0 無し）→ バッチ空 → REST フォールバック（msw 既定で react を返す）。
    server.use(http.post(GQL, () => HttpResponse.json({ data: {} })));
    const repo = await getRepoDetail("facebook", "react");
    expect(repo.full_name).toBe("facebook/react");
    expect(repo.subscribers_count).toBe(6500);
  });
});