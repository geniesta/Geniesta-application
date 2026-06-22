import { getTranslations } from "next-intl/server";
import { getRepoPosture } from "@/lib/server/github";
import { Card, CardContent } from "@/components/ui/card";
import { Stat } from "@/components/detail/stat";

// ⑧ 姿勢（security posture）：SECURITY.md・行動規範等の有無 ＋ community health。
// 採点はしない：有無という事実を出典つきで示す。「無い＝悪」ではない（C-3/C-4）。
export async function PostureSection({
  owner,
  repo,
}: {
  owner: string;
  repo: string;
}) {
  const p = await getRepoPosture(owner, repo);
  if (!p) return null;
  const t = await getTranslations("detail");
  const items: Array<[string, boolean]> = [
    [t("postureSecurity"), p.hasSecurityPolicy],
    [t("postureCoc"), p.hasCodeOfConduct],
    [t("postureContributing"), p.hasContributing],
    [t("postureCI"), p.hasCI], // 38 基本健全性：CI 設定の有無
    [t("postureIssue"), p.hasIssueTemplate],
    [t("posturePr"), p.hasPullRequestTemplate],
  ];

  return (
    <section aria-label={t("postureTitle")} className="mb-4 mt-6">
      <h2 className="mb-2 text-base font-semibold">{t("postureTitle")}</h2>
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Stat label={t("health")} value={`${p.healthPercentage}%`} />
            <p className="text-xs text-muted-foreground">{t("healthDesc")}</p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map(([label, has]) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    has
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {has ? "✓" : "—"}
                </span>
                <span>{label}</span>
                <span className="sr-only">{has ? t("yes") : t("no")}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
            <span>{t("postureNote")}</span>
            <a
              href={`https://github.com/${owner}/${repo}/community`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 font-medium text-primary"
            >
              {t("sourceWith", { label: t("srcCommunity") })} ↗
            </a>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
