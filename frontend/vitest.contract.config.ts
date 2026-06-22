import { defineConfig } from "vitest/config";

// 契約（contract）テスト専用の設定。実 API に当てるためネットワーク・トークンが要り、
// 既定の `vitest run`（test/{unit,component}）からは除外する。`bun run test:contract` /
// nightly CI でのみ実行する。
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/contract/**/*.test.ts"],
    // 実 API は遅延しうるので余裕を持たせる。
    testTimeout: 20000,
  },
});
