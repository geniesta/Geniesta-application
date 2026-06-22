// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RetryButton } from "@/components/retry-button";

// jsdom の location.reload は再定義不可なので、location 自体を最小オブジェクトに差し替える。
const realLocation = window.location;
afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: realLocation,
  });
});

describe("RetryButton", () => {
  it("ラベルを表示し、クリックで location.reload を呼ぶ", async () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { reload },
    });
    const user = userEvent.setup();
    render(<RetryButton label="再読み込み" />);
    await user.click(screen.getByRole("button", { name: "再読み込み" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
