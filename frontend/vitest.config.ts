import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    // 既定は node（test/unit の lib 純関数）。test/component のコンポーネントテストは
    // ファイル先頭の `// @vitest-environment jsdom` で個別に jsdom へ切り替える。
    // 構成: test/unit（純関数）/ test/component（同期UIコンポ）/ test/helpers（共有）/ e2e（Playwright）。
    environment: "node",
    setupFiles: ["./test/helpers/setup.ts"],
    include: ["test/{unit,component}/**/*.test.{ts,tsx}"],
    // カバレッジゲート。`bun run test:coverage`（CI で強制）で計測。
    // 閾値は「実測値の直下」に置いて**回帰を防ぐラチェット**にする（達成不能な数字を掲げて
    // 形骸化させない方針）。対象を lib/**（ロジック中核）に絞った実測:
    // lines/stmts 75.8% / branches 81.9% / funcs 76.6%。
    // ※ github.ts(49%)・manifest(45%)・use-cases(0%・E2E担保) も母数に残したうえでこの値。
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // ゲート対象は「framework 非依存のロジック中核」= lib/**（ドメイン純関数・use-cases・
      // server ゲートウェイ・stores）。ここが unit/component の責任範囲で、回帰ラチェットとして
      // 意味のある母数。**コンポーネントと async RSC ページは振る舞い(RTL+jest-axe)と E2E で
      // 検証する設計**なので行カバレッジの数値ゲートからは外す（行数で測ると境界を取り違える）。
      include: ["lib/**"],
      exclude: [
        "lib/types.ts", // 型定義のみ（ランタイムなし）
        "lib/showcase.ts", // 静的ショーケースデータ
        "lib/server/registries.ts", // レジストリ定義カタログ（契約テストで担保・データ主体）
      ],
      thresholds: { lines: 75, functions: 76, statements: 75, branches: 81 },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // server-only は RSC 以外で import すると throw する。テストでは lib/server/* を
      // 直接検証するため空モジュールへ差し替える（本番ビルドでは本物が境界を強制）。
      "server-only": fileURLToPath(
        new URL("./test/helpers/server-only-stub.ts", import.meta.url),
      ),
    },
  },
});
