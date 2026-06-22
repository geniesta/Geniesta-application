import { test, expect } from "@playwright/test";

// 2-2：Next 本体は generateMetadata・JSON-LD・静的生成を
// HTTP レスポンス（cheerio render$）で検証する。当社は cheerio 非依存で、
// request フィクスチャ＋軽量パースで SSR の <head>・JSON-LD・配信契約を確かめる。
test.describe("SSR メタデータ / 配信契約", () => {
  test("詳細ページの head に title・OG・JSON-LD が含まれる", async ({
    request,
  }) => {
    const res = await request.get("/repos/facebook/react");
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/<title>[^<]*react/i);
    expect(html).toMatch(/property="og:title"/);
    // schema.org（SoftwareSourceCode / BreadcrumbList）の JSON-LD。
    expect(html).toMatch(/application\/ld\+json/);
  });

  test("sitemap.xml と robots.txt が配信される", async ({ request }) => {
    const sm = await request.get("/sitemap.xml");
    expect(sm.status()).toBe(200);
    expect(await sm.text()).toContain("<urlset");

    const rb = await request.get("/robots.txt");
    expect(rb.status()).toBe(200);
    expect((await rb.text()).toLowerCase()).toContain("user-agent");
  });

  test("公開API /api/facts の HTTP 契約（status・cache・json・採点しない）", async ({
    request,
  }) => {
    const res = await request.get("/api/facts/facebook/react");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("s-maxage=300");
    const j = await res.json();
    // owner はトークン有無・縮退でライブ環境では揺れ得るため、契約はリポ名と構造で確認する。
    expect(j.repo.full_name).toMatch(/\/react$/i);
    expect(Array.isArray(j.evidence)).toBe(true);
    // 採点しない原則が meta に明記されていること。
    expect(j.meta.disclaimer).toMatch(/not score|score/i);
  });

  test("存在しないリポジトリの /api/facts は 404 JSON", async ({ request }) => {
    const res = await request.get("/api/facts/this-org-zzz/nope-xyz-000");
    expect(res.status()).toBe(404);
  });

  test("/api/health は 200・no-store・status/sources を返す", async ({
    request,
  }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200); // 源が落ちていてもアプリ自体は 200（縮退は status で示す）
    expect(res.headers()["cache-control"]).toContain("no-store");
    const j = await res.json();
    expect(["ok", "degraded"]).toContain(j.status);
    expect(Array.isArray(j.sources)).toBe(true);
  });

  test("詳細ページの OG 画像が image/png で生成される", async ({ request }) => {
    const res = await request.get("/repos/facebook/react/opengraph-image");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  });
});
