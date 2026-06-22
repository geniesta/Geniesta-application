// 【unit】lib/facts の表示用純関数（num・relativeLabel・licenseInfo・daysAgo 等）を境界値込みで検証。framework 非依存。
import { describe, expect, it } from "vitest";
import { licenseInfo } from "@/lib/facts";
import { reactRepo } from "../helpers/fixtures";

describe("licenseInfo（GitHub の検出結果を事実として扱う）", () => {
  it("既知の SPDX はその ID を返す", () => {
    const info = licenseInfo(reactRepo);
    expect(info.kind).toBe("spdx");
    expect(info.label).toBe("MIT");
    expect(info.sourceHref).toBe(reactRepo.html_url);
  });

  it("NOASSERTION は独自ライセンスとして区別する", () => {
    const repo = {
      ...reactRepo,
      license: { spdx_id: "NOASSERTION", name: "Other" },
    };
    const info = licenseInfo(repo);
    expect(info.kind).toBe("custom");
    expect(info.short).toBe("独自");
  });

  it("license が null なら『検出なし』（無いとは断定しない）", () => {
    const repo = { ...reactRepo, license: null };
    const info = licenseInfo(repo);
    expect(info.kind).toBe("none");
    expect(info.short).toBe("なし");
  });

  it("SSPL/BUSL/Elastic は source-available（非OSI）", () => {
    for (const id of ["SSPL-1.0", "BUSL-1.1", "Elastic-2.0"]) {
      const repo = { ...reactRepo, license: { spdx_id: id, name: id } };
      expect(licenseInfo(repo).kind).toBe("source-available");
    }
  });

  it("Boost(BSL-1.0) は OSI 承認なので source-available 扱いにしない", () => {
    const repo = { ...reactRepo, license: { spdx_id: "BSL-1.0", name: "Boost" } };
    expect(licenseInfo(repo).kind).toBe("spdx");
  });
});