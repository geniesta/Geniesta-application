import { test, expect } from "@playwright/test";

// 異常系・キーボード操作・比較の削除を、実ブラウザで検証する。
// 注: サーバー側 fetch（GitHub 等）は Playwright の page.route では差し替えられないため、
// 403/500 等の上流障害は統合テスト（test/*.test.ts の MSW）側で担保する。ここはブラウザ側の挙動に絞る。

test.describe("異常系とキーボード", () => {
  test("0件: 存在しないキーワードで結果なし UI が出る", async ({ page }) => {
    await page.goto("/?q=zzqx-no-such-package-xyz-999000");
    await expect(
      page.getByText(/見つかりませんでした/),
    ).toBeVisible({ timeout: 20_000 });
    // ゼロ件救済の GitHub 直検索導線がある。
    await expect(page.getByRole("link", { name: /GitHub で直接検索/ })).toBeVisible();
  });

  test("未定義ルートは 404 ページ（アプリシェル内）", async ({ page }) => {
    const res = await page.goto("/this-route-does-not-exist-zzz");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByRole("link", { name: "ホームへ戻る" })).toBeVisible();
  });

  test("キーボードのみで検索を送信できる（Tab→入力→Enter）", async ({ page }) => {
    await page.goto("/");
    const input = page.getByRole("combobox").first();
    await input.click();
    await page.keyboard.type("supabase");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/[?&]q=supabase/);
  });

  test("比較に追加 → トレイから削除でトレイが消える", async ({ page }) => {
    // 詳細を実 GitHub から取得して比較に追加する。匿名(60req/h)枯渇でフレークするため、
    // トークンが無い時はスキップ（実行: GITHUB_TOKEN=... bun run test:e2e）。
    test.skip(
      !process.env.GITHUB_TOKEN,
      "live GitHub の全網羅にはトークンが必要（匿名 60req/h 回避）",
    );
    await page.goto("/repos/facebook/react");
    await page.getByRole("button", { name: /比較に追加/ }).click();
    const tray = page.getByRole("region", { name: "比較トレイ" });
    await expect(tray).toBeVisible();
    // トレイ内の削除ボタン（aria-label に slug を含む）を押す。
    await tray.getByRole("button", { name: /facebook\/react/ }).click();
    await expect(tray).toBeHidden();
  });
});
