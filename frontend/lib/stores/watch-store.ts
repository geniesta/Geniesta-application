// ウォッチ/ブックマーク（採用検討中の依存を貯める・B16）。owner/repo の slug 配列を
// localStorage に保持。サーバー非依存・クライアント専用。比較リストと同じ同期方式。

const KEY = "geniesta:watch";
const EVENT = "geniesta:watch-change";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr)
      ? arr.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

// useSyncExternalStore は変更なしの間は同一参照を返す必要がある（安定参照）。
const EMPTY: string[] = [];
let cached: string[] | null = null;

function refresh(): void {
  cached = read();
}

function write(list: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  cached = list;
  window.dispatchEvent(new Event(EVENT));
}

export function getWatchSnapshot(): string[] {
  if (cached === null) cached = read();
  return cached;
}

export function getWatchServerSnapshot(): string[] {
  return EMPTY;
}

/** 追加/削除のトグル（上限なし＝検討中の依存をいくつでも貯められる）。 */
export function toggleWatch(slug: string): void {
  const s = slug.toLowerCase();
  const list = read();
  write(list.includes(s) ? list.filter((x) => x !== s) : [...list, s]);
}

export function removeWatch(slug: string): void {
  write(read().filter((x) => x !== slug.toLowerCase()));
}

export function subscribeWatch(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    refresh();
    cb();
  };
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
