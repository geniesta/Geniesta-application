import {
  getSecurityVulnerabilities,
  type Severity,
} from "@/lib/server/github";
import { daysAgo } from "@/lib/facts";
import { isAffected, earliestFixed, upgradeKind } from "@/lib/version";
import { getOsvCrossCheck } from "@/lib/server/osv";
import { flags } from "@/lib/flags";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ④ 脆弱性ダッシュボード（公開アドバイザリ＝GHSA）。
// 採点はしない：深刻度・CVSS・修正版の有無という「事実」を出典つきで集約表示する（C-3/C-4）。
export async function VulnDashboard({
  ecosystem,
  pkg,
  version,
  sevFilter,
}: {
  ecosystem: string;
  pkg: string;
  version: string | null;
  sevFilter?: string;
}) {
  const all = await getSecurityVulnerabilities(ecosystem, pkg);
  const t = await getTranslations("detail");

  // バージョン指定があれば「そのバージョンが該当するか」で絞る。無ければ全件。
  const affected = version
    ? all.filter((a) => isAffected(version, a.ranges))
    : all;
  const list = version ? affected : all;

  const sevCount: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MODERATE: 0,
    LOW: 0,
  };
  for (const a of list) sevCount[a.severity]++;
  const unpatched = list.filter((a) => !a.patched).length;

  // E41 修正の速さ（代理）：未修正（修正版が未提供）のアドバイザリが公開からどれだけ滞留しているか。
  const openDays = list
    .filter((a) => !a.patched && a.publishedAt)
    .map((a) => Math.max(0, daysAgo(a.publishedAt)))
    .sort((x, y) => x - y);
  const openMedianDays = median(openDays);

  // E50 重大度フィルタ：?sev=critical|high|moderate|low（不正値は無視）。
  const SEV_ORDER: Severity[] = ["CRITICAL", "HIGH", "MODERATE", "LOW"];
  const activeSev = SEV_ORDER.find(
    (s) => s.toLowerCase() === (sevFilter ?? "").toLowerCase(),
  );
  const shown = activeSev
    ? list.filter((a) => a.severity === activeSev)
    : list;
  // フィルタのトグル URL（eco/pkg/ver を保持・同じ重大度を再クリックで解除）。
  const sevHref = (sev?: Severity) => {
    const q = new URLSearchParams();
    if (ecosystem) q.set("eco", ecosystem);
    q.set("pkg", pkg);
    if (version) q.set("ver", version);
    if (sev) q.set("sev", sev.toLowerCase());
    const s = q.toString();
    return s ? `?${s}` : "?";
  };

  const advisoryDbUrl = `https://github.com/advisories?query=${encodeURIComponent(`ecosystem:${ecosystem.toLowerCase()} ${pkg}`)}`;
  // OSV クロスチェック（単一ソース依存の冗長化）。EXT 機能はフィーチャーフラグで段階公開。
  const osv = flags.osvCrossCheck
    ? await getOsvCrossCheck(ecosystem, pkg)
    : null;
  // OSV が持つ GHSA のうち、こちらの GHSA 一覧に無いもの（GHSA 照会が取りこぼした可能性）。
  const ourGhsa = new Set(all.map((a) => a.ghsaId));
  const osvOnly = osv ? osv.ghsaIds.filter((id) => !ourGhsa.has(id)).length : 0;

  return (
    <section aria-label={t("vulnTitle")} className="mb-4 mt-6">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">{t("vulnTitle")}</h2>
        <span className="text-xs text-muted-foreground">
          {ecosystem.toLowerCase()} / {pkg}
          {version ? ` @ ${version}` : ""}
        </span>
      </div>

      <Card>
        <CardContent className="space-y-4">
          {all.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("vulnNone")}</p>
          ) : version && affected.length === 0 ? (
            <p className="text-sm">
              <b className="text-emerald-700">
                {t("vulnVersionNone", { version })}
              </b>
              {t("vulnVersionNoneRest", { all: all.length })}
            </p>
          ) : (
            <>
              {/* サマリー：深刻度内訳（クリックで重大度フィルタ）＋ 修正版の有無 */}
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={t("sevFilterLabel")}
              >
                <SevTile
                  label={t("sevCritical")}
                  n={sevCount.CRITICAL}
                  sev="CRITICAL"
                  href={sevHref(activeSev === "CRITICAL" ? undefined : "CRITICAL")}
                  active={activeSev === "CRITICAL"}
                />
                <SevTile
                  label={t("sevHigh")}
                  n={sevCount.HIGH}
                  sev="HIGH"
                  href={sevHref(activeSev === "HIGH" ? undefined : "HIGH")}
                  active={activeSev === "HIGH"}
                />
                <SevTile
                  label={t("sevModerate")}
                  n={sevCount.MODERATE}
                  sev="MODERATE"
                  href={sevHref(activeSev === "MODERATE" ? undefined : "MODERATE")}
                  active={activeSev === "MODERATE"}
                />
                <SevTile
                  label={t("sevLow")}
                  n={sevCount.LOW}
                  sev="LOW"
                  href={sevHref(activeSev === "LOW" ? undefined : "LOW")}
                  active={activeSev === "LOW"}
                />
                <span className="ml-auto self-center text-xs text-muted-foreground">
                  {version
                    ? t("vulnSummaryVersion", {
                        version,
                        list: list.length,
                        all: all.length,
                      })
                    : t("vulnSummaryAll", { all: all.length })}
                  {unpatched > 0
                    ? t("vulnUnpatched", { n: unpatched })
                    : t("vulnAllPatched")}
                </span>
              </div>

              {/* 修正の速さ（代理）：未修正（修正版が未提供）の公開からの滞留（中央値） */}
              {openMedianDays != null ? (
                <p className="text-xs text-muted-foreground">
                  {t("fixSpeedNote", { n: openDays.length, days: openMedianDays })}
                </p>
              ) : null}

              {/* アクティブなフィルタの解除リンク */}
              {activeSev ? (
                <p className="text-xs">
                  <a href={sevHref()} className="font-medium text-primary">
                    {t("sevClear", { label: t(sevKey(activeSev)) })}
                  </a>
                </p>
              ) : null}

              {/* 個別アドバイザリ（深刻度順・上位・フィルタ適用後） */}
              <ul className="divide-y text-sm">
                {shown.length === 0 ? (
                  <li className="py-2 text-muted-foreground">
                    {t("sevEmpty")}
                  </li>
                ) : null}
                {shown.slice(0, 8).map((a) => {
                  // E47 アップグレード難易度の目安：利用中バージョンから最短の修正版へ、
                  // メジャー跨ぎ（破壊的変更の可能性）かマイナー/パッチで済むかを中立に添える。
                  const fixed = version ? earliestFixed(a.ranges) : null;
                  const upg = fixed ? upgradeKind(version!, fixed) : null;
                  return (
                  <li key={a.ghsaId} className="flex items-center gap-3 py-2">
                    <Badge className={`gap-1.5 ${sevChip(a.severity)}`}>
                      <SevDots sev={a.severity} />
                      {t(sevKey(a.severity))}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate" title={a.summary}>
                      {a.summary}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {a.cvss != null ? `CVSS ${a.cvss}` : "CVSS —"}{" "}
                      · {a.patched ? t("patched") : t("unpatched")}
                      {upg
                        ? ` · ${t(upg === "major" ? "upgradeMajor" : "upgradeMinor", { v: fixed! })}`
                        : ""}
                    </span>
                    <a
                      href={a.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-xs font-medium text-primary"
                    >
                      {a.cve ?? a.ghsaId} ↗
                    </a>
                  </li>
                  );
                })}
              </ul>
            </>
          )}

          {osv ? (
            <p className="text-xs text-muted-foreground">
              {osvOnly > 0
                ? t("osvDiff", { osv: osv.ghsaIds.length, only: osvOnly })
                : t("osvMatch", { osv: osv.ghsaIds.length })}{" "}
              <a
                href={`https://osv.dev/list?q=${encodeURIComponent(pkg)}&ecosystem=${encodeURIComponent(ecosystem)}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary"
              >
                {t("sourceWith", { label: "OSV.dev" })} ↗
              </a>
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
            <span>{t("vulnDisclaimer")}</span>
            <a
              href={advisoryDbUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 font-medium text-primary"
            >
              {t("sourceWith", { label: t("srcAdvisory") })} ↗
            </a>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

// 昇順ソート済み配列の中央値（空なら null）。
function median(sorted: number[]): number | null {
  return sorted.length > 0 ? sorted[Math.floor((sorted.length - 1) / 2)] : null;
}

function SevTile({
  label,
  n,
  sev,
  href,
  active,
}: {
  label: string;
  n: number;
  sev: Severity;
  href: string;
  active: boolean;
}) {
  const cls = `flex min-w-[78px] flex-col rounded-lg border px-3 py-1.5 transition ${
    n > 0 ? sevBox(sev) : "border-border text-muted-foreground"
  } ${active ? "ring-2 ring-primary ring-offset-1" : ""}`;
  // 0 件は絞り込んでも意味がないので非リンク（ボタンとして無効化）。
  if (n === 0) {
    return (
      <div className={cls} aria-disabled="true">
        <span className="text-lg font-bold leading-none">{n}</span>
        <span className="flex items-center gap-1 text-xs">
          <SevDots sev={sev} />
          {label}
        </span>
      </div>
    );
  }
  return (
    <a
      href={href}
      aria-current={active ? "true" : undefined}
      aria-label={`${label} ${n}`}
      className={`${cls} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
    >
      <span className="text-lg font-bold leading-none">{n}</span>
      <span className="flex items-center gap-1 text-xs">
        <SevDots sev={sev} />
        {label}
      </span>
    </a>
  );
}

// ストリーミング中のローディング骨組み。`label` を渡すと SR に「{軸}を読み込み中…」を通知する
// （role=status＝暗黙の aria-live=polite）。これで「重い事実が後から無音で湧く」問題を解消する。
export function VulnSkeleton({ label }: { label?: string }) {
  return (
    <section
      className="mb-4 mt-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {label ? <span className="sr-only">{label}</span> : null}
      <div className="mb-2 h-4 w-40 animate-pulse rounded bg-muted" aria-hidden="true" />
      <div className="h-28 animate-pulse rounded-xl bg-muted" aria-hidden="true" />
    </section>
  );
}

// 深刻度ラベルの i18n キー（detail 名前空間）。
const SEV_KEY: Record<Severity, string> = {
  CRITICAL: "sevCritical",
  HIGH: "sevHigh",
  MODERATE: "sevModerate",
  LOW: "sevLow",
};
function sevKey(s: Severity): string {
  return SEV_KEY[s];
}
// 深刻度は事実。色は付けるが過度に煽らない（Critical/High のみ強め）。
function sevChip(s: Severity): string {
  switch (s) {
    case "CRITICAL":
      return "bg-red-700 text-white";
    case "HIGH":
      return "bg-amber-700 text-white";
    case "MODERATE":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-200";
  }
}
function sevBox(s: Severity): string {
  switch (s) {
    case "CRITICAL":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
    case "HIGH":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
    case "MODERATE":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300";
  }
}
// J96 色のみに依存しない深刻度表現：深刻度を「塗りつぶしドットの数（4..1）」でも示す。
// HIGH と MODERATE は色（琥珀）が同じなので、形＝ドット数で区別できるようにする。
// ラベル文字（CRITICAL/HIGH…）が SR への一次情報なので、ドットは aria-hidden の装飾。
const SEV_RANK: Record<Severity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MODERATE: 2,
  LOW: 1,
};
function SevDots({ sev }: { sev: Severity }) {
  const filled = SEV_RANK[sev];
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-px align-middle">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`size-1.5 rounded-full ${i < filled ? "bg-current" : "bg-current/25"}`}
        />
      ))}
    </span>
  );
}
