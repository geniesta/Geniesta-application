// @vitest-environment jsdom
// 【概念テスト】対象: @/app/error ・ @/app/not-found（エラー境界群）。
// 複数の境界ファイルを横断するため、ファイル名は対象ファイル名でなく振る舞い（boundaries）で命名。
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { renderIntl } from "../helpers/intl";
import NotFound from "@/app/not-found";
import AppError from "@/app/error";

describe("not-found 境界", () => {
  it("404 とホーム導線を出し、a11y 違反が無い", async () => {
    const { container } = renderIntl(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("ページが見つかりません")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ホームへ戻る" })).toHaveAttribute("href", "/");
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("error 境界", () => {
  it("alert を出し、再試行ボタンで reset を呼ぶ", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    const { container } = renderIntl(
      <AppError error={new Error("boom") as Error & { digest?: string }} reset={reset} />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("問題が発生しました")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "再試行" }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(await axe(container)).toHaveNoViolations();
  });
});
