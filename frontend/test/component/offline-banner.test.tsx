// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import { renderIntl } from "../helpers/intl";
import { OfflineBanner } from "@/components/offline-banner";

afterEach(() => {
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});

describe("OfflineBanner", () => {
  it("オンライン時は何も描画しない", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    const { container } = renderIntl(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("offline イベントで aria-live のバナーを出し、online で消える", () => {
    const { container } = renderIntl(<OfflineBanner />);
    act(() => {
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
      fireEvent(window, new Event("offline"));
    });
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(/オフライン/);
    expect(banner).toHaveAttribute("aria-live", "polite");

    act(() => {
      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
      fireEvent(window, new Event("online"));
    });
    expect(container.firstChild).toBeNull();
  });
});
