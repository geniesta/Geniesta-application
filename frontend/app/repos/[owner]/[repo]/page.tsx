import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GitHubError, getRepoDetail } from "@/lib/server/github";
import { num } from "@/lib/facts";
import { type Tone } from "@/lib/trust";
import { evaluateRepo } from "@/lib/use-cases/evaluate-repo";
import {
  GHSA_ECOSYSTEMS,
  GHSA_ECOSYSTEM,
  SOURCE_LABELS,
} from "@/lib/search-query";
import { SITE_URL } from "@/lib/site";
import { CompareButton } from "@/components/compare-button";
import { WatchButton } from "@/components/watch";
import { RecordRecent } from "@/components/recent-viewed";
import { AnalyticsTracker } from "@/components/analytics";
import { FeedbackButtons } from "@/components/feedback";
import { InfoTip } from "@/components/info-tip";
import { normalizePackageName } from "@/lib/pkg-name";
import { getTranslations, getLocale } from "next-intl/server";
import { ErrorState } from "@/components/states";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/detail/stat";
import { BackLink } from "@/components/detail/back-link";
import { AnchorNav } from "@/components/detail/anchor-nav";
import { AdoptionChecklist } from "@/components/detail/adoption-checklist";
import { VulnDashboard, VulnSkeleton } from "@/components/detail/vuln-dashboard";
import { ActivitySection } from "@/components/detail/activity-section";
import { MaintainershipSection } from "@/components/detail/maintainership-section";
import { PostureSection } from "@/components/detail/posture-section";

type Params = Promise<{ owner: string; repo: string }>;
type Search = Promise<{ eco?: string; pkg?: string; ver?: string; sev?: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { owner, repo } = await params;
  // 未存在は HTTP 404 ステータスで返す（SEO/正しさ）。これにはレスポンスの 1 バイト目より前に
  // notFound() が走る必要がある。Next 16 は generateMetadata を通常ブラウザ向けに「ストリーミング」
  // するため、ここでの notFound() はステータス確定をブロックしない（bot 等の HTML-limited UA では
  // ブロックする）。確実な 404 は、このルートに loading.tsx を置かず本体（page）の await を
  // ブロックさせることで担保する（重いセクションだけ内側 <Suspense> でストリーミングする）。
  // ここの存在チェックは bot 向けの早期 404 ＋ メタデータ最小化のための補助。
  // getRepoDetail は unstable_cache 済みのため本体側の取得と重複しない（追加 API なし）。
  try {
    await getRepoDetail(owner, repo);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) notFound();
    // 404 以外（レート制限/通信）はメタデータを最小で返し、本体のエラー処理に委ねる。
  }
  const t = await getTranslations("detail");
  const title = `${owner}/${repo}`;
  const description = t("metaDescription", { name: `${owner}/${repo}` });
  const url = `/repos/${owner}/${repo}`;
  // OG/Twitter 画像は opengraph-image.tsx（動的・ブランドカード）が自動付与する。
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} — Geniesta`,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — Geniesta`,
      description,
    },
  };
}

export default async function RepoDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { owner, repo } = await params;
  const sp = await searchParams;
  // パッケージ文脈（一覧のレジストリカードから引き継ぐ）。
  //   ecoVuln  … 脆弱性（GHSA）照会用。GHSA 対応エコシステムのみ
  const ecoVuln = sp.eco && GHSA_ECOSYSTEMS.has(sp.eco) ? sp.eco : null;
  // 76 パッケージ名正規化：eco 規約に沿って一度だけ正規化し、以降の照会（脆弱性/実使用/版日付）で共有。
  const pkgRaw = sp.pkg?.trim() || null;
  const pkgName = pkgRaw ? normalizePackageName(sp.eco, pkgRaw) : null;
  const pkgVersion = sp.ver?.trim() || null;
  const t = await getTranslations("detail");

  const locale = (await getLocale()) === "en" ? "en" : "ja";

  // 配信層（このページ）はユースケース evaluateRepo を呼ぶだけ。取得失敗（404/その他）の扱いと
  // HTTP/RSC の関心（notFound・エラー UI・描画）だけをここで担う。評価ロジック本体は application 層。
  let evaluation;
  try {
    evaluation = await evaluateRepo(owner, repo, locale);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) notFound();
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <BackLink />
        <ErrorState
          message={e instanceof GitHubError ? e.message : "取得に失敗しました"}
        />
      </main>
    );
  }
  const {
    data,
    status,
    evidence,
    watcher,
    license,
    obligation,
    displayLicense,
    fileLicense,
    licenseFromManifest,
    fetchedAtIso,
    fetchedAtLabel,
  } = evaluation;

  // 構造化データ（schema.org SoftwareSourceCode）＝リッチ結果・機械可読の事実。
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: data.full_name,
    description: data.description ?? undefined,
    codeRepository: data.html_url,
    programmingLanguage: data.language ?? undefined,
    license: data.license?.spdx_id ?? undefined,
    author: { "@type": "Organization", name: data.owner.login },
  };

  // B13 パンくず：ホーム →（来訪元のレジストリ）→ リポジトリ（現在地）。
  // eco（GHSA/Usage の enum）から source slug を逆引きできた時だけ中間クラムを出す。
  const ecoToSlug = Object.fromEntries(
    Object.entries(GHSA_ECOSYSTEM).map(([slug, en]) => [en, slug]),
  );
  const ecoSlug = sp.eco ? ecoToSlug[sp.eco] : undefined;
  const crumbs: Array<{ name: string; href?: string }> = [
    { name: t("breadcrumbHome"), href: "/" },
    ...(ecoSlug && pkgName
      ? [
          {
            name: SOURCE_LABELS[ecoSlug] ?? ecoSlug,
            href: `/?src=${ecoSlug}&q=${encodeURIComponent(pkgName)}`,
          },
        ]
      : []),
    { name: data.full_name }, // 現在地（リンクなし）
  ];
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.href
        ? `${SITE_URL}${c.href}`
        : `${SITE_URL}/repos/${owner}/${repo}`,
    })),
  };

  // B19 ページ内アンカーナビ：実際に描画されるセクションだけを列挙（条件付きは出さない）。
  const hasVuln = !!(ecoVuln && pkgName);
  const anchors: Array<{ id: string; label: string }> = [
    { id: "evidence", label: t("evidence") },
    ...(hasVuln ? [{ id: "vuln", label: t("vulnTitle") }] : []),
    { id: "activity", label: t("activityTitle") },
    { id: "maintainers", label: t("maintainerTitle") },
    { id: "posture", label: t("postureTitle") },
  ];

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-10">
      <script
        type="application/ld+json"
        // 事実のみ（XSS 面: 値は GitHub 由来の文字列。JSON.stringify でエスケープ）。
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <RecordRecent owner={data.owner.login} repo={data.name} />
      <AnalyticsTracker view="detail_view" />
      <BackLink />

      {/* B13 パンくず（現在地） */}
      <nav aria-label={t("breadcrumbLabel")} className="mb-3">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {crumbs.map((c, i) => (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 ? <span aria-hidden="true">/</span> : null}
              {c.href ? (
                <Link href={c.href} className="hover:text-foreground hover:underline">
                  {c.name}
                </Link>
              ) : (
                <span aria-current="page" className="text-foreground">
                  {c.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* リポジトリ見出し（必須項目: name / owner icon / language） */}
      <header className="mb-3 flex items-center gap-4">
        <Image
          src={data.owner.avatar_url}
          alt={`${data.owner.login} のアイコン`}
          width={56}
          height={56}
          // 外部アバターは既に最適化済みなので再最適化しない（sharp 非依存にする）
          unoptimized
          // 透過/暗色ロゴのアバター対策：ダーク時は背景を白にして輪郭も枠で出す
          // （不透明アバターは画像が白を覆うため見た目は変わらない）。
          className="rounded-xl ring-1 ring-border dark:bg-white"
        />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{data.full_name}</h1>
          <a
            href={data.html_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary"
          >
            {data.language ?? t("languageUnknown")} · {t("openOnGithub")} ↗
          </a>
        </div>
        {/* 比較に追加 / ウォッチ（採用検討中の依存を貯める） */}
        <div className="ml-auto flex shrink-0 gap-2">
          <WatchButton owner={data.owner.login} repo={data.name} />
          <CompareButton owner={data.owner.login} repo={data.name} />
        </div>
      </header>

      {/* 175 パーマリンク安定化：GitHub API は改名を追従するため、要求 URL と正規名が
          異なる場合がある。事実として「改名された」ことを中立に示す（旧 URL も機能する）。 */}
      {data.full_name.toLowerCase() !== `${owner}/${repo}`.toLowerCase() ? (
        <p className="mb-3 text-xs text-amber-700">
          {t("renamedNote", { from: `${owner}/${repo}`, to: data.full_name })}
        </p>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="gap-1.5">
          {t("license")} <b className="text-foreground">{displayLicense}</b>
          {obligation ? (
            <span className="text-muted-foreground">· {obligation.label}</span>
          ) : null}
          <a
            href={license.sourceHref}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary"
          >
            {t("source")} ↗
          </a>
        </Badge>
        {/* D35 ライセンス互換性の中立な「読み方」（採点せず・条文確認を促すのみ） */}
        <InfoTip label={t("readHelp")}>{t("readLicense")}</InfoTip>
        {fileLicense ? (
          <span className="text-muted-foreground">
            ※{" "}
            {licenseFromManifest
              ? t("licenseDeclared", { file: fileLicense.source })
              : t("licenseFromText", { file: fileLicense.source })}
            {obligation ? ` ${obligation.trigger}` : ""}{" "}
            <a
              href={fileLicense.href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary"
            >
              {t("source")} ↗
            </a>
          </span>
        ) : obligation ? (
          <span className="text-muted-foreground">{obligation.trigger}</span>
        ) : license.kind === "none" ? (
          <span className="text-muted-foreground">{t("licenseNoneNote")}</span>
        ) : license.kind === "custom" ? (
          <span className="text-muted-foreground">{t("licenseCustomNote")}</span>
        ) : null}
      </div>

      {data.description ? (
        <p className="mb-5 text-sm text-muted-foreground">{data.description}</p>
      ) : null}

      {/* UX58 必須の基本指標（star/watcher/fork/issue）を上部に配置＝要件の基本情報を埋もれさせない。
          信頼ファクト（状態→根拠→…）はこの直後に続く（事実で選ぶ姿勢は維持）。 */}
      <h2 className="sr-only">{t("basicMetrics")}</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Star" value={num(data.stargazers_count)} />
        <Stat label="Watcher" value={watcher !== undefined ? num(watcher) : "—"} />
        <Stat label="Fork" value={num(data.forks_count)} />
        <Stat label="Issue" value={num(data.open_issues_count)} />
      </div>

      {/*
        提示順序は固定する（製品の顔）。脅しから入らない:
        ① 状態（動いている/止まっている）
        ② ライセンス変更の自動検知（deps.dev・あれば）
        ③ 根拠3点 + 出典
        すべて live/auto（人手の編集データは使わない）。
      */}

      {/* B19 ページ内アンカーナビ（描画されるセクションへジャンプ） */}
      <AnchorNav items={anchors} label={t("anchorNavLabel")} title={data.full_name} />

      {/* ① 状態 */}
      <section aria-label="状態" className="mb-4">
        <Card className={toneBox(status.tone)}>
          <CardContent className="space-y-2">
            <Badge className={toneChip(status.tone)}>{status.label}</Badge>
            <p className="text-sm">{status.state}</p>
          </CardContent>
        </Card>
      </section>

      {/* ③ 根拠（事実3点 + 出典） */}
      <section id="evidence" aria-label={t("evidence")} className="scroll-mt-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-base font-semibold">
          {t("evidence")}
          {/* B20 「読み方」ツールチップ：事実の読み方を中立に補助する。 */}
          <InfoTip label={t("readHelp")}>{t("readEvidence")}</InfoTip>
        </h2>
        <Card className="gap-0 py-0">
          <CardContent className="divide-y px-0 py-0">
          {evidence.map((e) => (
            <div
              key={e.key}
              className="flex items-center gap-3 px-4 py-3 text-sm"
            >
              <span className="w-20 shrink-0 text-xs font-semibold text-muted-foreground">
                {e.key}
              </span>
              <span>{e.value}</span>
              <a
                href={e.source.href}
                target="_blank"
                rel="noreferrer"
                className="ml-auto shrink-0 text-xs font-medium text-primary"
              >
                {t("sourceWith", { label: e.source.label })} ↗
              </a>
            </div>
          ))}
          </CardContent>
        </Card>
      </section>

      {/* 採用前チェックリスト（194）：既存の事実を集約した判断材料。採点はしない。 */}
      <Suspense fallback={null}>
        <AdoptionChecklist
          owner={data.owner.login}
          repo={data.name}
          ecoVuln={ecoVuln}
          pkgName={pkgName}
          pkgVersion={pkgVersion}
          statusLabel={status.label}
          license={displayLicense}
        />
      </Suspense>

      {/* ④ 脆弱性（公開アドバイザリ・GHSA）。GHSA 対応エコシステムのみ。 */}
      {hasVuln ? (
        <div id="vuln" className="scroll-mt-4">
          <Suspense
            fallback={
              <VulnSkeleton label={t("loadingSection", { section: t("vulnTitle") })} />
            }
          >
            <VulnDashboard
              ecosystem={ecoVuln!}
              pkg={pkgName!}
              version={pkgVersion}
              sevFilter={sp.sev}
            />
          </Suspense>
        </div>
      ) : null}

      {/* ⑥ 活動（リリース頻度・コミット推移）＝生存性の可視化。 */}
      <div id="activity" className="scroll-mt-4">
        <Suspense
          fallback={
            <VulnSkeleton label={t("loadingSection", { section: t("activityTitle") })} />
          }
        >
          <ActivitySection owner={data.owner.login} repo={data.name} />
        </Suspense>
      </div>

      {/* ⑦ メンテナ集中（活発な人数・トップ占有率）＝bus factor の目安。 */}
      <div id="maintainers" className="scroll-mt-4">
        <Suspense
          fallback={
            <VulnSkeleton label={t("loadingSection", { section: t("maintainerTitle") })} />
          }
        >
          <MaintainershipSection owner={data.owner.login} repo={data.name} />
        </Suspense>
      </div>

      {/* ⑧ 姿勢（SECURITY.md・行動規範等の有無）＝セキュリティ姿勢の事実。 */}
      <div id="posture" className="scroll-mt-4">
        <Suspense
          fallback={
            <VulnSkeleton label={t("loadingSection", { section: t("postureTitle") })} />
          }
        >
          <PostureSection owner={data.owner.login} repo={data.name} />
        </Suspense>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        {t("disclaimer")}{" "}
        <Link href="/methodology" className="font-medium text-primary hover:underline">
          {t("methodologyLink")}
        </Link>
      </p>

      {/* D40 鮮度の透明化：この内容を取得・描画した時刻（UTC・TZ を明示）。
          源ごとの更新頻度はキャッシュ方針に従う（方法論ページに記載）。 */}
      <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
        <time dateTime={fetchedAtIso}>{t("fetchedAt", { time: fetchedAtLabel })}</time>
      </p>

      {/* 200 フィードバックループ（役立った/おかしい・件数のみ）＋ 89 訂正報告の導線 */}
      <FeedbackButtons subject={data.full_name} />
    </main>
  );
}

// tone → 表示クラス。halt(=harmful) 以外は alarmist にしない。
function toneBox(tone: Tone): string {
  // ダーク対応：淡色ボックスは暗背景で破綻するため dark: で反転トーンを当てる。
  return tone === "ok"
    ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
    : "border-border bg-muted text-foreground";
}

function toneChip(tone: Tone): string {
  // 白文字に対し WCAG AA(4.5:1) を満たす濃さにする（emerald-600=3.65 は不足）。
  // emerald-700≈5.9:1 / slate-600≈7:1。
  return tone === "ok"
    ? "bg-emerald-700 text-white"
    : "bg-slate-600 text-white";
}
