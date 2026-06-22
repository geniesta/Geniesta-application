// 【unit】lib/version のバージョン比較・該当バージョン判定(isAffected)・アップグレード難易度(upgradeKind)を境界値込みで検証。純関数。
import { describe, it, expect } from "vitest";
import {
  compareVersions,
  satisfiesRange,
  isAffected,
  majorOf,
  upgradeKind,
  earliestFixed,
} from "@/lib/version";

describe("compareVersions", () => {
  it("数値セグメントを数値として比較する", () => {
    expect(compareVersions("4.17.21", "4.17.9")).toBe(1); // 21 > 9
    expect(compareVersions("1.2.0", "1.10.0")).toBe(-1); // 2 < 10
    expect(compareVersions("2.0.0", "2.0.0")).toBe(0);
  });
  it("先頭 v と桁数差を許容する", () => {
    expect(compareVersions("v1.2", "1.2.0")).toBe(0);
    expect(compareVersions("1.2.3", "1.2")).toBe(1);
  });
});

describe("satisfiesRange (GHSA vulnerableVersionRange)", () => {
  it("AND 制約（>=, <）を満たす", () => {
    expect(satisfiesRange("4.17.20", ">= 4.0.0, < 4.17.21")).toBe(true);
    expect(satisfiesRange("4.17.21", ">= 4.0.0, < 4.17.21")).toBe(false);
  });
  it("単一の上限/下限/等号", () => {
    expect(satisfiesRange("1.0.0", "<= 1.2.3")).toBe(true);
    expect(satisfiesRange("1.3.0", "<= 1.2.3")).toBe(false);
    expect(satisfiesRange("1.0.0", "= 1.0.0")).toBe(true);
  });
});

describe("isAffected", () => {
  const ranges = [
    { range: ">= 4.0.0, < 4.17.21" },
    { range: ">= 3.0.0, < 3.9.9" },
  ];
  it("いずれかの脆弱範囲に該当すれば true", () => {
    expect(isAffected("4.17.20", ranges)).toBe(true);
    expect(isAffected("3.5.0", ranges)).toBe(true);
  });
  it("どの範囲にも該当しなければ false（修正版）", () => {
    expect(isAffected("4.17.21", ranges)).toBe(false);
    expect(isAffected("5.0.0", ranges)).toBe(false);
  });
  it("壊れたレンジは false で握りつぶす（落とさない）", () => {
    expect(isAffected("1.0.0", [{ range: "" }])).toBe(false);
  });
});

describe("majorOf", () => {
  it("先頭の数値セグメントを返す（v/= 接頭を許容）", () => {
    expect(majorOf("4.17.21")).toBe(4);
    expect(majorOf("v2.0.0")).toBe(2);
    expect(majorOf("= 1.2.3")).toBe(1);
  });
  it("数値で始まらない版は null", () => {
    expect(majorOf("")).toBeNull();
    expect(majorOf("latest")).toBeNull();
  });
});

describe("upgradeKind (E47 アップグレード難易度の目安)", () => {
  it("メジャーが上がる修正版は major", () => {
    expect(upgradeKind("3.9.0", "4.0.0")).toBe("major");
    expect(upgradeKind("1.2.3", "2.0.0")).toBe("major");
  });
  it("同一メジャー内の修正版は minorPatch", () => {
    expect(upgradeKind("4.17.20", "4.17.21")).toBe("minorPatch");
    expect(upgradeKind("1.2.0", "1.5.0")).toBe("minorPatch");
  });
  it("target が current 以下なら判定しない（null）", () => {
    expect(upgradeKind("4.0.0", "3.9.0")).toBeNull();
    expect(upgradeKind("2.0.0", "2.0.0")).toBeNull();
  });
  it("メジャーを取れない版は null", () => {
    expect(upgradeKind("latest", "4.0.0")).toBeNull();
  });
  // ミューテーション裏取り（version.ts:63 のガード `a===null || b===null` を分離して殺す）。
  // current 側だけ不解析の `("latest","4.0.0")` は後段 `<=0` ガードに結果を覆われ変異が生存するため、
  // target 側だけ不解析のケースを追加：これは `||→&&` 等にしても後段で覆われず結果が変わる＝殺せる。
  it("target だけメジャーを取れない版も null（第1ガードを分離）", () => {
    expect(upgradeKind("4.0.0", "latest")).toBeNull();
    expect(upgradeKind("1.2.3", "")).toBeNull();
  });
});

describe("earliestFixed", () => {
  it("最も低い firstPatched を返す", () => {
    expect(
      earliestFixed([
        { firstPatched: "4.17.21" },
        { firstPatched: "3.9.9" },
        { firstPatched: null },
      ]),
    ).toBe("3.9.9");
  });
  it("firstPatched が無ければ null", () => {
    expect(earliestFixed([{ firstPatched: null }, {}])).toBeNull();
  });
});