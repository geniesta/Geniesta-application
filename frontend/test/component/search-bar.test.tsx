// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { renderIntl } from "../helpers/intl";

// next/navigation の useRouter を差し替え（クライアント遷移を観測する）。
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { SearchBar } from "@/components/search-bar";
import { recordRecent } from "@/lib/stores/recent-store";

const render = renderIntl;
beforeEach(() => {
  push.mockClear();
  window.localStorage.clear();
});

describe("SearchBar", () => {
  it("検索入力に aria-label があり role=search を持つ", () => {
    render(<SearchBar />);
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/検索キーワード/),
    ).toBeInTheDocument();
  });

  it("送信で /?q=<term> へ遷移する", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.type(screen.getByRole("combobox"), "supabase");
    await user.click(screen.getByRole("button", { name: "検索" }));
    expect(push).toHaveBeenCalledWith("/?q=supabase");
  });

  it("レジストリ(src)を維持して遷移する", async () => {
    const user = userEvent.setup();
    render(<SearchBar src="npm" />);
    await user.type(screen.getByRole("combobox"), "react");
    await user.click(screen.getByRole("button", { name: "検索" }));
    expect(push).toHaveBeenCalledWith("/?q=react&src=npm");
  });

  it("空入力の送信は / にリセットする", async () => {
    const user = userEvent.setup();
    render(<SearchBar initial="old" />);
    await user.clear(screen.getByRole("combobox"));
    await user.click(screen.getByRole("button", { name: "検索" }));
    expect(push).toHaveBeenCalledWith("/");
  });

  it("a11y 違反が無い", async () => {
    const { container } = render(<SearchBar />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // B14 サイドバー常設（compact）でも検索の挙動と a11y は同一であること。
  it("compact でも role=search を持ち src を維持して遷移する", async () => {
    const user = userEvent.setup();
    const { container } = render(<SearchBar compact src="crates" />);
    expect(screen.getByRole("search")).toBeInTheDocument();
    await user.type(screen.getByRole("combobox"), "serde");
    await user.click(screen.getByRole("button", { name: "検索" }));
    expect(push).toHaveBeenCalledWith("/?q=serde&src=crates");
    expect(await axe(container)).toHaveNoViolations();
  });

  // C21/C28 オートサジェスト＋キーボード：最近見たパッケージを候補に出し、↓Enter で詳細へ。
  it("入力一致の候補を listbox で出し、↓Enter で詳細へ遷移する", async () => {
    const user = userEvent.setup();
    recordRecent("facebook", "react"); // 最近見た履歴を記録
    const { container } = render(<SearchBar />);
    const input = screen.getByRole("combobox");
    await user.type(input, "rea");
    // combobox が展開し、候補（option）が出る。
    expect(input).toHaveAttribute("aria-expanded", "true");
    const option = await screen.findByRole("option", { name: /react/i });
    expect(option).toBeInTheDocument();
    // ↓で候補を選択 → Enter で詳細へ（検索送信ではなく遷移）。
    await user.keyboard("{ArrowDown}{Enter}");
    expect(push).toHaveBeenCalledWith("/repos/facebook/react");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("候補が無いときは通常の検索送信（Enter）になる", async () => {
    const user = userEvent.setup();
    recordRecent("facebook", "react");
    render(<SearchBar />);
    const input = screen.getByRole("combobox");
    await user.type(input, "zzz-no-match{Enter}");
    expect(push).toHaveBeenCalledWith("/?q=zzz-no-match");
  });
});
