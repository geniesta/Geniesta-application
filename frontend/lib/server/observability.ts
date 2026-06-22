import "server-only";
// 軽量な可観測性（サーバー側専用・依存なし）。
// 目的: 外部データ源ごとの呼び出し回数・p50/p95 レイテンシ・失敗率・レート制限ヒット・
// GitHub 残枠を計測し、構造化ログ＋ /api/metrics で見えるようにする。
// 永続ストアは持たない（プロセス内メモリ＝デプロイ単位の目安）。本番は Sentry/OTel 等に送る土台。

type SourceStat = {
  calls: number;
  errors: number; // 4xx/5xx/例外
  rateLimited: number; // 403/429
  shortCircuited: number; // ブレーカ open で fail-fast した回数
  rateBlocked: number; // 残枠 0 を検知して事前に fail-fast した回数
  lastOkAt: number | null; // 直近で成功した時刻（epoch ms・155 データ鮮度）
  durations: number[]; // ミリ秒（直近を bound）
};

// サーキットブレーカの状態（連続失敗で一時的に open＝即失敗して落ちた依存を叩き続けない）。
type Breaker = { fails: number; openUntil: number };

// レート制限の残枠（源が返すヘッダから取得・112 一元管理）。reset は epoch ミリ秒。
type RateInfo = { remaining: number; limit: number; reset: number | null; at: number };

const MAX_SAMPLES = 500; // メモリ保護（ソースごとの保持上限）

// ブレーカの閾値: 連続 N 失敗で open、COOLDOWN の間は fail-fast。1 回でも成功すれば即 close。
const BREAKER_THRESHOLD = 5;
const BREAKER_COOLDOWN_MS = 30_000;

/** ブレーカ open による fail-fast を表す例外（呼び出し側の縮退で握られる）。 */
export class CircuitOpenError extends Error {
  readonly circuitOpen = true;
  constructor(source: string) {
    super(`circuit open: ${source}`);
    this.name = "CircuitOpenError";
  }
}

/** 残枠 0 検知による事前 fail-fast を表す例外（reset までは叩かない）。 */
export class RateLimitedError extends Error {
  readonly rateLimited = true;
  constructor(source: string) {
    super(`rate limited: ${source}`);
    this.name = "RateLimitedError";
  }
}

// RSC と route handler はバンドルが分かれモジュール singleton を共有しないため、
// プロセス内で確実に共有できる globalThis に集計を載せる（dev/本番とも同一プロセス内で一貫）。
type Store = {
  stats: Map<string, SourceStat>;
  breakers: Map<string, Breaker>;
  rates: Map<string, RateInfo>; // 源ごとの残枠（112 一元管理）
  githubRate: { remaining: number; limit: number; at: number } | null;
  vitals: Map<string, number[]>; // Core Web Vitals（name → 値の配列）
  events: Map<string, number>; // プロダクトイベント（name → 件数）
};
const g = globalThis as unknown as { __geniestaObs?: Store };
const store: Store = (g.__geniestaObs ??= {
  stats: new Map(),
  breakers: new Map(),
  rates: new Map(),
  githubRate: null,
  vitals: new Map(),
  events: new Map(),
});
// HMR/旧バージョンの store が残っていてもフィールド欠損で落ちないよう補完。
store.stats ??= new Map();
store.breakers ??= new Map();
store.rates ??= new Map();
store.vitals ??= new Map();
store.events ??= new Map();
const stats = store.stats;

function get(source: string): SourceStat {
  let s = stats.get(source);
  if (!s) {
    s = {
      calls: 0,
      errors: 0,
      rateLimited: 0,
      shortCircuited: 0,
      rateBlocked: 0,
      lastOkAt: null,
      durations: [],
    };
    stats.set(source, s);
  }
  // HMR で旧 shape（新フィールド無し）が残っても落ちないよう補完。
  s.shortCircuited ??= 0;
  s.rateBlocked ??= 0;
  s.lastOkAt ??= null; // HMR の旧 shape（undefined）を null に補完
  return s;
}

function breaker(source: string): Breaker {
  let b = store.breakers.get(source);
  if (!b) {
    b = { fails: 0, openUntil: 0 };
    store.breakers.set(source, b);
  }
  return b;
}

/** ブレーカ状態の文字列（closed=正常 / half-open=試行中 / open=遮断中）。 */
function breakerState(b: Breaker, now: number): "closed" | "half-open" | "open" {
  if (now < b.openUntil) return "open";
  if (b.fails >= BREAKER_THRESHOLD) return "half-open"; // cooldown 経過後の試行枠
  return "closed";
}

function structuredLog(record: Record<string, unknown>): void {
  // 1 行 JSON（trace 収集基盤に取り込みやすい）。
  try {
    console.log(JSON.stringify({ t: "ext", ...record }));
  } catch {
    // ログ失敗は握りつぶす（本処理に影響させない）。
  }
}

/** 外部呼び出しを計測してラップする。失敗時も記録して再 throw（呼び出し側の縮退は不変）。
 * サーキットブレーカ付き: 連続失敗が閾値を超えた源は cooldown の間 fail-fast し、落ちた依存を叩き続けない。 */
export async function tracked<T>(
  source: string,
  fn: () => Promise<T>,
  startMs: number = perfNow(),
): Promise<T> {
  const s = get(source);
  const b = breaker(source);
  const now = Date.now();
  // open（cooldown 中）なら即失敗。呼び出し側は通常の失敗と同じく縮退する。
  if (now < b.openUntil) {
    s.shortCircuited++;
    structuredLog({ source, outcome: "short_circuit" });
    throw new CircuitOpenError(source);
  }
  // 残枠 0 を検知済みで reset 前なら、無駄に叩かず事前 fail-fast（112 一元管理の“管理”側）。
  const r = store.rates.get(source);
  if (r && r.remaining <= 0 && r.reset != null && now < r.reset) {
    s.rateBlocked++;
    structuredLog({ source, outcome: "rate_blocked", resetMs: r.reset - now });
    throw new RateLimitedError(source);
  }
  s.calls++;
  try {
    const result = await fn();
    record(s, source, startMs, "ok");
    s.lastOkAt = Date.now(); // 155 データ鮮度（最終成功時刻）
    b.fails = 0; // 1 回でも成功すれば close に復帰
    b.openUntil = 0;
    return result;
  } catch (e) {
    s.errors++;
    const status =
      typeof e === "object" && e && "status" in e
        ? (e as { status?: number }).status
        : undefined;
    if (status === 403 || status === 429) s.rateLimited++;
    record(s, source, startMs, "error", status);
    b.fails++;
    if (b.fails >= BREAKER_THRESHOLD) {
      // open へ遷移（or half-open 試行が再失敗）＝インシデント。アラートを発報する。
      b.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
      notifyAlert("circuit_open", { source, fails: b.fails, status });
    }
    throw e;
  }
}

function record(
  s: SourceStat,
  source: string,
  startMs: number,
  outcome: "ok" | "error",
  status?: number,
): void {
  const dur = Math.round(perfNow() - startMs);
  s.durations.push(dur);
  if (s.durations.length > MAX_SAMPLES) s.durations.shift();
  structuredLog({ source, outcome, ms: dur, status });
}

/** 源ごとのレート残枠を記録（112 一元管理）。reset は epoch 秒（任意）。 */
export function recordRate(
  source: string,
  rate: { remaining: number; limit: number; reset?: number | null },
): void {
  store.rates.set(source, {
    remaining: rate.remaining,
    limit: rate.limit,
    reset: rate.reset != null ? rate.reset * 1000 : null, // 秒→ミリ秒
    at: Date.now(),
  });
}

/** レスポンスヘッダから標準的なレート制限値を読み取り記録する（x-ratelimit-* / ratelimit-*）。 */
export function observeRateHeaders(source: string, headers: Headers): void {
  const h = (...names: string[]): string | null => {
    for (const n of names) {
      const v = headers.get(n);
      if (v != null) return v;
    }
    return null;
  };
  const rem = h("x-ratelimit-remaining", "ratelimit-remaining");
  const lim = h("x-ratelimit-limit", "ratelimit-limit");
  if (rem == null || lim == null) return;
  const reset = h("x-ratelimit-reset", "ratelimit-reset");
  recordRate(source, {
    remaining: Number(rem),
    limit: Number(lim),
    reset: reset != null ? Number(reset) : null,
  });
}

/** GitHub のレート残枠を記録（後方互換の github フィールド用。generic な残枠は observeRateHeaders 側）。 */
export function recordGithubRate(remaining: number, limit: number): void {
  store.githubRate = { remaining, limit, at: Date.now() };
}

// ── 154 エラートラッキング & アラート ───────────────────────────────────────────
/** エラー集約の単一の seam。構造化ログに出し、ここを Sentry/OTel へ転送する一点にする。
 * Sentry を使う場合は SENTRY_DSN を入口にこの関数内で forward する（依存を増やさないため seam に留める）。 */
export function captureError(
  scope: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  const message = error instanceof Error ? error.message : String(error);
  const digest =
    typeof error === "object" && error && "digest" in error
      ? (error as { digest?: string }).digest
      : undefined;
  structuredLog({ t: "error", level: "error", scope, message, digest, ...extra });
  // 例: if (process.env.SENTRY_DSN) Sentry.captureException(error, { extra });
}

/** 重大イベント（インシデント）を任意の Webhook へ通知（ALERT_WEBHOOK_URL・Slack 互換・best-effort）。
 * 未設定ならログのみ。157 合成監視と並び、120 SLO の“アラート運用”の入口。 */
export function notifyAlert(event: string, detail: Record<string, unknown>): void {
  structuredLog({ t: "alert", event, ...detail });
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `[geniesta] ${event}: ${JSON.stringify(detail)}` }),
  }).catch(() => {}); // 通知失敗は本処理に影響させない
}

// プロダクト分析で許可するイベント名（North Star＝出典クリック率の計測が核）。
//   detail_view   … 詳細ページ表示（出典クリック率の分母）
//   source_click  … 出典リンクのクリック（分子＝事実が実際に参照された）
//   compare_open  … 比較ページ到達
//   search          … 検索実行（156 0件率の分母）
//   search_zero     … 検索が0件（156 0件率の分子＝改善ループの起点）
//   feedback_helpful… 「役立った」（200 フィードバックループ）
//   feedback_wrong  … 「おかしい/事実が違う」（200・事実提示の継続改善の起点）
const ALLOWED_EVENTS = new Set([
  "detail_view",
  "source_click",
  "compare_open",
  "search",
  "search_zero",
  "feedback_helpful",
  "feedback_wrong",
]);

/** プロダクトイベントを記録（許可リスト内のみ・プライバシー配慮で件数だけ）。 */
export function recordEvent(name: string): void {
  if (!ALLOWED_EVENTS.has(name)) return;
  store.events.set(name, (store.events.get(name) ?? 0) + 1);
  structuredLog({ t: "event", name });
}

/** Core Web Vitals を記録（クライアントの useReportWebVitals → /api/vitals 経由）。 */
export function recordVital(name: string, value: number): void {
  let arr = store.vitals.get(name);
  if (!arr) {
    arr = [];
    store.vitals.set(name, arr);
  }
  arr.push(value);
  if (arr.length > MAX_SAMPLES) arr.shift();
  structuredLog({ t: "vital", name, value: Math.round(value) });
}

/** throw を伴わない HTTP 失敗（!res.ok）を計測に反映する（403/429 はレート制限）。 */
export function noteHttpIssue(source: string, status: number): void {
  const s = get(source);
  s.errors++;
  if (status === 403 || status === 429) s.rateLimited++;
  structuredLog({ source, outcome: "error", status });
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export type MetricsSnapshot = {
  sources: Array<{
    source: string;
    calls: number;
    errors: number;
    errorRate: number; // 0..1
    rateLimited: number;
    shortCircuited: number;
    rateBlocked: number;
    degradedRate: number; // 縮退率＝(errors+shortCircuited+rateBlocked)/総試行（152）
    lastOkAgeSec: number | null; // 最終成功からの経過秒（155 データ鮮度）
    breaker: "closed" | "half-open" | "open"; // サーキットブレーカ状態
    p50: number;
    p95: number;
  }>;
  github: { remaining: number; limit: number; ageSec: number } | null;
  // 源ごとの残枠（112 一元管理）。ヘッダを返す源のみ（github-rest/graphql・ecosystems 等）。
  rates: Array<{
    source: string;
    remaining: number;
    limit: number;
    used: number;
    headroom: number; // remaining/limit（0..1）
    resetInSec: number | null;
    ageSec: number;
  }>;
  // Core Web Vitals（実ユーザー計測・p75＝CWV 標準集計）。
  vitals: Array<{ name: string; p75: number; count: number }>;
  // プロダクトイベント件数と North Star（出典クリック率＝source_click / detail_view）。
  events: Record<string, number>;
  northStar: { sourceClickRate: number | null };
  // 検索クエリ分析（156・0件率＝search_zero / search）。改善ループの起点。
  search: { total: number; zero: number; zeroRate: number | null };
  // フィードバック（200・helpful / wrong 件数）。事実提示の継続改善の入力。
  feedback: { helpful: number; wrong: number };
  // 80 データ品質の自動検査（縮退・鮮度劣化・検索0件率の異常を列挙）。
  quality: DataQuality;
};

// 80 データ品質の自動検査の結果（ok＝異常なし／flags＝検知した懸念）。
export type DataQuality = { ok: boolean; flags: string[] };

// しきい値（透明・調整可能）。縮退率 30% 以上、最終成功から 24h 以上、検索0件率 50% 以上を警告。
const QUALITY_DEGRADED_RATE = 0.3;
const QUALITY_STALE_SEC = 86_400;
const QUALITY_ZERO_RATE = 0.5;
const QUALITY_MIN_SEARCHES = 10; // 母数が小さいうちは 0件率で警告しない（誤検知防止）

/**
 * メトリクスから「データ品質の懸念」を導く純関数（80）。
 * - 源ごとの縮退率が高い（degraded:<source>）
 * - 最終成功からの経過が長い＝鮮度劣化（stale:<source>）
 * - 検索の0件率が高い（search_high_zero_rate）
 * 異常が無ければ ok=true・flags=[]。
 */
export function assessDataQuality(input: {
  sources: Array<{
    source: string;
    degradedRate: number;
    lastOkAgeSec: number | null;
  }>;
  search: { total: number; zeroRate: number | null };
}): DataQuality {
  const flags: string[] = [];
  for (const s of input.sources) {
    if (s.degradedRate >= QUALITY_DEGRADED_RATE) flags.push(`degraded:${s.source}`);
    if (s.lastOkAgeSec != null && s.lastOkAgeSec >= QUALITY_STALE_SEC) {
      flags.push(`stale:${s.source}`);
    }
  }
  if (
    input.search.total >= QUALITY_MIN_SEARCHES &&
    (input.search.zeroRate ?? 0) >= QUALITY_ZERO_RATE
  ) {
    flags.push("search_high_zero_rate");
  }
  return { ok: flags.length === 0, flags };
}

/** 現在のメトリクス集計（/api/metrics 用）。 */
export function snapshot(): MetricsSnapshot {
  const now = Date.now();
  const sources = [...stats.entries()]
    .map(([source, s]) => {
      const sorted = [...s.durations].sort((a, b) => a - b);
      const sc = s.shortCircuited ?? 0;
      const rb = s.rateBlocked ?? 0;
      const attempts = s.calls + sc + rb; // 実呼び出し＋事前 fail-fast 含む総試行
      return {
        source,
        calls: s.calls,
        errors: s.errors,
        errorRate: s.calls ? Number((s.errors / s.calls).toFixed(3)) : 0,
        rateLimited: s.rateLimited,
        shortCircuited: sc,
        rateBlocked: rb,
        degradedRate: attempts
          ? Number(((s.errors + sc + rb) / attempts).toFixed(3))
          : 0,
        lastOkAgeSec:
          s.lastOkAt != null ? Math.round((now - s.lastOkAt) / 1000) : null,
        breaker: breakerState(breaker(source), now),
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
      };
    })
    .sort((a, b) => b.calls - a.calls);
  const rates = [...store.rates.entries()]
    .map(([source, r]) => ({
      source,
      remaining: r.remaining,
      limit: r.limit,
      used: Math.max(0, r.limit - r.remaining),
      headroom: r.limit ? Number((r.remaining / r.limit).toFixed(3)) : 0,
      resetInSec:
        r.reset != null ? Math.max(0, Math.round((r.reset - now) / 1000)) : null,
      ageSec: Math.round((now - r.at) / 1000),
    }))
    .sort((a, b) => a.headroom - b.headroom); // 残枠が少ない源を上に
  const gr = store.githubRate;
  const vitals = [...store.vitals.entries()].map(([name, vals]) => {
    const sorted = [...vals].sort((a, b) => a - b);
    const p = percentile(sorted, 75);
    return { name, p75: name === "CLS" ? Number(p.toFixed(3)) : Math.round(p), count: vals.length };
  });
  const events = Object.fromEntries(store.events);
  const views = store.events.get("detail_view") ?? 0;
  const clicks = store.events.get("source_click") ?? 0;
  const searches = store.events.get("search") ?? 0;
  const zeros = store.events.get("search_zero") ?? 0;
  const search = {
    total: searches,
    zero: zeros,
    zeroRate: searches ? Number((zeros / searches).toFixed(3)) : null,
  };
  return {
    sources,
    github: gr
      ? {
          remaining: gr.remaining,
          limit: gr.limit,
          ageSec: Math.round((Date.now() - gr.at) / 1000),
        }
      : null,
    rates,
    vitals,
    events,
    northStar: {
      sourceClickRate: views ? Number((clicks / views).toFixed(3)) : null,
    },
    search,
    feedback: {
      helpful: store.events.get("feedback_helpful") ?? 0,
      wrong: store.events.get("feedback_wrong") ?? 0,
    },
    // 80 データ品質の自動検査（既存集計から導出・追加コストなし）。
    quality: assessDataQuality({ sources, search }),
  };
}

export type HealthReport = {
  status: "ok" | "degraded"; // 1 源でも遮断中なら degraded（ただしアプリ自体は応答可）
  uptimeSec: number;
  sources: Array<{
    source: string;
    state: "ok" | "degraded"; // breaker open/half-open・高失敗率・残枠枯渇
    breaker: "closed" | "half-open" | "open";
    errorRate: number;
    rateLimited: number;
    headroom: number | null; // 残枠割合（ヘッダを返す源のみ・null=不明）
    resetInSec: number | null;
    lastOkAgeSec: number | null; // 最終成功からの経過秒（155 データ鮮度）
    p95: number;
  }>;
};

// プロセス起動時刻（uptime 算出用）。
const startedAt = Date.now();

/** ヘルス/レディネス（/api/health 用）。どの源が今“縮退中”かを返す。
 * アプリは graceful degradation 前提なので、源が落ちても 200 を返し status=degraded で示す。 */
export function health(): HealthReport {
  const now = Date.now();
  const sources = [...stats.entries()]
    .map(([source, s]) => {
      const st = breakerState(breaker(source), now);
      const errorRate = s.calls ? s.errors / s.calls : 0;
      const r = store.rates.get(source);
      const headroom = r && r.limit ? r.remaining / r.limit : null;
      const exhausted =
        r != null && r.remaining <= 0 && r.reset != null && now < r.reset;
      // breaker open/half-open・高失敗率・残枠枯渇のいずれかで degraded。
      const degraded = st !== "closed" || errorRate >= 0.5 || exhausted;
      const sorted = [...s.durations].sort((a, b) => a - b);
      return {
        source,
        state: (degraded ? "degraded" : "ok") as "ok" | "degraded",
        breaker: st,
        errorRate: Number(errorRate.toFixed(3)),
        rateLimited: s.rateLimited,
        headroom: headroom != null ? Number(headroom.toFixed(3)) : null,
        resetInSec:
          r?.reset != null ? Math.max(0, Math.round((r.reset - now) / 1000)) : null,
        lastOkAgeSec:
          s.lastOkAt != null ? Math.round((now - s.lastOkAt) / 1000) : null,
        p95: percentile(sorted, 95),
      };
    })
    .sort((a, b) => a.source.localeCompare(b.source));
  const anyDegraded = sources.some((x) => x.state === "degraded");
  return {
    status: anyDegraded ? "degraded" : "ok",
    uptimeSec: Math.round((now - startedAt) / 1000),
    sources,
  };
}

// Date.now ベースの簡易計時（performance.now が無い環境でも動く）。
function perfNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
