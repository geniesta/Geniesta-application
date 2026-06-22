// 【unit/MSW】lib/server/manifest のライセンス検出（package.json 宣言・LICENSE 本文判定）を MSW で raw.githubusercontent をモックして検証。
import { describe, expect, it } from "vitest";
import { classifyLicenseText, licenseFromManifest } from "@/lib/server/manifest";

describe("licenseFromManifest", () => {
  it("package.json の文字列 license", () => {
    expect(licenseFromManifest("package.json", '{"license":"MIT"}')).toBe("MIT");
  });

  it("composer.json の文字列 license", () => {
    expect(
      licenseFromManifest("composer.json", '{"name":"laravel/laravel","license":"MIT"}'),
    ).toBe("MIT");
  });

  it("composer.json の配列 license は先頭を採用", () => {
    expect(
      licenseFromManifest("composer.json", '{"license":["MIT","Apache-2.0"]}'),
    ).toBe("MIT");
  });

  it("Cargo.toml の license", () => {
    const toml = '[package]\nname = "x"\nlicense = "MIT OR Apache-2.0"\n';
    expect(licenseFromManifest("Cargo.toml", toml)).toBe("MIT OR Apache-2.0");
  });

  it("license が無い / private なら null", () => {
    expect(licenseFromManifest("package.json", '{"private":true}')).toBeNull();
    expect(licenseFromManifest("Cargo.toml", '[package]\nname = "x"\n')).toBeNull();
  });

  it("壊れた JSON は null（落ちない）", () => {
    expect(licenseFromManifest("package.json", "{ not json")).toBeNull();
  });

  it("旧形式 license:{type} / licenses:[{type}]", () => {
    expect(
      licenseFromManifest("package.json", '{"license":{"type":"MIT"}}'),
    ).toBe("MIT");
    expect(
      licenseFromManifest("package.json", '{"licenses":[{"type":"ISC"}]}'),
    ).toBe("ISC");
  });
});

describe("classifyLicenseText（LICENSE 本文からの同定）", () => {
  it("Business Source License → BUSL-1.1", () => {
    expect(
      classifyLicenseText("Business Source License 1.1\n\nParameters\n..."),
    ).toBe("BUSL-1.1");
  });

  it("Server Side Public License → SSPL-1.0", () => {
    expect(
      classifyLicenseText("Server Side Public License\nVersion 1, ..."),
    ).toBe("SSPL-1.0");
  });

  it("Elastic License 2.0 → Elastic-2.0", () => {
    expect(classifyLicenseText("Elastic License 2.0\n\nAcceptance ...")).toBe(
      "Elastic-2.0",
    );
  });

  it("MIT/Apache 等の通常ライセンスは null（黙る）", () => {
    expect(
      classifyLicenseText("MIT License\n\nPermission is hereby granted ..."),
    ).toBeNull();
    expect(classifyLicenseText("Apache License Version 2.0")).toBeNull();
  });
});