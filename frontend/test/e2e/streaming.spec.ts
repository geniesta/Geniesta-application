import { test, expect } from "@playwright/test";

//  ★★★：詳細ページは async Server Component ＋ Suspense ストリーミング。
// 「基本指標が即出る → 重い軸（活動/姿勢など）が後から流れて現れる」を、
// Playwright の web-first assertion（自動リトライ＝Next 本体の retry() 相当）で検証する。
test.describe("詳細ページのストリーミング（async RSC）", () => {
  test("基本指標が先に出て、重いセクションがストリーミングで現れる", async ({
    page,
  }) => {
    await page.goto("/repos/facebook/react");

    // サーバーで即時レンダリングされる必須7項目（基本指標）。
    await expect(
      page.getByRole("heading", { name: "基本指標" }),
    ).toBeVisible({ timeout: 20_000 });

    // 重い外部照会を伴う軸は Suspense 境界で後から流れてくる。
    // toBeVisible が解決まで自動でポーリング待機する（固定 sleep を使わない）。
    await expect(
      page.getByRole("heading", { name: "活動（生存性）" }),
    ).toBeVisible({ timeout: 25_000 });
    await expect(
      page.getByRole("heading", { name: /姿勢/ }),
    ).toBeVisible({ timeout: 25_000 });
  });

  test("脆弱性・メンテナの各軸セクションが現れる", async ({ page }) => {
    // 脆弱性はパッケージ文脈（eco/pkg）がある時だけ描画する設計のため、
    // 一覧のレジストリカードと同様に eco/pkg を付与して開く（npm の react）。
    await page.goto("/repos/facebook/react?eco=NPM&pkg=react");
    // GHSA 対応エコシステム（npm）なので、重いセクションが順に流れてくる。
    // ※「実使用」軸はスリム化で撤去済み（現状は 生存性/脆弱性/姿勢/メンテナ の4軸）。
    await expect(
      page.getByRole("heading", { name: "脆弱性（公開アドバイザリ）" }),
    ).toBeVisible({ timeout: 25_000 });
    // 「メンテナ集中」はチェックリストにも語が出るため、見出しの最初の一致に絞る。
    await expect(
      page.getByRole("heading", { name: "メンテナ集中" }).first(),
    ).toBeVisible({ timeout: 25_000 });
  });
});
