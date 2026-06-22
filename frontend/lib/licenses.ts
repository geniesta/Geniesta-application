// ライセンスの分類セットと、「OSS → source-available の越境」だけを判定する純関数。
// 誤検知ゼロ設計：両端が“確定した既知ライセンス”のときだけ判断し、曖昧は黙る。

// OSI 承認ではない source-available ライセンス（SPDX ID）。
// ※ "BSL-1.0" は Boost Software License（OSI 承認）なので含めない。Business Source は "BUSL-1.1"。
export const SOURCE_AVAILABLE = new Set(["SSPL-1.0", "BUSL-1.1", "Elastic-2.0"]);

// 「旧側＝確定 OSS」と認める OSI 承認ライセンス（よく使われるもの）。
// ここに無いものは“OSS と断定しない”＝判断保留（黙る）。
export const OSI_OSS = new Set([
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BSL-1.0", // Boost（OSI 承認）
  "ISC",
  "MPL-2.0",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "LGPL-2.1-only",
  "LGPL-2.1-or-later",
  "LGPL-3.0-only",
  "LGPL-3.0-or-later",
  "AGPL-3.0-only",
  "AGPL-3.0-or-later",
  "Unlicense",
  "Zlib",
  "EPL-2.0",
]);

export function isSourceAvailable(id?: string | null): boolean {
  return !!id && SOURCE_AVAILABLE.has(id);
}

// deps.dev が SPDX 化できない（non-standard）ときの表示ラベル。
// 可能なら LICENSE 本文判定で実名（BUSL-1.1 等）に補完する。
export const NON_STANDARD_LABEL = "非標準ライセンス";

// 義務クラス＝「どの引き金で、何のコストが発動するか」。判定（良し悪し）はしない。
// GitHub の license.spdx_id は "GPL-3.0" / "AGPL-3.0" のような短縮形で返るため両形を含める。
export type ObligationClass =
  | "permissive"
  | "weak-copyleft"
  | "strong-copyleft"
  | "network-copyleft"
  | "source-available";

const PERMISSIVE = new Set([
  "MIT",
  "MIT-0",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BSD-3-Clause-Clear",
  "ISC",
  "0BSD",
  "Unlicense",
  "Zlib",
  "BSL-1.0",
]);
const WEAK_COPYLEFT = new Set([
  "LGPL-2.1",
  "LGPL-2.1-only",
  "LGPL-2.1-or-later",
  "LGPL-3.0",
  "LGPL-3.0-only",
  "LGPL-3.0-or-later",
  "MPL-2.0",
  "EPL-1.0",
  "EPL-2.0",
  "CDDL-1.0",
]);
const STRONG_COPYLEFT = new Set([
  "GPL-2.0",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
]);
const NETWORK_COPYLEFT = new Set([
  "AGPL-3.0",
  "AGPL-3.0-only",
  "AGPL-3.0-or-later",
]);

export type Obligation = {
  class: ObligationClass;
  label: string; // クラスの短い名
  trigger: string; // 発動条件＋コスト（事実・no-verdict）
};

/** SPDX から義務クラスを返す。分類できないものは null（推測しない）。 */
export function obligationOf(id?: string | null): Obligation | null {
  if (!id) return null;
  if (PERMISSIVE.has(id))
    return {
      class: "permissive",
      label: "パーミッシブ",
      trigger:
        "発動する義務はほぼ無く、著作権・ライセンス表記の保持のみ（用途・商用を問わない）。",
    };
  if (WEAK_COPYLEFT.has(id))
    return {
      class: "weak-copyleft",
      label: "弱コピーレフト",
      trigger:
        "そのライブラリ自体を改変した場合に改変部の公開が必要。自分のコードには及びにくい。",
    };
  if (STRONG_COPYLEFT.has(id))
    return {
      class: "strong-copyleft",
      label: "強コピーレフト",
      trigger:
        "バンドルして配布すると、自分のアプリ全体のソース公開義務が及びうる（商用かは無関係）。",
    };
  if (NETWORK_COPYLEFT.has(id))
    return {
      class: "network-copyleft",
      label: "ネットワークコピーレフト",
      trigger:
        "GPL に加え、ネット越しに提供しても発動。組み込んで SaaS 提供するとソース公開義務（商用無関係）。",
    };
  if (SOURCE_AVAILABLE.has(id))
    return {
      class: "source-available",
      label: "source-available（非OSI）",
      trigger:
        "公開はされるが OSI 承認ではない。マネージドサービスとして再提供することは不可。内部利用は概ね可。",
    };
  return null;
}

export function isOsiOss(id?: string | null): boolean {
  return !!id && OSI_OSS.has(id);
}

/**
 * 旧／新バージョンのライセンス集合から、「OSS を離脱した越境」だけを返す。
 * 発火条件（precision-first・曖昧は黙る）：
 *   - 旧側に“確定 OSS”が含まれ、旧側には SA も non-standard も無い（＝はっきり OSS だった）
 *   - 新側に OSI 承認 OSS が一つも残っていない（デュアルで OSS が残るなら越境でない）
 *   - 新側が「既知の source-available（SSPL/BUSL/Elastic）」か「non-standard（deps.dev が
 *     SPDX 化できない＝SSPL/BUSL 等はこう出る）」のいずれか
 * deps.dev は SSPL/BUSL/Elastic を多くは "non-standard" と返すため、後者も拾う。
 * ただし non-standard は断定できないので、UI 側で「要確認」とヘッジして提示する。
 * 年号修正・整形・OSS→OSS・null/不明・元から非OSS 等は null。
 */
export function licenseShift(
  oldIds: string[],
  newIds: string[],
): { from: string; to: string } | null {
  const from = oldIds.find(isOsiOss);
  if (!from) return null;
  // 旧側がはっきり OSS だったこと（SA や非標準が混ざっていたら判断保留）
  if (oldIds.some(isSourceAvailable) || oldIds.includes("non-standard")) {
    return null;
  }
  // 新側にまだ OSS が残っているなら越境ではない
  if (newIds.some(isOsiOss)) return null;

  const knownSA = newIds.find(isSourceAvailable);
  if (knownSA) return { from, to: knownSA };
  if (newIds.includes("non-standard")) return { from, to: NON_STANDARD_LABEL };
  return null;
}
