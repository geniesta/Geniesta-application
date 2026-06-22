// 【概念テスト】対象: app/api/facts/[owner]/[repo]/route.ts（公開 Route Handler の HTTP 契約）。
// ルートはファイル名が route.ts のため、テストは対象パスを表す facts-route で命名。
import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../helpers/msw";

// 公開 API（Route Handler）/api/facts/[owner]/[repo] の契約テスト。
// 採点せず、出典つきの事実（evidence）と状態を返す。404/上流障害の分岐も検証する。

vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

import { GET } from "@/app/api/facts/[owner]/[repo]/route";

const GQL = "https://api.github.com/graphql";
const REPO = "https://api.github.com/repos/:owner/:repo";

function call(owner: string, repo: string) {
  return GET(new Request("http://test/api/facts"), {
    params: Promise.resolve({ owner, repo }),
  });
}

describe("GET /api/facts/[owner]/[repo]", () => {
  it("成功時は repo・status・evidence・出典つき meta を返す", async () => {
    server.use(http.post(GQL, () => HttpResponse.json({ data: {} })));
    const res = await call("facebook", "react");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.repo.full_name).toBe("facebook/react");
    expect(body.repo.watchers).toBe(6500); // subscribers_count（正確な Watcher）
    expect(Array.isArray(body.evidence)).toBe(true);
    expect(body.status.state).toBeTruthy();
    expect(body.meta.disclaimer).toMatch(/not score/i);
  });

  it("存在しないリポジトリは 404 JSON", async () => {
    server.use(http.post(GQL, () => HttpResponse.json({ data: {} })));
    const res = await call("nobody", "nothing");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it("上流（GitHub）が 5xx のときは 502 JSON", async () => {
    server.use(
      http.post(GQL, () => HttpResponse.json({ data: {} })),
      http.get(REPO, () => new HttpResponse(null, { status: 500 })),
    );
    const res = await call("facebook", "react");
    expect(res.status).toBe(502);
  });
});
