// 「最近見たパッケージ/リポジトリ」を localStorage に保持（サーバー非依存・プライバシー配慮）。
// 詳細ページ閲覧時に記録し、ホームで提示する。最大件数で打ち切り。

const KEY = "geniesta:recent";
const EVENT = "geniesta:recent-change";
const MAX = 8;

export type RecentItem = { owner: string; repo: string };

function read(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr)
      ? arr.filter(
          (x): x is RecentItem =>
            !!x &&
            typeof (x as RecentItem).owner === "string" &&
            typeof (x as RecentItem).repo === "string",
        )
      : [];
  } catch {
    return [];
  }
}

let cached: RecentItem[] | null = null;
const EMPTY: RecentItem[] = [];

/** 閲覧を記録（先頭へ・重複除去・最大件数）。 */
export function recordRecent(owner: string, repo: string): void {
  if (typeof window === "undefined") return;
  const key = `${owner}/${repo}`.toLowerCase();
  const next = [
    { owner, repo },
    ...read().filter((x) => `${x.owner}/${x.repo}`.toLowerCase() !== key),
  ].slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  cached = next;
  window.dispatchEvent(new Event(EVENT));
}

/** 履歴をすべて消去（B26 誤入力等で残った履歴をクリアできる）。 */
export function clearRecent(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  cached = [];
  window.dispatchEvent(new Event(EVENT));
}

export function getRecentSnapshot(): RecentItem[] {
  if (cached === null) cached = read();
  return cached;
}

export function getRecentServerSnapshot(): RecentItem[] {
  return EMPTY;
}

export function subscribeRecent(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    cached = read();
    cb();
  };
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
