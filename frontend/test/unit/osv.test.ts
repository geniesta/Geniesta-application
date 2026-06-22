// 【unit/MSW】lib/server/osv の脆弱性クロスチェックを MSW で api.osv.dev をモックして検証（一致/不一致・503 縮退）。
import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../helpers/msw";

// unstable_cache はリクエストコンテキスト依存なので、テストでは素通し（直接実行）にする。
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

import { getOsvCrossCheck } from "@/lib/server/osv";

const OSV = "https://api.osv.dev/v1/query";

describe("getOsvCrossCheck", () => {
  it("GHSA ID を id と aliases から集約し、撤回済み(withdrawn)を除外する", async () => {
    server.use(
      http.post(OSV, () =>
        HttpResponse.json({
          vulns: [
            { id: "GHSA-aaa", aliases: ["CVE-2023-1"] },
            { id: "OSV-1", aliases: ["GHSA-bbb"] },
            { id: "GHSA-ccc", withdrawn: "2024-01-01T00:00:00Z" },
          ],
        }),
      ),
    );
    const res = await getOsvCrossCheck("NPM", "react");
    expect(res).not.toBeNull();
    expect(res!.total).toBe(2); // 撤回済みを除いた件数
    expect(res!.ghsaIds.sort()).toEqual(["GHSA-aaa", "GHSA-bbb"]);
  });

  it("GHSA エコシステムにマップできない場合は null（取得しない）", async () => {
    const res = await getOsvCrossCheck("UNKNOWN_ECO", "whatever");
    expect(res).toBeNull();
  });

  it("OSV が 5xx を返すとき（ベストエフォート）は null", async () => {
    server.use(
      http.post(OSV, () => new HttpResponse(null, { status: 503 })),
    );
    const res = await getOsvCrossCheck("NPM", "left-pad");
    expect(res).toBeNull();
  });

  it("脆弱性ゼロは total=0・空配列で返る", async () => {
    server.use(http.post(OSV, () => HttpResponse.json({ vulns: [] })));
    const res = await getOsvCrossCheck("PIP", "requests");
    expect(res).toEqual({ total: 0, ghsaIds: [] });
  });
});