// 【unit】lib/site の SITE_URL 解決（環境変数優先・既定フォールバック）を検証。
import { describe, it, expect } from "vitest";
import { reportIssueUrl, PROJECT_REPO_URL } from "@/lib/site";

// 89 訂正報告：内容を prefill した issue 作成 URL を組む（subject はエスケープされる）。
describe("reportIssueUrl", () => {
  it("issue 作成パスと subject を含む", () => {
    const url = reportIssueUrl("facebook/react");
    expect(url.startsWith(`${PROJECT_REPO_URL}/issues/new?`)).toBe(true);
    expect(url).toContain("title=");
    // subject は URL エンコードされて含まれる（"/" は %2F）。
    expect(url).toContain(encodeURIComponent("facebook/react"));
  });
  it("特殊文字を含む subject も壊さない", () => {
    const url = reportIssueUrl("a&b c?d");
    expect(url).toContain(encodeURIComponent("[fact report] a&b c?d"));
  });
});