import { getTranslations, getLocale } from "next-intl/server";
import { getRepoActivity, type RepoActivity } from "@/lib/server/github";
import { num, relativeLabel } from "@/lib/facts";
import { Card, CardContent } from "@/components/ui/card";
import { Stat } from "@/components/detail/stat";

// ⑥ 活動（生存性の可視化）：リリース頻度＋月次コミット推移。
export async function ActivitySection({
  owner,
  repo,
}: {
  owner: string;
  repo: string;
}) {
  const act: RepoActivity | null = await getRepoActivity(owner, repo);
  if (!act) return null;
  const max = Math.max(1, ...act.monthly);
  const t = await getTranslations("detail");
  const locale = (await getLocale()) === "en" ? "en" : "ja";

  return (
    <section aria-label={t("activityTitle")} className="mb-4 mt-6">
      <h2 className="mb-2 text-base font-semibold">{t("activityTitle")}</h2>
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t("commitsLastYear")} value={num(act.commitsLastYear)} />
            <Stat label={t("releasesLastYear")} value={num(act.releasesLastYear)} />
            <Stat
              label={t("lastRelease")}
              value={
                act.lastReleaseAt
                  ? relativeLabel(act.lastReleaseAt, undefined, locale)
                  : "—"
              }
            />
            {/* リリース間隔（中央値・空白期間）＝ケイデンスの可視化（D33）。 */}
            <Stat
              label={t("releaseCadence")}
              value={
                act.releaseMedianGapDays != null
                  ? t("gapDays", { n: act.releaseMedianGapDays })
                  : "—"
              }
            />
          </div>

          {act.releaseMedianGapDays != null && act.daysSinceLastRelease != null ? (
            <p className="text-xs text-muted-foreground">
              {t("releaseGapNote", {
                n: act.daysSinceLastRelease,
                median: act.releaseMedianGapDays,
              })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("releaseGapNoData")}
            </p>
          )}

          {/* 月次コミット推移（直近12か月） */}
          <div>
            <div className="mb-1 text-xs text-muted-foreground">
              {t("monthlyCommits", { n: num(act.commitsLastYear) })}
            </div>
            <div
              className="flex h-16 items-end gap-1"
              role="img"
              aria-label={t("monthlyAria", { series: act.monthly.join(", ") })}
            >
              {act.monthly.map((c, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-primary/70"
                  style={{ height: `${Math.max(2, Math.round((c / max) * 100))}%` }}
                  title={`${c} commits`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t pt-3 text-xs">
            <a
              href={`https://github.com/${owner}/${repo}/graphs/commit-activity`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary"
            >
              {t("sourceWith", { label: t("srcCommitActivity") })} ↗
            </a>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
