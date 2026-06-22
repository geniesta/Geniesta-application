// テーマ（時刻連動 / ライト / ダーク）。既定は "time"（時刻で自動ダーク切替）。
// localStorage に保存し、<html> の .dark クラスで反映（FOUC 回避は layout の head スクリプト）。

const KEY = "geniesta:theme";
const EVENT = "geniesta:theme-change";

export type Theme = "time" | "light" | "dark";

// 時刻連動の夜間帯（ローカル時刻）。18:00〜翌 06:00 をダークにする。
export const NIGHT_START = 18;
export const NIGHT_END = 6;

export function getTheme(): Theme {
  if (typeof window === "undefined") return "time";
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "light" || v === "dark" || v === "time" ? v : "time";
  } catch {
    return "time";
  }
}

/** いま夜間帯か（時刻連動用）。 */
export function isNight(now: Date = new Date()): boolean {
  const h = now.getHours();
  return h >= NIGHT_START || h < NIGHT_END;
}

/** テーマ設定 → 実際にダークにすべきか。 */
export function resolveDark(t: Theme): boolean {
  if (t === "dark") return true;
  if (t === "light") return false;
  return isNight(); // time（既定）
}

/** 現在のテーマ設定を実際の .dark クラスへ反映する。 */
export function applyTheme(t: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveDark(t));
}

export function setTheme(t: Theme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, t);
  } catch {
    // localStorage 不可でも適用は行う。
  }
  cached = t;
  applyTheme(t);
  window.dispatchEvent(new Event(EVENT));
}

let cached: Theme | null = null;

export function getThemeSnapshot(): Theme {
  if (cached === null) cached = getTheme();
  return cached;
}

export function getThemeServerSnapshot(): Theme {
  return "time";
}

export function subscribeTheme(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onChange = () => {
    cached = getTheme();
    cb();
  };
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
  };
}
