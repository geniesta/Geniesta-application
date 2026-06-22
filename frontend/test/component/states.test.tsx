// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { NoResults, ErrorState, ResultsSkeleton } from "@/components/states";
import { renderIntl } from "../helpers/intl";

describe("states", () => {
  it("NoResults はクエリを含むメッセージを出す", () => {
    renderIntl(<NoResults q="supabase" />);
    expect(
      screen.getByText(/「supabase」に一致するリポジトリが見つかりません/),
    ).toBeInTheDocument();
  });

  it("NoResults は role=status で 0件 を通知する（94 aria-live）", () => {
    renderIntl(<NoResults q="supabase" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      /一致するリポジトリが見つかりません/,
    );
  });

  it("ResultsSkeleton は role=status + aria-busy でローディングを通知する", () => {
    renderIntl(<ResultsSkeleton />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
  });

  it("ErrorState は role=alert でメッセージを通知する", () => {
    renderIntl(<ErrorState message="レート制限に達しました" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("取得に失敗しました");
    expect(alert).toHaveTextContent("レート制限に達しました");
  });

  it("各状態に a11y 違反が無い", async () => {
    const { container: c1 } = renderIntl(<NoResults q="x" />);
    expect(await axe(c1)).toHaveNoViolations();
    const { container: c2 } = renderIntl(<ErrorState message="err" />);
    expect(await axe(c2)).toHaveNoViolations();
    const { container: c3 } = renderIntl(<ResultsSkeleton />);
    expect(await axe(c3)).toHaveNoViolations();
  });
});
