// 【概念テスト】対象: @/lib/server/external（singleFlight）＋ @/lib/server/observability
// （assessDataQuality・サーキットブレーカ・残枠）。信頼性(reliability)という関心が2ファイルに
// またがるため、ファイル名は対象ファイル名でなく振る舞いで命名（external.test/observability は別途存在）。
import { describe, it, expect, vi } from "vitest";
import { singleFlight } from "@/lib/server/external";
import {
  tracked,
  snapshot,
  recordRate,
  observeRateHeaders,
  recordEvent,
  captureError,
  notifyAlert,
  CircuitOpenError,
  RateLimitedError,
  assessDataQuality,
} from "@/lib/server/observability";

// observability は globalThis に集計を載せる（プロセス共有）ため、
// テスト間の干渉を避けて一意な source 名を使う。
const fail = () => Promise.reject(new Error("boom"));

describe("assessDataQuality（80 データ品質の自動検査）", () => {
  it("異常が無ければ ok=true・flags 空", () => {
    const q = assessDataQuality({
      sources: [{ source: "github", degradedRate: 0.05, lastOkAgeSec: 30 }],
      search: { total: 100, zeroRate: 0.1 },
    });
    expect(q.ok).toBe(true);
    expect(q.flags).toEqual([]);
  });
  it("縮退率が高い源を degraded:<source> で検知", () => {
    const q = assessDataQuality({
      sources: [{ source: "npm", degradedRate: 0.5, lastOkAgeSec: 10 }],
      search: { total: 0, zeroRate: null },
    });
    expect(q.ok).toBe(false);
    expect(q.flags).toContain("degraded:npm");
  });
  it("鮮度劣化（24h 以上）を stale:<source> で検知", () => {
    const q = assessDataQuality({
      sources: [{ source: "pypi", degradedRate: 0, lastOkAgeSec: 90_000 }],
      search: { total: 0, zeroRate: null },
    });
    expect(q.flags).toContain("stale:pypi");
  });
  it("検索0件率が高い（母数十分）と search_high_zero_rate", () => {
    const q = assessDataQuality({
      sources: [],
      search: { total: 50, zeroRate: 0.6 },
    });
    expect(q.flags).toContain("search_high_zero_rate");
  });
  it("母数が小さいうちは0件率で警告しない（誤検知防止）", () => {
    const q = assessDataQuality({
      sources: [],
      search: { total: 3, zeroRate: 1 },
    });
    expect(q.flags).not.toContain("search_high_zero_rate");
  });
});

describe("singleFlight（118 スタンピード対策）", () => {
  it("同一キーの同時実行は実フェッチを1本に束ねる", async () => {
    let calls = 0;
    const fn = () =>
      new Promise<number>((r) => setTimeout(() => r(++calls), 10));
    const [a, b] = await Promise.all([
      singleFlight("k1", fn),
      singleFlight("k1", fn),
    ]);
    expect(calls).toBe(1); // 2 回呼んでも実行は1回
    expect(a).toBe(b);
  });

  it("settle 後はキーが解放され、次回は再実行される", async () => {
    let calls = 0;
    const fn = () => Promise.resolve(++calls);
    await singleFlight("k2", fn);
    await singleFlight("k2", fn);
    expect(calls).toBe(2);
  });
});

describe("サーキットブレーカ（111）", () => {
  it("連続5失敗で open し、以降は fn を呼ばず即失敗する", async () => {
    const src = "test-breaker-open";
    for (let i = 0; i < 5; i++) {
      await expect(tracked(src, fail)).rejects.toThrow();
    }
    const trial = vi.fn().mockResolvedValue(1);
    await expect(tracked(src, trial)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(trial).not.toHaveBeenCalled(); // fail-fast（落ちた依存を叩かない）

    const s = snapshot().sources.find((x) => x.source === src);
    expect(s?.breaker).toBe("open");
    expect(s?.shortCircuited).toBeGreaterThanOrEqual(1);
  });

  it("途中で1回でも成功すれば連続失敗はリセットされ open しない", async () => {
    const src = "test-breaker-reset";
    for (let i = 0; i < 4; i++) await tracked(src, fail).catch(() => {});
    await tracked(src, async () => 1); // 成功でリセット
    for (let i = 0; i < 4; i++) await tracked(src, fail).catch(() => {});
    const trial = vi.fn().mockResolvedValue(1);
    await tracked(src, trial); // まだ閾値未満なので通る
    expect(trial).toHaveBeenCalledTimes(1);

    const s = snapshot().sources.find((x) => x.source === src);
    expect(s?.breaker).not.toBe("open");
  });
});

describe("レート制限の一元管理（112）", () => {
  it("observeRateHeaders は x-ratelimit-* を解析して snapshot.rates に載せる", () => {
    const reset = Math.floor(Date.now() / 1000) + 3600;
    observeRateHeaders(
      "test-rate-headers",
      new Headers({
        "x-ratelimit-limit": "5000",
        "x-ratelimit-remaining": "4321",
        "x-ratelimit-reset": String(reset),
      }),
    );
    const r = snapshot().rates.find((x) => x.source === "test-rate-headers");
    expect(r?.remaining).toBe(4321);
    expect(r?.limit).toBe(5000);
    expect(r?.used).toBe(679);
    expect(r?.resetInSec).toBeGreaterThan(0);
  });

  it("残枠0かつ reset 前なら fn を呼ばず事前 fail-fast する", async () => {
    const src = "test-rate-block";
    recordRate(src, {
      remaining: 0,
      limit: 100,
      reset: Math.floor(Date.now() / 1000) + 3600,
    });
    const fn = vi.fn().mockResolvedValue(1);
    await expect(tracked(src, fn)).rejects.toBeInstanceOf(RateLimitedError);
    expect(fn).not.toHaveBeenCalled();

    const s = snapshot().sources.find((x) => x.source === src);
    expect(s?.rateBlocked).toBeGreaterThanOrEqual(1);
  });

  it("reset を過ぎていれば残枠0でも通す（自己回復）", async () => {
    const src = "test-rate-recover";
    recordRate(src, {
      remaining: 0,
      limit: 100,
      reset: Math.floor(Date.now() / 1000) - 10, // 既に過去
    });
    const fn = vi.fn().mockResolvedValue(1);
    await tracked(src, fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("データ鮮度・縮退率（155 / 152）", () => {
  it("成功すると lastOkAgeSec が記録される", async () => {
    const src = "test-freshness";
    await tracked(src, async () => 1);
    const s = snapshot().sources.find((x) => x.source === src);
    expect(s?.lastOkAgeSec).not.toBeNull();
    expect(s?.lastOkAgeSec).toBeGreaterThanOrEqual(0);
  });

  it("縮退率は (失敗+遮断) / 総試行で算出される", async () => {
    const src = "test-degraded-rate";
    await tracked(src, async () => 1); // 成功1
    await tracked(src, fail).catch(() => {}); // 失敗1
    const s = snapshot().sources.find((x) => x.source === src);
    // 総試行2・縮退1 → 0.5
    expect(s?.degradedRate).toBe(0.5);
  });
});

describe("検索0件率 / エラー seam（156 / 154）", () => {
  it("search / search_zero から 0件率を算出する", () => {
    const before = snapshot().search;
    recordEvent("search");
    recordEvent("search");
    recordEvent("search_zero");
    const after = snapshot().search;
    expect(after.total).toBe(before.total + 2);
    expect(after.zero).toBe(before.zero + 1);
    expect(after.zeroRate).not.toBeNull();
  });

  it("許可外イベントは記録しない", () => {
    const before = snapshot().events["bogus_event"] ?? 0;
    recordEvent("bogus_event");
    const after = snapshot().events["bogus_event"] ?? 0;
    expect(after).toBe(before);
  });

  it("captureError / notifyAlert は webhook 未設定でも例外を投げない", () => {
    expect(() => captureError("test", new Error("x"), { a: 1 })).not.toThrow();
    expect(() => notifyAlert("test_incident", { source: "x" })).not.toThrow();
  });
});
