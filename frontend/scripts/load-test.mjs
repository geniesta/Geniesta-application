#!/usr/bin/env node
// 負荷テスト（139）。レート制限/キャッシュ下のスループットとレイテンシ分布を外形から測る土台。
// 使い方:
//   LOADTEST_URL=http://localhost:3000 node scripts/load-test.mjs
//   環境変数: LOADTEST_PATHS（カンマ区切り・既定は主要導線）/ LOADTEST_CONCURRENCY（既定 10）
//             LOADTEST_REQUESTS（総リクエスト数・既定 200）/ LOADTEST_TIMEOUT_MS（既定 15000）
// 注意: 外部 API のレート制限を尊重するため、既定値は控えめ。CI/手元での回帰確認用。

const base = process.env.LOADTEST_URL;
if (!base) {
  console.log(
    "LOADTEST_URL 未設定のためスキップ（土台のみ・URL を渡すと実行）。例: LOADTEST_URL=http://localhost:3000 node scripts/load-test.mjs",
  );
  process.exit(0);
}

const paths = (process.env.LOADTEST_PATHS ?? "/,/status,/?src=npm,/methodology")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const concurrency = Number(process.env.LOADTEST_CONCURRENCY ?? 10);
const totalRequests = Number(process.env.LOADTEST_REQUESTS ?? 200);
const timeoutMs = Number(process.env.LOADTEST_TIMEOUT_MS ?? 15_000);

const latencies = [];
let ok = 0;
let failed = 0;
let next = 0;

async function hit(path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const res = await fetch(new URL(path, base), { signal: ctrl.signal });
    await res.arrayBuffer(); // 本文を読み切る（実効スループットに含める）
    const ms = performance.now() - t0;
    latencies.push(ms);
    if (res.ok) ok++;
    else failed++;
  } catch {
    failed++;
  } finally {
    clearTimeout(timer);
  }
}

async function worker() {
  while (next < totalRequests) {
    const i = next++;
    await hit(paths[i % paths.length]);
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
}

const start = performance.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const elapsedSec = (performance.now() - start) / 1000;

const sorted = [...latencies].sort((a, b) => a - b);
const report = {
  target: base,
  paths,
  concurrency,
  totalRequests,
  ok,
  failed,
  elapsedSec: Number(elapsedSec.toFixed(2)),
  rps: Number((totalRequests / elapsedSec).toFixed(1)),
  latencyMs: {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: Math.round(sorted[sorted.length - 1] ?? 0),
  },
};
console.log(JSON.stringify(report, null, 2));

// 失敗が多い／p95 が極端な場合は非0で終了（CI の閾値ゲートに使える）。
const errRateMax = Number(process.env.LOADTEST_MAX_ERROR_RATE ?? 0.1);
const p95Max = Number(process.env.LOADTEST_MAX_P95_MS ?? 0); // 0=チェックしない
const errRate = totalRequests ? failed / totalRequests : 0;
if (errRate > errRateMax) {
  console.error(`FAIL: error rate ${(errRate * 100).toFixed(1)}% > ${errRateMax * 100}%`);
  process.exit(1);
}
if (p95Max > 0 && report.latencyMs.p95 > p95Max) {
  console.error(`FAIL: p95 ${report.latencyMs.p95}ms > ${p95Max}ms`);
  process.exit(1);
}
console.log("OK: load test within thresholds.");
