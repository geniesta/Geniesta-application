// 比較リスト（owner/repo の slug 配列）をブラウザ localStorage に保持する。
// サーバー非依存・クライアント専用。変更は同一タブ内 custom event ＋ 別タブ storage event で同期。

const KEY = "geniesta:compare";
const EVENT = "geniesta:compare-change";
export const COMPARE_MAX = 3; // 横並び比較の上限（読みやすさ優先）

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// useSyncExternalStore は getSnapshot が変更なしの間は同一参照を返す必要がある
// （毎回新配列だと無限再レンダリングになる）。キャッシュして変更時だけ作り直す。
const EMPTY: string[] = [];
let cached: string[] | null = null;

function refresh(): void {
  cached = read();
}

function write(list: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  cached = list; // 同一タブのスナップショットを即更新（安定参照）。
  window.dispatchEvent(new Event(EVENT));
}

/** 現在の比較リスト（非リアクティブな一回読み用）。 */
export function getCompare(): string[] {
  return read();
}

/** useSyncExternalStore 用スナップショット（クライアント・安定参照）。 */
export function getCompareSnapshot(): string[] {
  if (cached === null) cached = read();
  return cached;
}

/** useSyncExternalStore 用サーバースナップショット（常に空・安定参照）。 */
export function getCompareServerSnapshot(): string[] {
  return EMPTY;
}

/** 追加/削除のトグル。上限超過時は追加しない（false を返す）。 */
export function toggleCompare(slug: string): boolean {
  const s = slug.toLowerCase();
  const list = read();
  if (list.includes(s)) {
    write(list.filter((x) => x !== s));
    return true;
  }
  if (list.length >= COMPARE_MAX) return false;
  write([...list, s]);
  return true;
}

export function removeCompare(slug: string): void {
  write(read().filter((x) => x !== slug.toLowerCase()));
}

export function clearCompare(): void {
  write([]);
}

/** 変更購読（同一タブの custom event ＋ 別タブの storage event）。通知前にキャッシュを更新。 */
export function subscribeCompare(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    refresh(); // React が getSnapshot を読む前に最新へ。
    cb();
  };
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
