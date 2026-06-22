import { getTranslations } from "next-intl/server";
import { getMaintainership, getResponsiveness } from "@/lib/server/github";
import { num } from "@/lib/facts";
import { Card, CardContent } from "@/components/ui/card";
import { Stat } from "@/components/detail/stat";

// ⑦ メンテナ集中（bus factor の目安）：活発な人数・トップ貢献者の占有率。
// 採点はしない：占有率という事実を出典つきで示す（C-1/C-5）。
export async function MaintainershipSection({
  owner,
  repo,
}: {
  owner: string;
  repo: string;
}) {
  // 39 応答性は占有率と独立なので並列取得（どちらか欠けても表示は成立）。
  const [m, resp] = await Promise.all([
    getMaintainership(owner, repo),
    getResponsiveness(owner, repo),
  ]);
  if (!m) return null;
  const t = await getTranslations("detail");
  // 占有率の“読み方”（目安）。高占有＝少数依存の傾向（断定しない）。
  const concKey =
    m.top1Share >= 80 ? "concSolo" : m.top3Share >= 80 ? "concFew" : "concSpread";
  // 39 初回応答中央値の表示（48h 以上は日に丸める）。応答ゼロは別文言。
  const respText =
    resp && resp.responded > 0
      ? t("respMedian", {
          value:
            resp.medianHours >= 48
              ? t("respDays", { n: Math.round(resp.medianHours / 24) })
              : t("respHours", { n: Math.round(resp.medianHours) }),
          responded: resp.responded,
          sample: resp.sample,
        })
      : resp
        ? t("respNone", { sample: resp.sample })
        : null;

  return (
    <section aria-label={t("maintainerTitle")} className="mb-4 mt-6">
      <h2 className="mb-2 text-base font-semibold">{t("maintainerTitle")}</h2>
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label={t("activeContributors")}
              value={`${m.sampleCount}${m.hasMore ? "+" : ""}`}
            />
            <Stat label={t("top1Share")} value={`${m.top1Share}%`} />
            <Stat label={t("top3Share")} value={`${m.top3Share}%`} />
          </div>

          <p className="text-sm">
            <b>{t(concKey)}</b>
            <span className="text-muted-foreground">{t("concHint")}</span>
          </p>

          {/* 39 メンテナ応答性（直近 issue の初回応答中央値・事実）。 */}
          {respText ? (
            <p className="text-xs text-muted-foreground">{respText}</p>
          ) : null}

          <ul className="flex flex-wrap gap-2">
            {m.topContributors.map((c) => (
              <li key={c.login}>
                <a
                  href={`https://github.com/${c.login}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs hover:bg-muted"
                >
                  {c.login}
                  <span className="text-muted-foreground">
                    {num(c.contributions)}
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
            <span>{t("maintainerNote", { n: m.sampleCount })}</span>
            <a
              href={`https://github.com/${owner}/${repo}/graphs/contributors`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 font-medium text-primary"
            >
              {t("sourceWith", { label: t("srcContributors") })} ↗
            </a>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
