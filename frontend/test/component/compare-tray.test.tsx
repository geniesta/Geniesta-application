// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { renderIntl } from "../helpers/intl";
import { CompareTray } from "@/components/compare-tray";
import { toggleCompare, clearCompare } from "@/lib/stores/compare-store";

// 同期 Client コンポーネント（useSyncExternalStore + localStorage）。
// module 内 cached を確実に空へ戻すため clearCompare() も呼ぶ。
beforeEach(() => {
  window.localStorage.clear();
  clearCompare();
});

describe("CompareTray", () => {
  it("選択が空のときは何も描画しない", () => {
    const { container } = renderIntl(<CompareTray />);
    expect(container.firstChild).toBeNull();
  });

  it("2件選択でトレイ・件数・slug・比較リンクが出る（a11y OK）", async () => {
    toggleCompare("facebook/react");
    toggleCompare("vuejs/core");
    const { container } = renderIntl(<CompareTray />);
    expect(screen.getByRole("region", { name: "比較トレイ" })).toBeInTheDocument();
    expect(screen.getByText("比較 (2)")).toBeInTheDocument();
    expect(screen.getByText("facebook/react")).toBeInTheDocument();
    const view = screen.getByRole("link", { name: /比較する/ });
    expect(view.getAttribute("href")).toContain("/compare?repos=");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("× ボタンで1件外すと件数が減る", async () => {
    const user = userEvent.setup();
    toggleCompare("facebook/react");
    toggleCompare("vuejs/core");
    renderIntl(<CompareTray />);
    await user.click(
      screen.getByRole("button", { name: "facebook/react を比較から外す" }),
    );
    expect(screen.getByText("比較 (1)")).toBeInTheDocument();
    expect(screen.queryByText("facebook/react")).toBeNull();
  });

  it("1件のみだと比較ボタンは無効（リンクにならず aria-disabled）", () => {
    toggleCompare("solo/repo");
    renderIntl(<CompareTray />);
    expect(screen.queryByRole("link", { name: /比較する/ })).toBeNull();
    expect(screen.getByText("比較する")).toHaveAttribute("aria-disabled");
  });

  it("クリアでトレイが消える", async () => {
    const user = userEvent.setup();
    toggleCompare("a/a");
    toggleCompare("b/b");
    const { container } = renderIntl(<CompareTray />);
    await user.click(screen.getByRole("button", { name: "クリア" }));
    expect(container.firstChild).toBeNull();
  });
});
