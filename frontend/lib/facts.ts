// 整形ユーティリティ。判定はしない（信頼の状態判定は lib/trust.ts が担う）。
// テスト容易性のため、時刻に依存する関数は now を注入できる。

import type { Repo } from "@/lib/types";
import { isSourceAvailable } from "@/lib/licenses";

/** 相対日数（負にはしない）。 */
export function daysAgo(iso: string, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));
}

export type Locale = "ja" | "en";

/** "今日" / "3日前" / "5ヶ月前" / "2年前"（en: "today" / "3 days ago" …）。既定は ja。 */
export function relativeLabel(
  iso: string,
  now: number = Date.now(),
  locale: Locale = "ja",
): string {
  const d = daysAgo(iso, now);
  if (locale === "en") {
    if (d < 1) return "today";
    if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
    if (d < 365) {
      const m = Math.floor(d / 30);
      return `${m} month${m === 1 ? "" : "s"} ago`;
    }
    const y = Math.floor(d / 365);
    return `${y} year${y === 1 ? "" : "s"} ago`;
  }
  if (d < 1) return "今日";
  if (d < 30) return `${d}日前`;
  if (d < 365) return `${Math.floor(d / 30)}ヶ月前`;
  return `${Math.floor(d / 365)}年前`;
}

/** 数値を 12,400 のように区切る。 */
export function num(n: number): string {
  return n.toLocaleString("en-US");
}

// ライセンスは GitHub の自動検出（Licensee による LICENSE ファイル走査）の結果を
// そのまま事実として扱う。良し悪しの判定はしないが、「OSI 承認の OSS か否か」は
// 客観的な区分なので事実として示す。
//   spdx             … OSI 承認の OSS（MIT / Apache-2.0 / GPL …）
//   source-available … 公開はされるが OSI 承認ではない（SSPL / BUSL / Elastic 等）
//   custom           … LICENSE はあるが既知の SPDX に対応づかない（spdx_id = "NOASSERTION"）
//   none             … LICENSE ファイルを検出できない（= ライセンスが無い、とは断定しない）
export type LicenseKind = "spdx" | "source-available" | "custom" | "none";

export type LicenseInfo = {
  kind: LicenseKind;
  label: string; // 詳細ページ用
  short: string; // カード用（短い）
  sourceHref: string; // 出典（リポジトリ＝GitHub の検出結果が見える場所）
};

export function licenseInfo(repo: Repo): LicenseInfo {
  const id = repo.license?.spdx_id;
  const sourceHref = repo.html_url;
  if (isSourceAvailable(id)) {
    return { kind: "source-available", label: id!, short: id!, sourceHref };
  }
  if (id && id !== "NOASSERTION") {
    return { kind: "spdx", label: id, short: id, sourceHref };
  }
  if (id === "NOASSERTION") {
    return { kind: "custom", label: "独自ライセンス", short: "独自", sourceHref };
  }
  return { kind: "none", label: "ライセンス検出なし", short: "なし", sourceHref };
}
