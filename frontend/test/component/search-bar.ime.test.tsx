// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderIntl } from "../helpers/intl";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { SearchBar } from "@/components/search-bar";

beforeEach(() => {
  push.mockClear();
  window.localStorage.clear();
});

// IME（日本語変換）中の Enter は確定操作であって検索送信ではない、という重要な分岐。
describe("SearchBar の IME ガード", () => {
  it("変換中(composition)の Enter では遷移しない", async () => {
    renderIntl(<SearchBar />);
    const input = screen.getByRole("combobox");
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "りあくと" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).not.toHaveBeenCalled();
  });

  it("変換確定後は通常どおり検索送信できる", async () => {
    const user = userEvent.setup();
    renderIntl(<SearchBar />);
    const input = screen.getByRole("combobox");
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "react" } });
    fireEvent.compositionEnd(input);
    await user.click(screen.getByRole("button", { name: "検索" }));
    expect(push).toHaveBeenCalledWith("/?q=react");
  });
});
