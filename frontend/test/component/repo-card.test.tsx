// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { RepoCard } from "@/components/repo-card";
import { reactRepo, jwtGoRepo } from "../helpers/fixtures";
import { renderIntl as render } from "../helpers/intl";

describe("RepoCard", () => {
  it("必須の信頼ファクトと詳細リンクを表示する", () => {
    render(<RepoCard repo={reactRepo} />);
    // 名前・オーナー・状態・言語
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("facebook")).toBeInTheDocument();
    expect(screen.getByText("更新あり")).toBeInTheDocument();
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    // 詳細ページ（独立ページ＝モーダル不可）へのリンク
    const link = screen.getByRole("link", { name: /facebook\/react の詳細へ/ });
    expect(link).toHaveAttribute("href", "/repos/facebook/react");
  });

  it("アーカイブ済みは『アーカイブ済み』状態を出す（断罪しない事実表示）", () => {
    render(<RepoCard repo={jwtGoRepo} />);
    expect(screen.getByText("アーカイブ済み")).toBeInTheDocument();
    expect(screen.getByText("個人")).toBeInTheDocument();
  });

  it("params を渡すと詳細リンクに文脈クエリが付く", () => {
    render(<RepoCard repo={reactRepo} params="eco=NPM&pkg=react" />);
    const link = screen.getByRole("link", { name: /の詳細へ/ });
    expect(link).toHaveAttribute(
      "href",
      "/repos/facebook/react?eco=NPM&pkg=react",
    );
  });

  it("search モードは再検索リンクになる", () => {
    render(<RepoCard repo={reactRepo} mode="search" />);
    const link = screen.getByRole("link", { name: /で検索し直す/ });
    expect(link).toHaveAttribute("href", "/?q=react");
  });

  it("a11y 違反が無い", async () => {
    const { container } = render(<RepoCard repo={reactRepo} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
