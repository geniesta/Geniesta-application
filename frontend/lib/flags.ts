// フィーチャーフラグ基盤（148）。EXT 機能を環境変数で段階公開する。
// 既定はすべて ON＝現行挙動を保つ（後方互換）。OFF にしたい時だけ env を "0"/"false" に。
// サーバー側専用（取得・集約はサーバーで完結する設計のため・NFR-5）。

function flag(name: string, defaultOn: boolean): boolean {
  const v = process.env[name];
  if (v == null || v.trim() === "") return defaultOn; // 未設定は既定
  const s = v.trim().toLowerCase();
  if (s === "0" || s === "false" || s === "off" || s === "no") return false;
  return true;
}

/** 機能フラグ（既定は現行挙動を維持）。新規 EXT は false 既定で入れて段階公開する。 */
export const flags = {
  // 脆弱性の OSV クロスチェック（E46）。落ちている/不要な環境で切れるように。
  osvCrossCheck: flag("FEATURE_OSV_CROSSCHECK", true),
  // EPSS 併記（E43）。
  epss: flag("FEATURE_EPSS", true),
  // 比較機能（T191）。
  compare: flag("FEATURE_COMPARE", true),
} as const;

export type FeatureFlag = keyof typeof flags;
