import { getTranslations } from "next-intl/server";
import {
  getSecurityVulnerabilities,
  getMaintainership,
  getRepoPosture,
} from "@/lib/server/github";
import { isAffected } from "@/lib/version";
import { Card, CardContent } from "@/components/ui/card";

// 採用前チェックリスト（194）。詳細ページの各セクションが使う事実（脆弱性・メンテナ・姿勢）を
// キャッシュ済み関数で再取得（unstable_cache で dedup＝追加コストなし）して、判断材料を一覧化する。
// 採点・合否はしない：観点と事実を並べ、各項目から #anchor で詳細へ誘導するだけ。
export async function AdoptionChecklist({
  owner,
  repo,
  ecoVuln,
  pkgName,
  pkgVersion,
  statusLabel,
  license,
}: {
  owner: string;
  repo: string;
  ecoVuln: string | null;
  pkgName: string | null;
  pkgVersion: string | null;
  statusLabel: string;
  license: string;
}) {
  const t = await getTranslations("detail");
  const [vulns, maint, posture] = await Promise.all([
    ecoVuln && pkgName
      ? getSecurityVulnerabilities(ecoVuln, pkgName)
      : Promise.resolve([]),
    getMaintainership(owner, repo),
    getRepoPosture(owner, repo),
  ]);
  const affected = pkgVersion
    ? vulns.filter((a) => isAffected(pkgVersion, a.ranges))
    : vulns;
  const unpatched = affected.filter((a) => !a.patched).length;
  const concKey = maint
    ? maint.top1Share >= 80
      ? "concSolo"
      : maint.top3Share >= 80
        ? "concFew"
        : "concSpread"
    : null;

  const items: Array<{ label: string; value: string; anchor?: string }> = [
    { label: t("checkStatus"), value: statusLabel },
    ...(ecoVuln && pkgName
      ? [
          {
            label: t("checkVuln"),
            value:
              unpatched > 0 ? t("checkVulnN", { n: unpatched }) : t("checkVulnNone"),
            anchor: "vuln",
          },
        ]
      : []),
    ...(concKey
      ? [{ label: t("checkMaintainer"), value: t(concKey), anchor: "maintainers" }]
      : []),
    ...(posture
      ? [
          {
            label: t("checkPosture"),
            value: posture.hasSecurityPolicy ? t("yes") : t("no"),
            anchor: "posture",
          },
        ]
      : []),
    { label: t("checkLicense"), value: license },
  ];

  return (
    <section aria-label={t("checklistTitle")} className="mb-4 mt-6">
      <h2 className="mb-2 text-base font-semibold">{t("checklistTitle")}</h2>
      <Card>
        <CardContent className="gap-0 px-0 py-0">
          <ul className="divide-y text-sm">
            {items.map((it) => (
              <li
                key={it.label}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                {/* 中立マーカー（合否ではない・観点を示すだけ） */}
                <span aria-hidden="true" className="text-muted-foreground">
                  ·
                </span>
                <span className="w-44 shrink-0 text-xs font-medium text-muted-foreground">
                  {it.label}
                </span>
                <span className="min-w-0 flex-1">{it.value}</span>
                {it.anchor ? (
                  <a
                    href={`#${it.anchor}`}
                    className="shrink-0 text-xs font-medium text-primary hover:underline"
                  >
                    {t("checkDetails")} ↓
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="px-4 py-2 text-xs text-muted-foreground">
            {t("checklistNote")}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
