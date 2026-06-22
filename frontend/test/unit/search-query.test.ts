// 【unit】lib/search-query の検索クエリ構築・スコープ構文(lang:/license:/status:)・提供元並べ替え(applyOwnerPreference)を検証。純関数。
import { describe, expect, it } from "vitest";
import {
  aliasSuggestion,
  applyOwnerPreference,
  buildSearchQuery,
  detectEcosystem,
  parseScopedQuery,
  levenshtein,
  fuzzySuggestion,
} from "@/lib/search-query";

const org = (login: string) => ({ owner: { type: "Organization" }, login });
const user = (login: string) => ({ owner: { type: "User" }, login });

describe("buildSearchQuery", () => {
  it("キーワードだけならそのまま", () => {
    expect(buildSearchQuery({ q: "jwt go" })).toBe("jwt go");
  });

  it("言語・ライセンスを qualifier に変換する", () => {
    const q = buildSearchQuery({ q: "jwt", lang: "go", license: "mit" });
    expect(q).toContain("language:go");
    expect(q).toContain("license:mit");
  });

  it("status=active は archived:false を付ける", () => {
    expect(buildSearchQuery({ q: "x", status: "active" })).toContain("archived:false");
  });

  it("status=archived は archived:true を付ける", () => {
    expect(buildSearchQuery({ q: "x", status: "archived" })).toContain("archived:true");
  });

  it("status=all は archived 修飾子を付けない（既定でアーカイブも表示）", () => {
    expect(buildSearchQuery({ q: "x", status: "all" })).not.toContain("archived:");
  });

  it("フレームワークは topic: で近似する", () => {
    expect(buildSearchQuery({ q: "ui", framework: "nextjs" })).toContain("topic:nextjs");
  });

  it("空フィルターは余分な空白を残さない", () => {
    expect(buildSearchQuery({ q: "react", lang: "", license: "" })).toBe("react");
  });
});

describe("applyOwnerPreference（提供元の優先表示）", () => {
  const items = [user("a"), org("b"), user("c"), org("d")];

  it("all はそのままの順序", () => {
    expect(applyOwnerPreference(items, "all").map((i) => i.login)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("org-first は団体を前へ（同ランク内は関連度順を維持＝安定ソート）", () => {
    expect(applyOwnerPreference(items, "org-first").map((i) => i.login)).toEqual([
      "b",
      "d",
      "a",
      "c",
    ]);
  });

  it("org-only は個人を除外する", () => {
    expect(applyOwnerPreference(items, "org-only").map((i) => i.login)).toEqual([
      "b",
      "d",
    ]);
  });

  it("元配列を破壊しない", () => {
    const copy = [...items];
    applyOwnerPreference(items, "org-first");
    expect(items).toEqual(copy);
  });
});

describe("aliasSuggestion（C22/C27 ゼロ件救済の別名提案）", () => {
  it("拡張子風の接尾を外す", () => {
    expect(aliasSuggestion("react.js")).toBe("react");
    expect(aliasSuggestion("foo.ts")).toBe("foo");
  });
  it("言語接尾（-js / js）を外す", () => {
    expect(aliasSuggestion("node-js")).toBe("node");
    expect(aliasSuggestion("nodejs")).toBe("node");
  });
  it("末尾メジャーバージョンを外す", () => {
    expect(aliasSuggestion("vue3")).toBe("vue");
    expect(aliasSuggestion("react18")).toBe("react");
  });
  it("変化が無い/短すぎる場合は null（誤誘導しない）", () => {
    expect(aliasSuggestion("react")).toBeNull();
    expect(aliasSuggestion("go")).toBeNull();
    expect(aliasSuggestion("d3")).toBeNull();
    expect(aliasSuggestion("")).toBeNull();
    expect(aliasSuggestion("   ")).toBeNull();
  });
});

describe("parseScopedQuery（C30 スコープ付き検索構文）", () => {
  it("lang/license/status を抽出し、残りを text に残す", () => {
    const r = parseScopedQuery("jwt lang:go license:mit status:active");
    expect(r).toEqual({
      text: "jwt",
      lang: "go",
      license: "mit",
      status: "active",
    });
  });
  it("language: エイリアスも受け付ける", () => {
    expect(parseScopedQuery("ui language:rust").lang).toBe("rust");
  });
  it("不正な status は無視して text に残す", () => {
    const r = parseScopedQuery("x status:bogus");
    expect(r.status).toBeUndefined();
    expect(r.text).toBe("x status:bogus");
  });
  it("未知の修飾子（stars:）は text に残す（GitHub ネイティブ）", () => {
    expect(parseScopedQuery("react stars:>100").text).toBe("react stars:>100");
  });
  it("修飾子のみ（キーワード無し）も解釈する", () => {
    const r = parseScopedQuery("lang:rust");
    expect(r.text).toBe("");
    expect(r.lang).toBe("rust");
  });
});

describe("detectEcosystem（関連ライブラリの起点）", () => {
  it("既知のエコシステム名を topic に解決する", () => {
    expect(detectEcosystem("react")?.topic).toBe("react");
    expect(detectEcosystem(" Next.js ")?.topic).toBe("nextjs");
    expect(detectEcosystem("VUE")?.label).toBe("Vue");
  });

  it("未知の語は null（関連セクションを出さない）", () => {
    expect(detectEcosystem("argon2")).toBeNull();
    expect(detectEcosystem("jwt go")).toBeNull();
  });
});

describe("levenshtein", () => {
  it("基本的な編集距離", () => {
    expect(levenshtein("react", "react")).toBe(0);
    expect(levenshtein("recat", "react")).toBe(2); // 転置
    expect(levenshtein("", "abc")).toBe(3);
  });
});

describe("fuzzySuggestion (C22 タイプミス許容)", () => {
  it("辞書に近いタイプミスを補正候補に", () => {
    expect(fuzzySuggestion("recat")).toBe("react");
    expect(fuzzySuggestion("lodahs")).toBe("lodash");
    expect(fuzzySuggestion("djano")).toBe("django");
  });
  it("完全一致は提案しない（null）", () => {
    expect(fuzzySuggestion("react")).toBeNull();
  });
  it("短すぎる語・遠い語は提案しない", () => {
    expect(fuzzySuggestion("ab")).toBeNull();
    expect(fuzzySuggestion("zxcvbnm")).toBeNull();
  });
});