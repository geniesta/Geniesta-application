// 【unit】lib/pkg-name のパッケージ名正規化（スコープ付き npm・大文字小文字・別名）を検証。純関数。
import { describe, it, expect } from "vitest";
import { normalizePackageName } from "@/lib/pkg-name";

describe("normalizePackageName（76 名称正規化の一元化）", () => {
  it("PyPI は PEP 503（小文字＋[-_.]→-）", () => {
    expect(normalizePackageName("PIP", "Flask")).toBe("flask");
    expect(normalizePackageName("PIP", "zope.interface")).toBe("zope-interface");
    expect(normalizePackageName("PIP", "ruamel_yaml")).toBe("ruamel-yaml");
    expect(normalizePackageName("PIP", "Foo--Bar__baz")).toBe("foo-bar-baz");
  });

  it("crates / NuGet / Composer は小文字化", () => {
    expect(normalizePackageName("RUST", "Serde")).toBe("serde");
    expect(normalizePackageName("NUGET", "Newtonsoft.Json")).toBe(
      "newtonsoft.json",
    );
    expect(normalizePackageName("COMPOSER", "Monolog/Monolog")).toBe(
      "monolog/monolog",
    );
  });

  it("npm / Go / Maven は変更しない（大小・パスが有意）", () => {
    expect(normalizePackageName("NPM", "Lodash")).toBe("Lodash");
    expect(normalizePackageName("GO", "github.com/Foo/Bar")).toBe(
      "github.com/Foo/Bar",
    );
  });

  it("空白はトリム、空は空", () => {
    expect(normalizePackageName("PIP", "  Flask  ")).toBe("flask");
    expect(normalizePackageName("PIP", "")).toBe("");
  });
});