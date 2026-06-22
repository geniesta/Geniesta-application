#!/usr/bin/env node
// 合成監視（157）。主要導線の死活＋データ源の縮退を外形から定期チェックする土台。
// 使い方: SYNTHETIC_URL=https://example.com node scripts/synthetic-check.mjs
//   - /api/health が HTTP 200 か（アプリ死活）
//   - status==="ok" か（全源が健全か。degraded はアプリ稼働だが要注意で警告終了）
//   - 主要導線（/ と /status）が 200 を返すか
// graceful degradation 前提なので、degraded は「停止」ではなく「警告」として扱う。

const base = process.env.SYNTHETIC_URL;
if (!base) {
  console.log("SYNTHETIC_URL 未設定のためスキップ（土台のみ・ローカル/CI で URL を渡すと実行）。");
  process.exit(0);
}

const TIMEOUT_MS = Number(process.env.SYNTHETIC_TIMEOUT_MS ?? 10_000);

async function get(path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(new URL(path, base), { signal: ctrl.signal });
    const body = await res.text();
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

let failed = false;
let warned = false;

// 1) 主要導線の死活
for (const path of ["/", "/status"]) {
  try {
    const { status } = await get(path);
    if (status !== 200) {
      console.error(`✗ ${path} → HTTP ${status}`);
      failed = true;
    } else {
      console.log(`✓ ${path} → 200`);
    }
  } catch (e) {
    console.error(`✗ ${path} → ${e instanceof Error ? e.message : e}`);
    failed = true;
  }
}

// 2) ヘルス（源ごとの縮退）
try {
  const { status, body } = await get("/api/health");
  if (status !== 200) {
    console.error(`✗ /api/health → HTTP ${status}`);
    failed = true;
  } else {
    const health = JSON.parse(body);
    const degraded = (health.sources ?? []).filter((s) => s.state !== "ok");
    if (health.status !== "ok" || degraded.length > 0) {
      console.warn(
        `⚠ health=degraded: ${degraded.map((s) => `${s.source}(${s.breaker})`).join(", ") || "n/a"}`,
      );
      warned = true;
    } else {
      console.log(`✓ /api/health → ok (uptime ${health.uptimeSec}s)`);
    }
  }
} catch (e) {
  console.error(`✗ /api/health → ${e instanceof Error ? e.message : e}`);
  failed = true;
}

if (failed) {
  console.error("合成監視: 失敗（死活 NG）");
  process.exit(1);
}
if (warned) {
  console.warn("合成監視: 縮退あり（アプリは稼働・要確認）");
  // 縮退は「停止」ではない。アラート閾値運用は呼び出し側に委ねるため exit 0。
}
console.log("合成監視: OK");
process.exit(0);
