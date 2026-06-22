// 【unit】lib/licenses の SPDX → 義務クラス分類（obligationOf）と非標準ライセンス判定を検証。純関数。
import { describe, expect, it } from "vitest";
import {
  isOsiOss,
  isSourceAvailable,
  licenseShift,
  obligationOf,
} from "@/lib/licenses";

describe("ライセンス分類", () => {
  it("isSourceAvailable", () => {
    expect(isSourceAvailable("SSPL-1.0")).toBe(true);
    expect(isSourceAvailable("BUSL-1.1")).toBe(true);
    expect(isSourceAvailable("Elastic-2.0")).toBe(true);
    expect(isSourceAvailable("Apache-2.0")).toBe(false);
    expect(isSourceAvailable("BSL-1.0")).toBe(false); // Boost は OSS
    expect(isSourceAvailable(null)).toBe(false);
  });

  it("isOsiOss", () => {
    expect(isOsiOss("MIT")).toBe(true);
    expect(isOsiOss("AGPL-3.0-only")).toBe(true);
    expect(isOsiOss("SSPL-1.0")).toBe(false);
    expect(isOsiOss("NOASSERTION")).toBe(false);
  });
});

describe("licenseShift（誤検知ゼロ設計）", () => {
  it("OSS → source-available は検知する", () => {
    expect(licenseShift(["Apache-2.0"], ["SSPL-1.0"])).toEqual({
      from: "Apache-2.0",
      to: "SSPL-1.0",
    });
    expect(licenseShift(["MPL-2.0"], ["BUSL-1.1"])).toEqual({
      from: "MPL-2.0",
      to: "BUSL-1.1",
    });
  });

  it("OSS → OSS は検知しない", () => {
    expect(licenseShift(["MIT"], ["Apache-2.0"])).toBeNull();
  });

  it("不明/null → SA は検知しない（旧が確定 OSS でない）", () => {
    expect(licenseShift([], ["SSPL-1.0"])).toBeNull();
    expect(licenseShift(["NOASSERTION"], ["SSPL-1.0"])).toBeNull();
  });

  it("元から source-available なら検知しない（新たな越境ではない）", () => {
    expect(licenseShift(["SSPL-1.0"], ["SSPL-1.0"])).toBeNull();
    expect(licenseShift(["Apache-2.0", "SSPL-1.0"], ["SSPL-1.0"])).toBeNull();
  });

  it("再 OSS 化など新側に OSS が残るなら検知しない", () => {
    expect(licenseShift(["Apache-2.0"], ["AGPL-3.0-only"])).toBeNull();
    // デュアル（non-standard + OSS）も OSS が残るので越境ではない
    expect(licenseShift(["Apache-2.0"], ["non-standard", "MIT"])).toBeNull();
  });

  it("OSS → non-standard（deps.dev が SPDX 化できない）は越境として拾う", () => {
    expect(licenseShift(["Apache-2.0"], ["non-standard"])).toEqual({
      from: "Apache-2.0",
      to: "非標準ライセンス",
    });
  });

  it("旧が non-standard（元から不明）なら黙る", () => {
    expect(licenseShift(["non-standard"], ["SSPL-1.0"])).toBeNull();
  });
});

describe("obligationOf（義務クラス）", () => {
  it("パーミッシブ", () => {
    expect(obligationOf("MIT")?.class).toBe("permissive");
    expect(obligationOf("Apache-2.0")?.class).toBe("permissive");
  });

  it("強コピーレフト（GitHub 短縮形 GPL-3.0 も）", () => {
    expect(obligationOf("GPL-3.0")?.class).toBe("strong-copyleft");
    expect(obligationOf("GPL-2.0-or-later")?.class).toBe("strong-copyleft");
  });

  it("ネットワークコピーレフト（AGPL）", () => {
    expect(obligationOf("AGPL-3.0")?.class).toBe("network-copyleft");
  });

  it("弱コピーレフト（MPL/LGPL）", () => {
    expect(obligationOf("MPL-2.0")?.class).toBe("weak-copyleft");
    expect(obligationOf("LGPL-3.0")?.class).toBe("weak-copyleft");
  });

  it("source-available", () => {
    expect(obligationOf("SSPL-1.0")?.class).toBe("source-available");
  });

  it("分類できないものは null（推測しない）", () => {
    expect(obligationOf("NOASSERTION")).toBeNull();
    expect(obligationOf(null)).toBeNull();
    expect(obligationOf(undefined)).toBeNull();
  });
});