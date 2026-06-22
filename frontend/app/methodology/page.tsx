import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  return {
    title: en ? "Methodology & transparency" : "方法論と透明性",
    description: en
      ? "We publish the sources, freshness, thresholds and limits behind Geniesta's facts. No scoring — facts with sources and reproducible criteria."
      : "Geniesta が示す事実の取得元・更新頻度・しきい値・限界を公開する。採点はせず、出典つきの事実と再現可能な基準で提示する。",
  };
}

type Row = string[];
type Content = {
  back: string;
  title: string;
  intro: string;
  principlesTitle: string;
  principles: Array<[string, string]>; // [太字, 本文]
  factsTitle: string;
  factsHead: Row;
  factsRows: Row[];
  sourcesTitle: string;
  sourcesHead: Row;
  sourcesRows: Row[];
  sourcesNote: string;
  registriesTitle: string;
  registriesBody: string;
  heuristicsTitle: string;
  heuristicsLead: string;
  maintainerTitle: string;
  maintainerItems: string[];
  statusTitle: string;
  statusItems: string[];
  limitsTitle: string;
  limits: Array<[string, string]>;
  feedbackTitle: string;
  feedbackBody: string;
  northStarTitle: string;
  northStarBody: string;
  footer: string;
};

// しきい値・対応表はコード（lib/usage DIVERGENCE 等）と一致させること。
const M: Record<"ja" | "en", Content> = {
  ja: {
    back: "← 戻る",
    title: "方法論と透明性",
    intro:
      "Geniesta は「採点・善悪の判定」をしません。依存を選ぶその瞬間に、信頼に関わる公開事実を出典つきで集約します。ここでは、何を・どこから・どう見せ、何を見せないかを公開します。既存ツール（Snyk Advisor・Socket・deps.dev・OpenSSF Scorecard 等）は“採点済みパッケージ”が前提で“選ぶ瞬間”から離れがちです。Geniesta の立ち位置は、採点せず・出典つきで・採用の瞬間に集約することです。",
    principlesTitle: "原則",
    principles: [
      ["採点しない。", "総合スコアやランクで「良し悪し」を断定しません。出すのは事実と出典まで（最終判断は利用者）。"],
      ["signals ≠ 保証。", "コードの正しさや未公開の脆弱性は検出できません。事実は判断材料であって安全の保証ではありません。"],
      ["「放置 ≠ ダメ」。", "脆弱性は件数でなく「未修正の有無 × 修正の速さ」で読みます。アーカイブも断罪しません。"],
      ["しきい値は透明・調整可能。", "下記のヒューリスティックは目安であり、いつでも見直せます。"],
      ["反証可能性。", "すべての数値は 1 次ソースへのリンクから検証できます。"],
      ["誘導性の自認。", "事実の選び方・並べ方には弱い誘導性が残ります。正確性・透明性・出典で管理します。"],
    ],
    factsTitle: "信頼ファクト（4軸）と取得元",
    factsHead: ["軸", "提示する事実", "データ源"],
    factsRows: [
      ["生存性", "最終コミット / リリースと頻度・月次コミット推移", "GitHub REST / GraphQL"],
      ["脆弱性", "未修正の有無 × 修正の速さ・CVSS・該当バージョン", "GitHub Advisory (GHSA) ＋ OSV"],
      ["姿勢", "SECURITY.md・行動規範・テンプレート等の有無", "GitHub community profile"],
      ["メンテナ集中", "活発な人数・トップ貢献者の占有率（目安）", "GitHub contributors"],
    ],
    sourcesTitle: "データ源・更新頻度・性質",
    sourcesHead: ["対象", "取得元", "更新の目安"],
    sourcesRows: [
      ["現在値（star/watcher/issue/fork）", "GitHub REST/GraphQL（ライブ）", "約 5分〜"],
      ["脆弱性アドバイザリ", "GitHub GHSA（GraphQL）＋ OSV（api.osv.dev）", "約 1時間"],
      ["活動・姿勢・メンテナ集中", "GitHub REST/GraphQL", "約 24時間"],
      ["パッケージ名 → GitHub リポ解決", "各レジストリの公開 API（npm / crates ほか）", "約 24時間"],
    ],
    sourcesNote:
      "※ サーバー側（RSC / Route Handler）でのみ外部 API を叩き、GITHUB_TOKEN 等の鍵はクライアントに露出しません。OSV は鍵不要の公開 API です。Next の ISR（revalidate / unstable_cache）でレート制限を抑え、取得できない事実は表示せず（graceful degradation）、各カードの出典リンクから 1 次ソースを確認できます。",
    registriesTitle: "対応レジストリ（名前 → GitHub 事実）",
    registriesBody:
      "GitHub を信頼ファクトの土台とし、各レジストリの「名前」からその GitHub リポジトリの事実へ引きます。検索が機能するのは公開検索 API が堅い 8 つ（GitHub・npm・Cargo・RubyGems・Composer・Hex・NuGet・Pub）。公式の曖昧検索が無くワークアラウンドを要する 6 つ（PyPI・Go・Maven・Swift・CocoaPods・Conan）は信頼性の線として「準備中」とし、検索からは到達しません。脆弱性アドバイザリ（GHSA）に対応するのは npm・Cargo です。",
    heuristicsTitle: "ヒューリスティック（しきい値・目安）",
    heuristicsLead:
      "以下は「読み方」を助ける目安で、採点ではありません。いつでも見直せます。",
    maintainerTitle: "メンテナ集中",
    maintainerItems: [
      "トップ1名の占有率 ≥ 80% → 単独メンテナ依存の傾向（bus factor が低い目安）。",
      "上位3名の占有率 ≥ 80% → 少数に集中する傾向。",
      "占有率は上位サンプル内の目安で、全コミット史ではありません。",
    ],
    statusTitle: "状態",
    statusItems: [
      "archived フラグ＝「アーカイブ済み」（断罪しません）。それ以外は「更新あり」。",
    ],
    limitsTitle: "限界・見せないもの",
    limits: [
      ["人気・DL でランク付けしません。", "実使用量（DL 数）による並べ替えや推奨はしません。star も「人気の事実」であって良し悪しではありません。"],
      ["取得できない事実は出しません。", "対応レジストリ外や API 不通時は、その事実を表示せず（graceful degradation）出典リンクで 1 次ソースに誘導します。"],
      ["未公開・未登録の脆弱性は対象外。", "表示は公開アドバイザリ（GHSA / OSV）に限られ、安全を保証するものではありません。"],
      ["バージョン比較は近似。", "semver 系は正確ですが、一部のエコシステムの版体系は近似で評価します。"],
      ["相対時刻の基準は表示時刻（UTC）。", "「2年前」「3日前」等は、そのページを取得・描画した時刻（詳細ページ下部に UTC で明示）を基準に算出します。タイムゾーンは UTC 固定です。"],
    ],
    feedbackTitle: "訂正・フィードバック",
    feedbackBody:
      "事実がおかしい・出典が辿れない場合は、各カードの出典リンクで 1 次ソースを確認のうえご報告ください。しきい値や対応表は調整可能です。",
    northStarTitle: "成功指標（North Star）",
    northStarBody:
      "本プロダクトの North Star は「出典クリック率」＝出典リンクが実際にクリックされた割合（source_click / detail_view）。これは“提示した事実が本当に参照・検証されたか”を表します。件数のみを匿名集計し（閲覧履歴や個人識別子は保存しない）、/api/metrics で確認できます。DAU やページビューを主目標にしないのは、目的が「正しい採用判断の支援」であって滞在の最大化ではないためです。",
    footer:
      "本ページの基準は実装と一致させています。乖離しきい値・データ源・更新頻度が変わった場合はここを更新します。",
  },
  en: {
    back: "← Back",
    title: "Methodology & transparency",
    intro:
      "Geniesta does not score or judge. At the moment you choose a dependency, it aggregates trust-relevant public facts with sources. Here we publish what we show, from where, how — and what we don't. Existing tools (Snyk Advisor, Socket, deps.dev, OpenSSF Scorecard) assume already-scored packages and sit away from the moment of choice. Geniesta's stance: no scoring, with sources, aggregated at the moment of adoption.",
    principlesTitle: "Principles",
    principles: [
      ["No scoring.", "We don't decide \"good/bad\" with a total score or rank. We present facts and sources (you decide)."],
      ["Signals ≠ guarantee.", "We can't detect code correctness or undisclosed vulnerabilities. Facts are inputs, not a safety guarantee."],
      ["Stale ≠ bad.", "Read vulnerabilities by \"unpatched? × time-to-fix\", not raw counts. We don't condemn archived repos."],
      ["Thresholds are transparent & adjustable.", "The heuristics below are guides and can be revised anytime."],
      ["Falsifiability.", "Every number can be verified via a link to its primary source."],
      ["Acknowledged nudging.", "How facts are chosen/ordered carries weak nudging. We manage it with accuracy, transparency and sources."],
    ],
    factsTitle: "Trust facts (4 axes) and sources",
    factsHead: ["Axis", "Facts shown", "Data source"],
    factsRows: [
      ["Liveness", "Last commit / release & cadence, monthly commit trend", "GitHub REST / GraphQL"],
      ["Vulnerabilities", "Unpatched? × time-to-fix, CVSS, affected version", "GitHub Advisory (GHSA) + OSV"],
      ["Posture", "Presence of SECURITY.md, CoC, templates, etc.", "GitHub community profile"],
      ["Maintainer concentration", "Active count, top contributor share (guide)", "GitHub contributors"],
    ],
    sourcesTitle: "Sources, freshness, nature",
    sourcesHead: ["Target", "Source", "Freshness"],
    sourcesRows: [
      ["Current values (star/watcher/issue/fork)", "GitHub REST/GraphQL (live)", "~5 min+"],
      ["Vulnerability advisories", "GitHub GHSA (GraphQL) + OSV (api.osv.dev)", "~1 hour"],
      ["Activity, posture, maintainers", "GitHub REST/GraphQL", "~24 hours"],
      ["Package name → GitHub repo resolution", "Each registry's public API (npm / crates, etc.)", "~24 hours"],
    ],
    sourcesNote:
      "※ External APIs are called only on the server (RSC / Route Handler); secrets like GITHUB_TOKEN are never exposed to the client. OSV is a key-less public API. Next's ISR (revalidate / unstable_cache) keeps rate limits in check; unavailable facts are simply not shown (graceful degradation), and each card links to its primary source.",
    registriesTitle: "Supported registries (name → GitHub facts)",
    registriesBody:
      "GitHub is the basis of trust facts; from a registry name we resolve its GitHub repository's facts. Search is functional for the 8 with robust public search APIs (GitHub, npm, Cargo, RubyGems, Composer, Hex, NuGet, Pub). The 6 that need workarounds for lack of an official fuzzy search (PyPI, Go, Maven, Swift, CocoaPods, Conan) are marked \"coming soon\" as a reliability line and are unreachable via search. GHSA vulnerability advisories cover npm and Cargo.",
    heuristicsTitle: "Heuristics (thresholds & guides)",
    heuristicsLead:
      "These are guides to aid reading, not scores. They can be revised anytime.",
    maintainerTitle: "Maintainer concentration",
    maintainerItems: [
      "Top-1 share ≥ 80% → tends to rely on a single maintainer (low bus factor).",
      "Top-3 share ≥ 80% → tends to concentrate in a few.",
      "Shares are a guide within the top sample, not the full commit history.",
    ],
    statusTitle: "Status",
    statusItems: [
      "The archived flag → \"Archived\" (not condemned). Otherwise \"Active\".",
    ],
    limitsTitle: "Limits & what we don't show",
    limits: [
      ["We don't rank by popularity / downloads.", "We don't sort or recommend by real-world usage (download counts). Stars are also a \"popularity fact\", not a verdict."],
      ["We don't show facts we can't fetch.", "Outside supported registries or when an API is down, the fact is simply not shown (graceful degradation); the source link leads to the primary source."],
      ["Undisclosed/unregistered vulnerabilities are out of scope.", "We show only public advisories (GHSA / OSV); this is not a safety guarantee."],
      ["Version comparison is approximate.", "semver is accurate; some ecosystems' versioning schemes are evaluated approximately."],
      ["Relative times are based on the fetch time (UTC).", "\"2 years ago\", \"3 days ago\" etc. are computed relative to when the page was fetched/rendered (shown in UTC at the bottom of the detail page). The timezone is fixed to UTC."],
    ],
    feedbackTitle: "Corrections & feedback",
    feedbackBody:
      "If a fact looks wrong or a source isn't traceable, please verify via the source link on each card and report it. Thresholds and mappings are adjustable.",
    northStarTitle: "Success metric (North Star)",
    northStarBody:
      "Our North Star is the \"source click-through rate\" — how often source links are actually clicked (source_click / detail_view). It reflects whether the facts we present were truly referenced and verified. We aggregate counts only (no browsing history or identifiers) and expose them at /api/metrics. We deliberately don't optimize for DAU or pageviews: the goal is supporting sound adoption decisions, not maximizing time on site.",
    footer:
      "This page is kept in sync with the implementation. We update it when thresholds, sources or freshness change.",
  },
};

// 透明性ページ：何を・どこから・どう見せ、何を見せないかを公開する（製品テーゼ C-1〜C-7）。
export default async function MethodologyPage() {
  const c = M[(await getLocale()) === "en" ? "en" : "ja"];
  return (
    <main id="main" className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-6 py-8 lg:px-10">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        {c.back}
      </Link>

      <h1 className="mb-2 text-2xl font-bold tracking-tight">{c.title}</h1>
      <p className="mb-8 max-w-2xl text-sm text-muted-foreground">{c.intro}</p>

      <Section title={c.principlesTitle}>
        <ul className="space-y-2 text-sm">
          {c.principles.map(([b, body]) => (
            <Principle key={b}>
              <b>{b}</b>
              {body}
            </Principle>
          ))}
        </ul>
      </Section>

      <Section title={c.factsTitle}>
        <FactTable head={c.factsHead} rows={c.factsRows} />
      </Section>

      <Section title={c.sourcesTitle}>
        <FactTable head={c.sourcesHead} rows={c.sourcesRows} />
        <p className="mt-3 text-xs text-muted-foreground">{c.sourcesNote}</p>
      </Section>

      <Section title={c.registriesTitle}>
        <p className="max-w-2xl text-sm text-muted-foreground">{c.registriesBody}</p>
      </Section>

      <Section title={c.heuristicsTitle}>
        <p className="mb-3 text-sm text-muted-foreground">{c.heuristicsLead}</p>
        <h3 className="mb-1 text-sm font-semibold">{c.maintainerTitle}</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {c.maintainerItems.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <h3 className="mb-1 mt-4 text-sm font-semibold">{c.statusTitle}</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {c.statusItems.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </Section>

      <Section title={c.limitsTitle}>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {c.limits.map(([b, body]) => (
            <li key={b}>
              <b className="text-foreground">{b}</b>
              {body}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={c.northStarTitle}>
        <p className="text-sm text-muted-foreground">{c.northStarBody}</p>
      </Section>

      <Section title={c.feedbackTitle}>
        <p className="text-sm text-muted-foreground">{c.feedbackBody}</p>
      </Section>

      <p className="mt-8 text-xs text-muted-foreground">{c.footer}</p>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8" aria-label={title}>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Principle({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-lg border bg-muted/30 px-3 py-2">{children}</li>
  );
}

function FactTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            {head.map((h) => (
              <th key={h} scope="col" className="p-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b align-top">
              {r.map((cell, i) => (
                <td
                  key={i}
                  className={i === 0 ? "p-2 font-medium" : "p-2 text-muted-foreground"}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
