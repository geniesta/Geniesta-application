import { afterAll, afterEach, beforeAll, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw";
// DOM マッチャ（toBeInTheDocument 等）と a11y マッチャ（toHaveNoViolations）を全テストで使えるように。
// node 環境のユニットテストでは単に extend するだけで害はない。
import "@testing-library/jest-dom/vitest";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// jsdom には matchMedia が無い。theme-store 等が参照するため最小ポリフィル
// （node 環境テストでは window が無いのでスキップ）。
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// 未登録のリクエストはテスト失敗にする（grounded を担保）。
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup(); // コンポーネントテスト間で DOM を破棄（累積による重複検出を防ぐ）。
  server.resetHandlers();
});
afterAll(() => server.close());
