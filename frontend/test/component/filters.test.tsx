// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { renderIntl } from "../helpers/intl";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { Filters } from "@/components/filters";

// Filters は next-intl を使うため、ja メッセージでラップして描画する。
const render = renderIntl;

const base = {
  q: "react",
  // 既定の提供元は org-only（団体・企業のみ）。既定値は URL に載らない前提でアサートする。
  owner: "org-only",
  lang: "",
  status: "all",
  license: "",
  framework: "",
  sort: "",
};

beforeEach(() => push.mockClear());

describe("Filters", () => {
  it("GitHub 検索では言語・フレームワークの絞り込みを出す", () => {
    render(<Filters {...base} />);
    expect(screen.getByText("言語")).toBeInTheDocument();
    expect(screen.getByText("フレームワーク")).toBeInTheDocument();
    expect(screen.getByText("提供元")).toBeInTheDocument();
    expect(screen.getByText("ライセンス")).toBeInTheDocument();
  });

  it("レジストリ(registry)では言語・フレームワークを隠す", () => {
    render(<Filters {...base} src="npm" registry />);
    expect(screen.queryByText("言語")).not.toBeInTheDocument();
    expect(screen.queryByText("フレームワーク")).not.toBeInTheDocument();
    // 提供元・状態・並び替え・ライセンスは残る
    expect(screen.getByText("提供元")).toBeInTheDocument();
    expect(screen.getByText("ライセンス")).toBeInTheDocument();
  });

  it("並び替えで Star 数を選ぶと sort=stars 付きURLへ（q維持）", async () => {
    const user = userEvent.setup();
    render(<Filters {...base} />);
    await user.click(screen.getByRole("button", { name: "Star 数" }));
    expect(push).toHaveBeenCalledWith("/?q=react&sort=stars");
  });

  it("レジストリでは src を維持してURLを組む", async () => {
    const user = userEvent.setup();
    render(<Filters {...base} src="npm" registry />);
    await user.click(screen.getByRole("button", { name: "最近更新" }));
    expect(push).toHaveBeenCalledWith("/?q=react&src=npm&sort=updated");
  });

  it("a11y 違反が無い", async () => {
    const { container } = render(<Filters {...base} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
