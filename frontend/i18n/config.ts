// 対応ロケール。既定は日本語。i18n ルーティングは使わず cookie でロケールを保持する
// （既存URL・ルート構成を壊さない next-intl の公式パターン）。
export const LOCALES = ["ja", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ja";
export const LOCALE_COOKIE = "locale";

export function isLocale(v: string | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

// ロケール cookie を書き込む（クライアント）。1年保持・lax。
export function setLocaleCookie(locale: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
