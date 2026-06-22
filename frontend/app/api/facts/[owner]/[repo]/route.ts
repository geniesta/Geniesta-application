import { NextResponse } from "next/server";
import { getRepoDetail, GitHubError } from "@/lib/server/github";
import { buildTrustReport } from "@/lib/trust";

// 公開 API（199）。詳細ページと同じ「信頼に関わる公開事実」を、出典つきで機械可読に返す。
// 採点はしない（status と evidence は事実のみ）。CDN キャッシュで叩きすぎを抑える。
// 例: GET /api/facts/lodash/lodash
export const revalidate = 300; // 5 分（fetch 層と整合）

type Params = { params: Promise<{ owner: string; repo: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { owner, repo } = await params;
  try {
    const data = await getRepoDetail(owner, repo);
    const report = buildTrustReport(data, { locale: "en" });
    return NextResponse.json(
      {
        repo: {
          full_name: data.full_name,
          owner: data.owner.login,
          language: data.language,
          html_url: data.html_url,
          description: data.description,
          archived: data.archived,
          license: data.license?.spdx_id ?? null,
          stars: data.stargazers_count,
          watchers: report.watcher ?? null, // subscribers_count（正確な Watcher）
          forks: data.forks_count,
          open_issues: data.open_issues_count,
        },
        status: {
          // active | archived（善悪判定ではなく状態の事実）
          label: report.status.label,
          state: report.status.state,
        },
        evidence: report.evidence.map((e) => ({
          axis: e.key,
          value: e.value,
          source: e.source,
        })),
        meta: {
          source: "GitHub REST/GraphQL (live)",
          generated_for: `${owner}/${repo}`,
          disclaimer:
            "Public facts only; not a guarantee of safety or correctness. We do not score or rank.",
          docs: "/methodology",
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) {
      return NextResponse.json({ error: "repository not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "failed to fetch facts" },
      { status: 502 },
    );
  }
}
