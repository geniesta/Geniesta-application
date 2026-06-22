import { test, expect } from "@playwright/test";

// 受け入れシナリオ（要件 12 AC-7）：詳細はモーダルでなく独立ページ（URLで確認できる）。
test.describe("検索 → 一覧 → 詳細（独立ページ）", () => {
  test("ホームが表示され、検索バーがある", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("search")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /star ではなく/ }),
    ).toBeVisible();
  });

  test("react を検索して結果一覧 → カードから詳細ページへ遷移（URLが変わる）", async ({
    page,
  }) => {
    // 課題のコア受け入れ（検索→詳細が独立ページ・AC-7）なので常時実行する。
    // 単発実行は REST 数コールで匿名 60req/h に収まる（短時間に繰り返すと枠切れの可能性はある）。
    await page.goto("/?q=react");
    // 結果カード（団体のみ既定）から最初の詳細リンクへ。
    const firstDetail = page
      .getByRole("link", { name: /の詳細へ/ })
      .first();
    await expect(firstDetail).toBeVisible();
    await firstDetail.click();
    // モーダルでなく独立ページ：URL が /repos/{owner}/{repo} になる。
    await expect(page).toHaveURL(/\/repos\/[^/]+\/[^/]+/);
    // 必須7項目の見出し（基本指標）。詳細は多数の照会を伴うためコールドでは遅い→余裕を持つ。
    await expect(
      page.getByRole("heading", { name: "基本指標" }),
    ).toBeVisible({ timeout: 20_000 });
    // 基本指標カードの Watcher ラベル（厳密一致で1要素に絞る）。
    await expect(page.getByText("Watcher", { exact: true })).toBeVisible();
  });

  test("レジストリタブ（npm）に切り替えて検索できる", async ({ page }) => {
    await page.goto("/?src=npm&q=lodash");
    await expect(page.getByRole("heading", { name: /npm/ })).toBeVisible();
  });

  test("存在しないリポジトリは 404 ページ", async ({ page }) => {
    // 真の未存在なら GitHub REST は 404 を返すが、匿名で 60req/h が枯渇していると
    // 全リクエストが 403 になり 403→ErrorState(200) に化ける（not found ではなく一時障害）。
    // 安定のためトークン時のみ実行（実行: GITHUB_TOKEN=... bun run test:e2e）。
    test.skip(
      !process.env.GITHUB_TOKEN,
      "未存在の 404 判定は匿名レート枯渇時に 403→200 へ化けるためトークン必須",
    );
    const res = await page.goto("/repos/this-org-does-not/exist-xyz-000");
    expect(res?.status()).toBe(404);
  });

  test("詳細から比較に追加 → トレイ → 比較ページで横並び", async ({ page }) => {
    await page.goto("/repos/facebook/react");
    await page.getByRole("button", { name: /比較に追加/ }).click();
    // 追加でボタンが「比較中」に、トレイが出る。
    await expect(page.getByRole("button", { name: /比較中/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "比較トレイ" })).toBeVisible();

    // 2件目を追加して比較ページへ。
    await page.goto("/repos/vuejs/core");
    await page.getByRole("button", { name: /比較に追加/ }).click();
    await page.getByRole("link", { name: /比較する/ }).click();

    await expect(page).toHaveURL(/\/compare\?repos=/);
    await expect(
      page.getByRole("heading", { name: "ライブラリ比較" }),
    ).toBeVisible();
    // 比較表に Star 行が出る。
    await expect(page.getByRole("rowheader", { name: "Star" })).toBeVisible();
  });
});
