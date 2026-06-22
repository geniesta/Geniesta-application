// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { renderIntl } from "../helpers/intl";
import { WatchButton, WatchList } from "@/components/watch";
import { toggleWatch, removeWatch } from "@/lib/stores/watch-store";

// removeWatch("_/_") で module 内 cached を空配列へ確実にリセット（clear だけだと残る）。
beforeEach(() => {
  window.localStorage.clear();
  removeWatch("_/_");
});

describe("WatchButton", () => {
  it("クリックで aria-pressed とラベルがトグルする", async () => {
    const user = userEvent.setup();
    renderIntl(<WatchButton owner="facebook" repo="react" />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).toHaveTextContent("＋ ウォッチ");
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).toHaveTextContent("✓ ウォッチ中");
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });
});

describe("WatchList", () => {
  it("空なら何も描画しない", () => {
    const { container } = renderIntl(<WatchList />);
    expect(container.firstChild).toBeNull();
  });

  it("登録済みを並べ、詳細リンクと削除を持つ（a11y OK・削除で消える）", async () => {
    const user = userEvent.setup();
    toggleWatch("facebook/react");
    const { container } = renderIntl(<WatchList />);
    expect(screen.getByRole("link", { name: /react/ })).toHaveAttribute(
      "href",
      "/repos/facebook/react",
    );
    expect(await axe(container)).toHaveNoViolations();
    await user.click(
      screen.getByRole("button", { name: "react をウォッチから外す" }),
    );
    expect(container.firstChild).toBeNull();
  });
});
