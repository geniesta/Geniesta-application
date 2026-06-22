// リポジトリの「信頼に関わる状態」を、生データから導出するコア。
// 100% live/auto：人手の編集データ（curated）は使わない。
// 採点・善悪判定はしない。状態(status)・根拠(evidence) を出典つきで返す。
//
// 語彙の統制：severity / Critical / 警告 は使わない。status = active | archived。

import type { Repo } from "@/lib/types";
import { relativeLabel, num, type Locale } from "@/lib/facts";

// 各文言の ja/en（事実フレーズはここで持つ＝純関数のまま i18n）。
const L = {
  ja: {
    archived: "アーカイブ済み",
    active: "更新あり",
    archivedState: (d: string) =>
      `アーカイブされ、新しい更新は行われていません（最終更新 ${d}）。`,
    activeState: (d: string) => `メンテナンスが続いています（最終更新 ${d}）。`,
    axisLiveness: "生存性",
    axisMaintainer: "メンテナ",
    axisUsage: "実使用",
    livenessValue: (archived: boolean, last: string, rel: string | null) =>
      `${archived ? "アーカイブ・" : ""}最終更新 ${last}` +
      (rel ? `・最新リリース ${rel}` : ""),
    maintainerValue: (w: string, f: string) => `Watcher ${w} / Fork ${f}`,
    usageValue: "DL・被依存・star との乖離で読む（生件数では測らない）",
    srcCommits: "コミット履歴",
    srcContributors: "コントリビューター",
    srcDependents: "Dependents",
  },
  en: {
    archived: "Archived",
    active: "Active",
    archivedState: (d: string) =>
      `Archived; no further updates (last updated ${d}).`,
    activeState: (d: string) => `Actively maintained (last updated ${d}).`,
    axisLiveness: "Liveness",
    axisMaintainer: "Maintainers",
    axisUsage: "Real-world usage",
    livenessValue: (archived: boolean, last: string, rel: string | null) =>
      `${archived ? "Archived · " : ""}last updated ${last}` +
      (rel ? ` · latest release ${rel}` : ""),
    maintainerValue: (w: string, f: string) => `Watchers ${w} / Forks ${f}`,
    usageValue: "Read via DL, dependents and DL–star divergence (not raw counts)",
    srcCommits: "Commit history",
    srcContributors: "Contributors",
    srcDependents: "Dependents",
  },
} as const;

export type TrustStatus = "active" | "archived";

// tone は表示の調子。alarmist な語にしない。
export type Tone = "ok" | "muted";

export type StatusInfo = {
  status: TrustStatus;
  label: string; // 状態の短い語
  state: string; // 状態の説明（事実。脅しではない）
  tone: Tone;
};

export type Evidence = {
  key: string;
  value: string;
  source: { label: string; href: string };
};

export type TrustReport = {
  status: StatusInfo;
  evidence: Evidence[]; // 根拠（出典つき・3点）
  watcher: number | undefined; // subscribers_count（正確な Watcher）
};

// 最終活動日時：GraphQL の最終コミット日があれば優先、無ければ pushed_at。
function lastActivity(repo: Repo): string {
  return repo.last_commit_at || repo.pushed_at;
}

/** 状態を導出する（GitHub の archived フラグと最終更新のみ＝live）。既定ロケールは ja。 */
export function deriveStatus(
  repo: Repo,
  now: number = Date.now(),
  locale: Locale = "ja",
): StatusInfo {
  const m = L[locale];
  const last = relativeLabel(lastActivity(repo), now, locale);
  if (repo.archived) {
    return {
      status: "archived",
      label: m.archived,
      state: m.archivedState(last),
      tone: "muted",
    };
  }
  return {
    status: "active",
    label: m.active,
    state: m.activeState(last),
    tone: "ok",
  };
}

/** 根拠（事実）3点を出典つきで構成する。 */
function buildEvidence(repo: Repo, now: number, locale: Locale): Evidence[] {
  const m = L[locale];
  const watcher = repo.subscribers_count;
  return [
    {
      key: m.axisLiveness,
      value: m.livenessValue(
        repo.archived,
        relativeLabel(lastActivity(repo), now, locale),
        repo.latest_release_at
          ? relativeLabel(repo.latest_release_at, now, locale)
          : null,
      ),
      source: { label: m.srcCommits, href: `${repo.html_url}/commits` },
    },
    {
      key: m.axisMaintainer,
      value: m.maintainerValue(
        watcher !== undefined ? num(watcher) : "—",
        num(repo.forks_count),
      ),
      source: {
        label: m.srcContributors,
        href: `${repo.html_url}/graphs/contributors`,
      },
    },
    {
      key: m.axisUsage,
      value: m.usageValue,
      source: {
        label: m.srcDependents,
        href: `${repo.html_url}/network/dependents`,
      },
    },
  ];
}

export function buildTrustReport(
  repo: Repo,
  opts: { now?: number; locale?: Locale } = {},
): TrustReport {
  const now = opts.now ?? Date.now();
  const locale = opts.locale ?? "ja";
  return {
    status: deriveStatus(repo, now, locale),
    evidence: buildEvidence(repo, now, locale),
    watcher: repo.subscribers_count,
  };
}
