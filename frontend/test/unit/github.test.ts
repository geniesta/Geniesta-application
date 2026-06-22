// 【unit/MSW】lib/server/github の searchRepositories/getRepo を MSW で GitHub REST をモックして検証（403/404 等の異常系も）。
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../helpers/msw";
import { getRepo, searchRepositories } from "@/lib/server/github";

describe("searchRepositories", () => {
  it("検索結果の items を返す", async () => {
    const res = await searchRepositories("react");
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].full_name).toBe("facebook/react");
  });

  it("レート制限(403)は GitHubError（トークン設定の案内を含む）", async () => {
    server.use(
      http.get("https://api.github.com/search/repositories", () =>
        HttpResponse.json({ message: "API rate limit exceeded" }, { status: 403 }),
      ),
    );
    await expect(searchRepositories("react")).rejects.toMatchObject({
      name: "GitHubError",
      status: 403,
    });
    await expect(searchRepositories("react")).rejects.toThrow(/レート制限/);
  });
});

describe("getRepo", () => {
  it("詳細を返し、subscribers_count（正確な Watcher）を含む", async () => {
    const repo = await getRepo("facebook", "react");
    expect(repo.full_name).toBe("facebook/react");
    expect(repo.subscribers_count).toBeDefined();
  });

  it("存在しないリポジトリは GitHubError 404", async () => {
    await expect(getRepo("nobody", "nothing")).rejects.toMatchObject({
      status: 404,
    });
  });
});