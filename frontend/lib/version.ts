// 軽量なバージョン比較とレンジ判定（依存なし）。
// GHSA の vulnerableVersionRange（例: ">= 4.0.0, < 4.17.21" / "<= 1.2.3" / "= 1.0.0"）を評価する。
// semver 系（npm/cargo/go）は正確。PEP440/Maven 等は近似（プレリリース等は厳密でない）。

/** 2 つのバージョン文字列を比較（-1 / 0 / 1）。数値セグメントは数値比較。 */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/i, "").split(/[.+-]/);
  const pb = b.replace(/^v/i, "").split(/[.+-]/);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const sa = pa[i] ?? "0";
    const sb = pb[i] ?? "0";
    const na = Number.parseInt(sa, 10);
    const nb = Number.parseInt(sb, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) {
      if (na !== nb) return na < nb ? -1 : 1;
    } else if (sa !== sb) {
      return sa < sb ? -1 : 1;
    }
  }
  return 0;
}

/** version が range（カンマ区切りの AND 制約）を満たすか。 */
export function satisfiesRange(version: string, range: string): boolean {
  const parts = range.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return false;
  return parts.every((part) => {
    const m = part.match(/^(>=|<=|>|<|=|==)?\s*(.+)$/);
    if (!m) return false;
    const op = m[1] ?? "=";
    const c = compareVersions(version, m[2].trim());
    switch (op) {
      case ">=":
        return c >= 0;
      case "<=":
        return c <= 0;
      case ">":
        return c > 0;
      case "<":
        return c < 0;
      default:
        return c === 0;
    }
  });
}

/** メジャー番号（先頭の数値セグメント）。取れなければ null（PEP440 等の非数値先頭も null）。 */
export function majorOf(version: string): number | null {
  const m = version.replace(/^[v=\s]+/i, "").match(/^(\d+)/);
  return m ? Number.parseInt(m[1], 10) : null;
}

// E47 修正版へのアップグレード難易度の目安：メジャー跨ぎ（破壊的変更の可能性）か否か。
export type UpgradeKind = "major" | "minorPatch";
/**
 * current → target のアップグレードが「メジャー跨ぎ」か「マイナー/パッチ」か。
 * どちらかのメジャーが判定できない、または target <= current のときは null（目安を出さない）。
 */
export function upgradeKind(current: string, target: string): UpgradeKind | null {
  const a = majorOf(current);
  const b = majorOf(target);
  if (a === null || b === null) return null;
  if (compareVersions(target, current) <= 0) return null; // 既に同等以上＝対象外
  return b > a ? "major" : "minorPatch";
}

/** アドバイザリの修正範囲群から、最も低い firstPatched 版（＝最短の修正版）を返す。無ければ null。 */
export function earliestFixed(
  ranges: Array<{ firstPatched?: string | null }>,
): string | null {
  const fixed = ranges
    .map((r) => r.firstPatched)
    .filter((v): v is string => !!v)
    .sort(compareVersions);
  return fixed[0] ?? null;
}

/** version が、いずれかの脆弱範囲に該当するか（＝そのバージョンが影響を受けるか）。 */
export function isAffected(
  version: string,
  ranges: Array<{ range: string }>,
): boolean {
  return ranges.some((r) => {
    try {
      return satisfiesRange(version, r.range);
    } catch {
      return false;
    }
  });
}
