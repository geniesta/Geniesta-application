import { test, expect } from "@playwright/test";

// component/unit では純関数・部品単位で守られているが、ブラウザ一気通貫（E2E）では未検証だった
// 業務動線を補う。価値の高い順に：依存まとめ確認（独立ジャーニー）／フィルタ適用／ウォッチ往復。
// 自明・脆くなりやすい動線（ページネーション等）はあえて E2E 化しない（配分の判断）。
test.describe("業務動線（依存チェック / フィルタ / ウォッチ）", () => {
  test("依存をまとめて確認: package.json を貼付→解析→各依存の検索リンクが生成される", async ({
    page,
  }) => {
    await page.goto("/check");
    // マニフェストを貼り付け（解析はブラウザ内＝ネットワーク不要）。
    await page
      .getByRole("textbox", { name: "マニフェストを貼り付け" })
      .fill(JSON.stringify({ dependencies: { react: "^19", lodash: "^4" } }));
    await page.getByRole("button", { name: "解析する" }).click();

    // 「2 件の依存を検出」＋各依存が npm 検索リンクに変換される。
    await expect(page.getByText("2 件の依存を検出")).toBeVisible();
    await expect(page.getByRole("link", { name: "react" })).toHaveAttribute(
      "href",
      /\/\?src=npm&q=react/,
    );
    await expect(page.getByRole("link", { name: "lodash" })).toBeVisible();
  });

  test("フィルタ適用: 提供元「団体・企業を優先」を選ぶと URL に owner=org-first が付く", async ({
    page,
  }) => {
    await page.goto("/?q=react");
    // 既定は org-only。提供元フィルタ（一意なラベル）を押すと URL が変わり再取得される。
    await page
      .getByRole("button", { name: "団体・企業を優先" })
      .click();
    await page.waitForURL(/owner=org-first/);
    expect(new URL(page.url()).searchParams.get("owner")).toBe("org-first");
  });

  test("ウォッチ: 詳細で追加→ホームのウォッチ一覧（採用検討）に出る", async ({
    page,
  }) => {
    await page.goto("/repos/facebook/react");
    await page.getByRole("button", { name: "＋ ウォッチ" }).click();
    // ボタンが「ウォッチ中」に変わる（localStorage ストアへ反映）。
    await expect(
      page.getByRole("button", { name: "✓ ウォッチ中" }),
    ).toBeVisible();

    // ホームに戻ると、ウォッチ一覧（採用検討）に react が出る（ストアの往復）。
    await page.goto("/");
    const list = page.getByRole("region", { name: "ウォッチ中（採用検討）" });
    await expect(list).toBeVisible();
    // 一覧内のウォッチ項目リンク（1要素）で確認。getByText は repo/owner 双方に "react"
    // が出ると strict mode で2一致するため、リンク role で一意に絞る。
    await expect(list.getByRole("link", { name: /react/ })).toBeVisible();
  });
});
