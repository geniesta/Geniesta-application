// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { InfoTip } from "@/components/info-tip";

// B20 「読み方」ツールチップのアクセシビリティ契約：
// アイコンのみのトリガーに aria-label があり、キーボード可達（button）で a11y 違反が無いこと。
describe("InfoTip", () => {
  it("aria-label 付きのボタントリガーを持つ", () => {
    render(<InfoTip label="この事実の読み方">読み方の説明</InfoTip>);
    const btn = screen.getByRole("button", { name: "この事実の読み方" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("type", "button");
  });

  it("a11y 違反が無い（閉じた状態）", async () => {
    const { container } = render(
      <InfoTip label="読み方">説明テキスト</InfoTip>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
