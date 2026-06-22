import { defineConfig, devices } from "@playwright/test";

// E2E は本番ビルドを起動して検証する（dev の Turbopack キャッシュと干渉させない）。
// 既に起動済みのサーバー（docker の :3000 等）を使う場合は E2E_BASE_URL を指定する。
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 詳細ページは多数の外部 API 照会を伴う。並列過多はサーバー過負荷＋レート制限の元。
  workers: process.env.CI ? 2 : 1,
  timeout: 30_000,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // E2E_BASE_URL 未指定なら自前でビルド済みアプリを起動。
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run start -- -p 3100",
        url: baseURL,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
      },
});
