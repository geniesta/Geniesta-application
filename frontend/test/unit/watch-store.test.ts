// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  toggleWatch,
  removeWatch,
  getWatchSnapshot,
} from "@/lib/stores/watch-store";

describe("watch-store（B16 ウォッチ）", () => {
  beforeEach(() => window.localStorage.clear());

  it("toggle で追加・再 toggle で削除（slug 正規化）", () => {
    toggleWatch("Lodash/Lodash");
    expect(getWatchSnapshot()).toEqual(["lodash/lodash"]);
    toggleWatch("lodash/lodash");
    expect(getWatchSnapshot()).toEqual([]);
  });

  it("上限なしで複数貯められる", () => {
    toggleWatch("a/a");
    toggleWatch("b/b");
    toggleWatch("c/c");
    expect(getWatchSnapshot()).toHaveLength(3);
  });

  it("removeWatch で個別に外せる", () => {
    toggleWatch("a/a");
    toggleWatch("b/b");
    removeWatch("a/a");
    expect(getWatchSnapshot()).toEqual(["b/b"]);
  });
});
