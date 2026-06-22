import { test, expect } from "@playwright/test";

// キーボードのみのアクセシビリティを実機（Chromium）で実証する。
// 観点: ①スキップリンクが最初のフォーカス ②SourceTabs が正しい semantics（リンク＋aria-current、
// role=tab でない）③Tab→Enter でレジストリ切替＆検索語リセット ④可視フォーカス(:focus-visible)
// ⑤モバイルメニュー（native <details>）の Enter 開閉＋Escape クローズ。

test.describe("キーボードのみのアクセシビリティ", () => {
  test("①最初の Tab でスキップリンクにフォーカスが当たる", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.locator('a[href="#main"]');
    await expect(skip).toBeFocused();
    // フォーカス時に可視化される（sr-only が外れる＝:focus-visible 対象）。
    await expect(skip).toHaveText(/本文へスキップ|Skip to content/);
  });

  test("②SourceTabs は role=tab でなくリンク群。現在地は aria-current=page", async ({
    page,
  }) => {
    await page.goto("/?src=npm");
    const nav = page.getByRole("navigation", { name: /検索対象|Search target/ });
    // role=tab/tablist が無いこと（semantics 修正の確認）。
    await expect(page.locator('[role="tab"]')).toHaveCount(0);
    await expect(page.locator('[role="tablist"]')).toHaveCount(0);
    // npm が現在地としてマークされている。
    await expect(nav.getByRole("link", { name: "npm" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("③Tab→Enter でレジストリ切替でき、検索語はリセットされる", async ({
    page,
  }) => {
    // npm で検索語つきの状態から。
    await page.goto("/?src=npm&q=react");
    const cargo = page
      .getByRole("navigation", { name: /検索対象|Search target/ })
      .getByRole("link", { name: "Cargo" });
    await cargo.focus();
    await expect(cargo).toBeFocused();
    await page.keyboard.press("Enter");
    // Cargo の表示ラベルは「Cargo」だが、レジストリ slug は crates（?src=crates）。
    await page.waitForURL(/src=crates/);
    // 検索語 q がリセットされている（URL に q が残らない）。
    expect(new URL(page.url()).searchParams.has("q")).toBe(false);
  });

  test("④フォーカスした操作要素が :focus-visible になる（可視フォーカス）", async ({
    page,
  }) => {
    await page.goto("/?src=npm");
    const github = page
      .getByRole("navigation", { name: /検索対象|Search target/ })
      .getByRole("link", { name: /GitHub/ });
    await github.focus();
    const isFocusVisible = await github.evaluate((el) =>
      el.matches(":focus-visible"),
    );
    expect(isFocusVisible).toBe(true);
  });

  test("⑤モバイルメニューは Enter で開き Escape で閉じる", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 }); // モバイル幅（lg 未満）
    await page.goto("/");
    const details = page.locator("header details");
    const summary = details.locator("summary");
    await summary.focus();
    await expect(summary).toBeFocused();
    // Enter で開く（native <details>）。
    await page.keyboard.press("Enter");
    await expect(details).toHaveJSProperty("open", true);
    // Escape で閉じる（カスタムハンドラ）。
    await page.keyboard.press("Escape");
    await expect(details).toHaveJSProperty("open", false);
  });
});
