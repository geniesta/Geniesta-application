import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getReposBatch,
  getMaintainership,
  getRepoPosture,
  type Repo,
} from "@/lib/server/github";
import { getTranslations, getLocale } from "next-intl/server";
import { num, relativeLabel, licenseInfo } from "@/lib/facts";
import { deriveStatus } from "@/lib/trust";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsTracker } from "@/components/analytics";

type Search = Promise<{ repos?: string }>;

export const metadata: Metadata = {
  title: "比較 — Geniesta",
  description: "複数の OSS ライブラリを、信頼に関わる公開事実で横並び比較する。",
};

// "owner/repo,owner/repo" をパース（最大3件・重複除去・形式検証）。
function parseRepos(raw: string | undefined): Array<{ owner: string; repo: string }> {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: Array<{ owner: string; repo: string }> = [];
  for (const part of raw.split(",")) {
    const m = part.trim().match(/^([^/\s]+)\/([^/\s]+)$/);
    if (!m) continue;
    const key = `${m[1]}/${m[2]}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ owner: m[1], repo: m[2] });
    if (out.length >= 3) break;
  }
  return out;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const sp = await searchParams;
  const refs = parseRepos(sp.repos);
  const t = await getTranslations("compare");

  return (
    <main id="main" className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-6 py-8 lg:px-10">
      <AnalyticsTracker view="compare_open" />
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        {t("back")}
      </Link>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>

      {refs.length < 2 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            {t("needTwo")}
          </CardContent>
        </Card>
      ) : (
        // 比較表は getReposBatch（GitHub API）を待つ。Suspense で包み、シェル（見出し/戻る）は
        // 即表示し、表だけストリーミングで流す（遷移を 1 秒未満に保つ）。
        <Suspense fallback={<CompareTableSkeleton count={refs.length} />}>
          <CompareTable refs={refs} />
        </Suspense>
      )}
    </main>
  );
}

function CompareTableSkeleton({ count }: { count: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${Math.min(count, 3)}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-16" />
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-3 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function CompareTable({
  refs,
}: {
  refs: Array<{ owner: string; repo: string }>;
}) {
  const batch = await getReposBatch(refs);
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const repos = refs
    .map((r) => batch.get(`${r.owner}/${r.repo}`.toLowerCase()))
    .filter((r): r is Repo => r != null);

  if (repos.length < 2) {
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          比較対象を取得できませんでした（リネーム/非公開/レート制限の可能性）。
        </CardContent>
      </Card>
    );
  }

  // owner/repo だけで取れる事実（メンテナ集中・姿勢）を比較にも追加（≤3件・キャッシュ済み）。
  const extras = new Map<
    number,
    {
      top1Share: number | null;
      health: number | null;
      hasSecurity: boolean | null;
    }
  >();
  await Promise.all(
    repos.map(async (r) => {
      const [m, p] = await Promise.all([
        getMaintainership(r.owner.login, r.name),
        getRepoPosture(r.owner.login, r.name),
      ]);
      extras.set(r.id, {
        top1Share: m?.top1Share ?? null,
        health: p?.healthPercentage ?? null,
        hasSecurity: p ? p.hasSecurityPolicy : null,
      });
    }),
  );

  // 行＝指標。値は事実のみ（採点しない）。
  const rows: Array<{ label: string; cell: (r: Repo) => React.ReactNode }> = [
    {
      label: "状態",
      cell: (r) => {
        const s = deriveStatus(r, undefined, locale);
        return (
          <Badge
            className={
              s.tone === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
            }
          >
            {s.label}
          </Badge>
        );
      },
    },
    { label: "言語", cell: (r) => r.language ?? "—" },
    { label: "ライセンス", cell: (r) => licenseInfo(r).short },
    { label: "Star", cell: (r) => num(r.stargazers_count) },
    {
      label: "Watcher",
      cell: (r) =>
        r.subscribers_count != null ? num(r.subscribers_count) : "—",
    },
    { label: "Fork", cell: (r) => num(r.forks_count) },
    { label: "Issue", cell: (r) => num(r.open_issues_count) },
    {
      label: "最終更新",
      cell: (r) => relativeLabel(r.last_commit_at || r.pushed_at, undefined, locale),
    },
    {
      label: "最新リリース",
      cell: (r) =>
        r.latest_release_at
          ? relativeLabel(r.latest_release_at, undefined, locale)
          : "—",
    },
    {
      label: "メンテナ集中",
      cell: (r) => {
        const t = extras.get(r.id)?.top1Share;
        return t != null ? `トップ ${t}%` : "—";
      },
    },
    {
      label: "姿勢 (health)",
      cell: (r) => {
        const e = extras.get(r.id);
        return e?.health != null ? `${e.health}%` : "—";
      },
    },
    {
      label: "SECURITY.md",
      cell: (r) => {
        const s = extras.get(r.id)?.hasSecurity;
        if (s == null) return "—";
        return (
          <Badge
            className={
              s
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
            }
          >
            {s ? "あり" : "なし"}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">ライブラリの信頼ファクト比較表</caption>
        <thead>
          <tr>
            <th scope="col" className="w-32 p-2 text-left align-bottom" />
            {repos.map((r) => (
              <th key={r.id} scope="col" className="p-2 text-left align-bottom">
                <div className="flex items-center gap-2">
                  <Image
                    src={r.owner.avatar_url}
                    alt={`${r.owner.login} のアイコン`}
                    width={28}
                    height={28}
                    unoptimized
                    // 透過/暗色ロゴのアバター対策：ダーク時は背景を白にして輪郭も枠で出す
                    // （不透明アバターは画像が白を覆うため見た目は変わらない）。
                    className="rounded-md ring-1 ring-border dark:bg-white"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/repos/${r.owner.login}/${r.name}`}
                      className="block truncate font-semibold text-primary hover:underline"
                    >
                      {r.name}
                    </Link>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {r.owner.login}
                    </span>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t">
              <th
                scope="row"
                className="p-2 text-left text-xs font-semibold text-muted-foreground"
              >
                {row.label}
              </th>
              {repos.map((r) => (
                <td key={r.id} className="p-2 tabular-nums">
                  {row.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted-foreground">
        現在値は GitHub のライブデータ（Watcher は subscribers_count、最終更新は既定ブランチの最終コミット）。
        各列の詳細ページで脆弱性・実使用・メンテナ集中などの根拠も確認できます。
      </p>
    </div>
  );
}
