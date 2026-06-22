// テーマ（システム / ライト / ダーク / 時刻連動）。既定は "system"（OS 設定に追従）。
// localStorage に保存し、<html> の .dark クラスで反映（FOUC 回避は layout の head スクリプト）。

const KEY = "geniesta:theme";
const EVENT = "geniesta:theme-change";

export type Theme = "system" | "light" | "dark" | "time";

// 時刻連動の夜間帯（ローカル時刻）。18:00〜翌 06:00 をダークにする。
export const NIGHT_START = 18;
export const NIGHT_END = 6;

export function getTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "light" || v === "dark" || v === "time" ? v : "system";
  } catch {
    return "system";
  }
}

function systemDark(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
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
  if (t === "time") return isNight();
  return systemDark(); // system
}

/** 現在のテーマ設定を実際の .dark クラスへ反映する。 */
export function applyTheme(t: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveDark(t));
}

export function setTheme(t: Theme): void {
  if (typeof window === "undefined") return;
  try {
    if (t === "system") window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, t);
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
  return "system";
}

export function subscribeTheme(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onChange = () => {
    cached = getTheme();
    cb();
  };
  // system 設定中は OS のダーク切替にも追従する。
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onOs = () => {
    if (getTheme() === "system") applyTheme("system");
  };
  window.addEventListener(EVENT, onChange);
  mq.addEventListener("change", onOs);
  return () => {
    window.removeEventListener(EVENT, onChange);
    mq.removeEventListener("change", onOs);
  };
}
