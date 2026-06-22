import "server-only";
// 外部データ源（OSV 等）への接続で共有する汎用ヘルパー。
// すべてサーバー側専用。認証情報はクライアントに露出しない。

// 外部 GET/POST の共通ポリシー：タイムアウト（AbortController）＋ 1 回リトライ（指数バックオフ）。
// 一時的な遅延・5xx・瞬間レート制限を吸収する。
// 429/5xx/タイムアウトのみリトライ（4xx の大半は再試行しても無駄なので即返す）。
const DEFAULT_TIMEOUT_MS = 8000;

export async function resilientFetch(
  url: string,
  init: RequestInit & { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = 1, ...rest } = init;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...rest, signal: ctrl.signal });
      // 429/5xx は一時的とみなしリトライ余地があれば再試行。
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await backoff(attempt);
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e; // タイムアウト/ネットワーク。リトライ余地があれば再試行。
      if (attempt < retries) {
        await backoff(attempt);
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("fetch failed");
}

function backoff(attempt: number): Promise<void> {
  // 250ms, 500ms… の指数バックオフ（軽め。外部に優しく）。
  return new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
}

// ── single-flight（118 キャッシュスタンピード対策）──────────────────────────────
// 同一キーの取得が同時多発したとき、実フェッチを 1 本に束ねて結果を共有する。
// unstable_cache の revalidate 切れ直後など、人気パッケージへ同時アクセスが集中しても
// 外部 API を 1 回しか叩かない（落ちた依存・レート制限への保護）。プロセス内のみ。
const inflight = new Map<string, Promise<unknown>>();

/** key 単位で同時実行を 1 本に集約する。settle 後にエントリは破棄（短命キャッシュではない）。 */
export function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = (async () => {
    try {
      return await fn();
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}
