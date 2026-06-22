import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// アクセシビリティ
// ライブ（実SSR）ページに対する axe スキャンとキーボード/SR 動線の検証。
// jest-axe は“部品”単位だが、ここは実ページ全体の WCAG2 A/AA 違反とフォーカス動線を違反かどうかを見る。
test.describe("アクセシビリティ（ライブページ）", () => {
  test("ホームに WCAG2 A/AA の重大違反が無い", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("詳細ページに WCAG2 A/AA の重大違反が無い", async ({ page }) => {
    await page.goto("/repos/facebook/react");
    await expect(
      page.getByRole("heading", { name: "基本指標" }),
    ).toBeVisible({ timeout: 25_000 });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("Skip link: Tab 一回でスキップリンクに到達し、本文(#main)へ飛べる", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", {
      name: /本文へスキップ|Skip to content/,
    });
    await expect(skip).toBeFocused(); // 最初の Tab で必ずスキップリンク
    await skip.press("Enter");
    await expect(page).toHaveURL(/#main/);
  });

  test("言語切替: 日本語→English で html@lang が cookie 反映で変わる", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    const group = page.getByRole("group", { name: "言語" });
    await group.getByRole("button", { name: "English" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
