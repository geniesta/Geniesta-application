// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { renderIntl } from "../helpers/intl";

// MobileNav 内の LanguageSwitcher が useRouter を使うため差し替える。
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { MobileNav } from "@/components/mobile-nav";

beforeEach(() => window.localStorage.clear());

describe("MobileNav", () => {
  it("ブランド・メニュー・主要導線・レジストリ切替を出す", () => {
    renderIntl(<MobileNav />);
    expect(screen.getByText("Geniesta")).toBeInTheDocument();
    expect(screen.getByText("メニュー")).toBeInTheDocument();
    // <details> の中身は閉じていても DOM には存在する（native 開閉）。
    expect(
      screen.getByRole("navigation", { name: "エコシステム" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "方法論と透明性" }),
    ).toHaveAttribute("href", "/methodology");
    // レジストリ切替リンク（npm 等）。GitHub は "/" へ。
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/");
    expect(hrefs.some((h) => h?.startsWith("/?src="))).toBe(true);
  });

  it("a11y 違反が無い", async () => {
    const { container } = renderIntl(<MobileNav />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
