import "server-only";
// アプリケーション層（ユースケース）。「リポジトリを評価する」という一つの業務アクションを、
// ドメイン（trust / facts / licenses）とゲートウェイ（github / manifest）を束ねて実行し、
// 配信層（app/repos/[owner]/[repo]/page.tsx）へ view-model を返す。
// HTTP / RSC の関心（notFound・エラー UI・Suspense・描画）は配信層の責務として分離する。
// これにより評価ロジックはレンダリングなしでテストでき、配信（route → Server Action など）を
// 差し替えてもこの中核は変わらない（依存はドメイン中心・内向き）。

import { getRepoDetail } from "@/lib/server/github";
import { detectManifestLicense, detectLicenseFromText } from "@/lib/server/manifest";
import { buildTrustReport } from "@/lib/trust";
import { licenseInfo } from "@/lib/facts";
import { obligationOf } from "@/lib/licenses";

export type RepoEvaluation = {
  data: Awaited<ReturnType<typeof getRepoDetail>>;
  status: ReturnType<typeof buildTrustReport>["status"];
  evidence: ReturnType<typeof buildTrustReport>["evidence"];
  watcher: ReturnType<typeof buildTrustReport>["watcher"];
  license: ReturnType<typeof licenseInfo>;
  obligation: ReturnType<typeof obligationOf>;
  displayLicense: string;
  // フォールバックで解決したライセンス（manifest 宣言 or LICENSE 本文）。無ければ null。
  fileLicense: Awaited<ReturnType<typeof detectManifestLicense>>;
  // fileLicense が manifest 宣言由来か（true）/ LICENSE 本文由来か（false）。表示文言の出し分けに使う。
  licenseFromManifest: boolean;
  fetchedAtIso: string;
  fetchedAtLabel: string;
};

// owner/repo の信頼ファクトを集約評価する。取得失敗（404 等）は配信層で扱うため、ここでは throw する。
export async function evaluateRepo(
  owner: string,
  repo: string,
  locale: "ja" | "en",
): Promise<RepoEvaluation> {
  const data = await getRepoDetail(owner, repo);

  // D40 取得時刻：サーバー評価時刻を UTC 固定で示す（TZ 明示。源別の鮮度はキャッシュ方針＝方法論）。
  const fetchedAtIso = new Date().toISOString();
  const fetchedAtLabel = `${fetchedAtIso.slice(0, 16).replace("T", " ")} UTC`;

  const { status, evidence, watcher } = buildTrustReport(data, { locale });
  const license = licenseInfo(data);

  // GitHub が SPDX 化できないときだけ、ライセンスをフォールバック解決（すべて live）。
  // manifest 宣言と LICENSE 本文判定は依存関係が無いので並列で取得し（不要な直列待ちを排除）、
  // 表示は manifest を優先する。
  const needsLicenseFallback =
    license.kind === "none" || license.kind === "custom";
  const [manifestLicense, textLicense] = needsLicenseFallback
    ? await Promise.all([
        detectManifestLicense(data.owner.login, data.name, data.default_branch),
        detectLicenseFromText(data.owner.login, data.name, data.default_branch),
      ])
    : [null, null];
  const fileLicense = manifestLicense ?? textLicense;
  const effectiveSpdx = needsLicenseFallback
    ? fileLicense?.spdx
    : data.license?.spdx_id;
  const obligation = obligationOf(effectiveSpdx);
  const displayLicense = fileLicense?.spdx ?? license.label;

  return {
    data,
    status,
    evidence,
    watcher,
    license,
    obligation,
    displayLicense,
    fileLicense,
    licenseFromManifest: manifestLicense != null,
    fetchedAtIso,
    fetchedAtLabel,
  };
}
