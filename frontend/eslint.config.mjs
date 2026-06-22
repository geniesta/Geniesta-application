import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // a11y を recommended まで引き上げ（NFR-6 / J 軸）。アイコンボタンの label・装飾アイコンの
  // aria-hidden・role 整合などを CI で継続的に担保する（一度きりの監査でなく回帰防止）。
  // next の core-web-vitals が既に jsx-a11y プラグインを登録済みのため、plugins は再定義せず rules のみ適用。
  {
    files: ["**/*.{jsx,tsx}"],
    rules: { ...jsxA11y.flatConfigs.recommended.rules },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 生成物（カバレッジ/Playwright レポート）は lint 対象外。
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
