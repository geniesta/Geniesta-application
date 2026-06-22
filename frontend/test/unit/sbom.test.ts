// 【unit】lib/sbom の依存抽出（package.json / composer.json → {src,name}[]）を検証。JSON 以外は対象外。純関数。
import { describe, it, expect } from "vitest";
import { parseSbom } from "@/lib/sbom";

describe("parseSbom（196 依存一括チェック）", () => {
  it("package.json の依存を npm として抽出（dev/peer 含む・重複排除）", () => {
    const r = parseSbom(
      JSON.stringify({
        dependencies: { react: "^18", lodash: "4" },
        devDependencies: { vitest: "1", react: "^18" },
      }),
    );
    expect(r).toEqual(
      expect.arrayContaining([
        { src: "npm", name: "react" },
        { src: "npm", name: "lodash" },
        { src: "npm", name: "vitest" },
      ]),
    );
    expect(r.filter((d) => d.name === "react")).toHaveLength(1); // 重複排除
  });

  it("composer.json は require を composer として抽出（php/ext は除外）", () => {
    const r = parseSbom(
      JSON.stringify({
        require: { php: ">=8", "ext-json": "*", "monolog/monolog": "^3" },
      }),
    );
    expect(r).toEqual([{ src: "composer", name: "monolog/monolog" }]);
  });

  it("JSON 以外（requirements.txt 等）は対象外＝[]（PyPI は準備中でリンク切れを避ける）", () => {
    const r = parseSbom(
      ["# comment", "requests==2.31.0", "flask>=2", "-r base.txt", "django"].join(
        "\n",
      ),
    );
    expect(r).toEqual([]);
  });

  it("空/不正 JSON は []", () => {
    expect(parseSbom("")).toEqual([]);
    expect(parseSbom("   ")).toEqual([]);
    expect(parseSbom("{ broken")).toEqual([]);
  });
});