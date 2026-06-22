import Image from "next/image";
import Link from "next/link";
import type { Repo } from "@/lib/server/github";
import { useLocale, useTranslations } from "next-intl";
import { licenseInfo, num, relativeLabel } from "@/lib/facts";
import { deriveStatus, type Tone } from "@/lib/trust";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// mode:
//   "detail" … カード→詳細ページ（メイン結果・課題要件）
//   "search" … カード→そのライブラリ名で再検索（関連ライブラリの探索ピボット）
// 一覧カードは軽量に保つ（NFR-4 段階化）：ライセンスは GitHub の検出値のみ表示し、
// マニフェスト/本文からの補完（raw 取得）は詳細ページに委ねる。
export function RepoCard({
  repo,
  mode = "detail",
  params,
}: {
  repo: Repo;
  mode?: "detail" | "search";
  // 詳細リンクに付すクエリ（例: パッケージ文脈 eco/pkg＝脆弱性アドバイザリ照会用）。
  params?: string;
}) {
  const t = useTranslations("card");
  const locale = useLocale() === "en" ? "en" : "ja";
  const status = deriveStatus(repo, undefined, locale);
  const licShort = licenseInfo(repo).short;

  const isSearch = mode === "search";
  const href = isSearch
    ? `/?q=${encodeURIComponent(repo.name)}`
    : `/repos/${repo.owner.login}/${repo.name}${params ? `?${params}` : ""}`;

  return (
    <Link
      href={href}
      aria-label={
        isSearch
          ? t("reSearch", { repo: repo.full_name })
          : t("toDetail", { repo: repo.full_name })
      }
      className="group block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Card className="h-full gap-3 transition group-hover:shadow-md group-hover:ring-foreground/20">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Image
              src={repo.owner.avatar_url}
              alt={t("ownerIconAlt", { owner: repo.owner.login })}
              width={40}
              height={40}
              unoptimized
              // 透過/暗色ロゴのアバター対策：ダーク時は背景を白にして輪郭も枠で出す
              // （不透明アバターは画像が白を覆うため見た目は変わらない）。
              className="rounded-lg ring-1 ring-border dark:bg-white"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold leading-tight">
                {repo.name}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {repo.owner.login}
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {licShort}
            </Badge>
          </div>

          {repo.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {repo.description}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            <Badge className={toneBadge(status.tone)}>{status.label}</Badge>
            <Badge variant="outline">
              {t("lastUpdate", { rel: relativeLabel(repo.pushed_at, undefined, locale) })}
            </Badge>
            <Badge variant="outline">
              {repo.owner.type === "Organization" ? t("org") : t("user")}
            </Badge>
            <Badge variant="outline">★ {num(repo.stargazers_count)}</Badge>
            {/* 正確な Watcher（GraphQL バッチ取得時のみ）。star 別名の watchers_count とは別。 */}
            {repo.subscribers_count != null ? (
              <Badge variant="outline">
                {t("watcher", { n: num(repo.subscribers_count) })}
              </Badge>
            ) : null}
            <Badge variant="outline">
              {t("issue", { n: num(repo.open_issues_count) })}
            </Badge>
            {repo.latest_release_at ? (
              <Badge variant="outline">
                {t("latestRelease", {
                  rel: relativeLabel(repo.latest_release_at, undefined, locale),
                })}
              </Badge>
            ) : null}
            {repo.language ? (
              <Badge variant="outline">{repo.language}</Badge>
            ) : null}
          </div>

          <div className="flex items-center text-sm text-muted-foreground">
            <span>{t("fork", { n: num(repo.forks_count) })}</span>
            <span className="ml-auto font-semibold text-primary transition group-hover:translate-x-0.5">
              {isSearch ? t("searchArrow") : t("detailArrow")}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// tone → Badge の色。alarmist にしない。
function toneBadge(tone: Tone): string {
  return tone === "ok"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
    : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300";
}
