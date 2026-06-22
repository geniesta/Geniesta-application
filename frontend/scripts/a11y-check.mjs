// ブラウザ無しで「ライブ SSR ページ」に axe-core をかける検証スクリプト。
// このサンドボックスは chromium のシステム lib を apt 制限で入れられないため、
// SSR HTML を fetch → jsdom に流し込み → axe-core を実行する。
// 注: color-contrast は jsdom にレイアウトが無いため判定不可 → 除外（CI の Playwright 版で担保）。
//
// 使い方: A11Y_BASE=http://127.0.0.1:3100 node scripts/a11y-check.mjs / /repos/facebook/react
import { JSDOM } from "jsdom";

const base = process.env.A11Y_BASE || "http://127.0.0.1:3100";
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ["/"];

let total = 0;
for (const p of paths) {
  const res = await fetch(base + p);
  const html = await res.text();
  const dom = new JSDOM(html, { url: base + p, pretendToBeVisual: true });
  // axe-core はグローバルの window/document を見るので、import 前に差し込む。
  // navigator は Node22 で getter 専用のため window 側に委譲（defineProperty）。
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  try {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      get: () => dom.window.navigator,
    });
  } catch {
    /* 既に設定済みなら無視 */
  }
  const axe = (await import("axe-core")).default;
  const results = await axe.run(dom.window.document.documentElement, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
  });
  const violations = results.violations.filter((v) => v.id !== "color-contrast");
  console.log(
    `\n=== ${p} : ${violations.length} violations（color-contrast は jsdom 判定不可のため除外） ===`,
  );
  for (const v of violations) {
    console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
    v.nodes.slice(0, 2).forEach((n) => console.log(`      ${n.target}`));
  }
  total += violations.length;
}
console.log(`\nTOTAL（contrast 除く）: ${total}`);
process.exit(total > 0 ? 1 : 0);
