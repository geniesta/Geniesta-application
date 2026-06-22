// ミューテーションテスト（Stryker）設定。
// 対象は意図的にドメイン純関数だけに絞る：lib/trust・lib/version・lib/licenses・lib/facts。
// これらは framework 非依存で異常系/境界を厚く守る中核であり、ミューテーションの費用対効果が最も高い。
// async Server Component や UI にかけても（E2E 前提・分岐が薄い）有益でないため対象外。
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: "vitest",
  vitest: { configFile: "vitest.config.ts" },
  // 変異させるのはドメイン純関数のみ（重い/無意味な対象を除外して高速・有意に）。
  mutate: [
    "lib/trust.ts",
    "lib/version.ts",
    "lib/licenses.ts",
    "lib/facts.ts",
  ],
  reporters: ["progress", "clear-text", "html"],
  // 生存変異（テストが殺せていない＝同語反復の疑い）を可視化する閾値。
  thresholds: { high: 80, low: 60, break: 50 },
  concurrency: 2,
  timeoutMS: 20000,
};

export default config;
