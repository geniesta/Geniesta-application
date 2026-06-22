// 【unit/MSW】lib/server/registries の npm/crates 等の検索結果パースを MSW で各レジストリ API をモックして検証。
import { describe, expect, it } from "vitest";
import { parseGitHubRepo } from "@/lib/server/registries";

describe("parseGitHubRepo", () => {
  it("git+https の .git 付き URL", () => {
    expect(parseGitHubRepo("git+https://github.com/facebook/react.git")).toEqual({
      owner: "facebook",
      repo: "react",
    });
  });

  it("素の https URL", () => {
    expect(parseGitHubRepo("https://github.com/vuejs/core")).toEqual({
      owner: "vuejs",
      repo: "core",
    });
  });

  it("git:// と末尾パス", () => {
    expect(
      parseGitHubRepo("git://github.com/expressjs/express.git#main"),
    ).toEqual({ owner: "expressjs", repo: "express" });
  });

  it("github: ショートハンド", () => {
    expect(parseGitHubRepo("github:tokio-rs/tokio")).toEqual({
      owner: "tokio-rs",
      repo: "tokio",
    });
  });

  it("GitHub 以外 / 空は null", () => {
    expect(parseGitHubRepo("https://gitlab.com/foo/bar")).toBeNull();
    expect(parseGitHubRepo(null)).toBeNull();
    expect(parseGitHubRepo(undefined)).toBeNull();
  });
});