import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { health, type HealthReport } from "@/lib/server/observability";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// 健全性ダッシュボード（117）。/api/health の集計を同一プロセスのメモリから直接読み、
// どの外部データ源が今“縮退中”か（ブレーカ・失敗率・残枠）を可視化する。
// graceful degradation 前提なので、源が落ちても本体は応答（status=degraded で示す）。
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  return {
    title: en ? "Status — data sources" : "稼働状況 — データ源",
    description: en
      ? "Live health of the external data sources behind Geniesta (circuit breaker, error rate, rate-limit headroom)."
      : "Geniesta が使う外部データ源のリアルタイム健全性（サーキットブレーカ・失敗率・レート残枠）。",
    robots: { index: false }, // 運用情報のため検索対象外
  };
}

type Copy = {
  back: string;
  title: string;
  intro: string;
  overall: string;
  ok: string;
  degraded: string;
  uptime: string;
  empty: string;
  thSource: string;
  thState: string;
  thBreaker: string;
  thError: string;
  thHeadroom: string;
  thReset: string;
  thFresh: string;
  thP95: string;
  reset: (s: number) => string;
  ago: (s: number) => string;
  na: string;
  note: string;
  metricsLink: string;
};

const COPY: Record<"ja" | "en", Copy> = {
  ja: {
    back: "← 検索に戻る",
    title: "稼働状況（データ源）",
    intro:
      "Geniesta が使う外部データ源のリアルタイム健全性です。源が落ちても採点はせず、取得できる事実だけを出す設計（graceful degradation）。これはその縮退の見える化です。",
    overall: "全体",
    ok: "正常",
    degraded: "一部縮退",
    uptime: "稼働",
    empty: "まだ計測データがありません（検索や詳細を開くと源が呼ばれて反映されます）。",
    thSource: "データ源",
    thState: "状態",
    thBreaker: "ブレーカ",
    thError: "失敗率",
    thHeadroom: "残枠",
    thReset: "リセット",
    thFresh: "最終成功",
    thP95: "p95",
    reset: (s) => `${s}秒後`,
    ago: (s) => (s < 60 ? `${s}秒前` : s < 3600 ? `${Math.floor(s / 60)}分前` : `${Math.floor(s / 3600)}時間前`),
    na: "—",
    note: "※ ブレーカ open=連続失敗で一時遮断中 / half-open=試行中。残枠はヘッダを返す源（GitHub）のみ。詳細は方法論・信頼性メモを参照。",
    metricsLink: "メトリクス JSON (/api/metrics)",
  },
  en: {
    back: "← Back to search",
    title: "Status (data sources)",
    intro:
      "Live health of the external data sources behind Geniesta. If a source is down we still don't score — we show whatever facts we can (graceful degradation). This page makes that degradation visible.",
    overall: "Overall",
    ok: "Operational",
    degraded: "Partially degraded",
    uptime: "Uptime",
    empty: "No telemetry yet (run a search or open a detail page to exercise the sources).",
    thSource: "Source",
    thState: "State",
    thBreaker: "Breaker",
    thError: "Error rate",
    thHeadroom: "Headroom",
    thReset: "Reset",
    thFresh: "Last OK",
    thP95: "p95",
    reset: (s) => `in ${s}s`,
    ago: (s) => (s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : `${Math.floor(s / 3600)}h ago`),
    na: "—",
    note: "※ Breaker open = temporarily tripped after repeated failures; half-open = trial. Headroom only for sources that return rate headers (GitHub). See methodology / reliability notes.",
    metricsLink: "Metrics JSON (/api/metrics)",
  },
};

function fmtUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
}

export default async function StatusPage() {
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const c = COPY[locale];
  const report: HealthReport = health();
  const allOk = report.status === "ok";

  return (
    <main id="main" className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-6 py-8 lg:px-10">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        {c.back}
      </Link>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">{c.title}</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">{c.intro}</p>

      {/* 全体ステータス */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-3 w-3 rounded-full ${
                allOk ? "bg-emerald-500" : "bg-amber-500"
              }`}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold">{c.overall}:</span>
            <Badge
              className={
                allOk
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
              }
            >
              {allOk ? c.ok : c.degraded}
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground">
            {c.uptime}: {fmtUptime(report.uptimeSec)}
          </span>
        </CardContent>
      </Card>

      {/* 源ごとの健全性テーブル */}
      <Card>
        <CardContent className="overflow-x-auto py-2">
          {report.sources.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{c.empty}</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">{c.thSource}</th>
                  <th scope="col" className="py-2 pr-4 font-medium">{c.thState}</th>
                  <th scope="col" className="py-2 pr-4 font-medium">{c.thBreaker}</th>
                  <th scope="col" className="py-2 pr-4 font-medium">{c.thError}</th>
                  <th scope="col" className="py-2 pr-4 font-medium">{c.thHeadroom}</th>
                  <th scope="col" className="py-2 pr-4 font-medium">{c.thReset}</th>
                  <th scope="col" className="py-2 pr-4 font-medium">{c.thFresh}</th>
                  <th scope="col" className="py-2 font-medium">{c.thP95}</th>
                </tr>
              </thead>
              <tbody>
                {report.sources.map((s) => {
                  const ok = s.state === "ok";
                  return (
                    <tr key={s.source} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{s.source}</td>
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              ok ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                            aria-hidden="true"
                          />
                          <span className={ok ? "" : "font-medium text-amber-700"}>
                            {ok ? c.ok : c.degraded}
                          </span>
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <code
                          className={`rounded px-1.5 py-0.5 text-xs ${
                            s.breaker === "open"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                              : s.breaker === "half-open"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {s.breaker}
                        </code>
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {Math.round(s.errorRate * 100)}%
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {s.headroom != null
                          ? `${Math.round(s.headroom * 100)}%`
                          : c.na}
                      </td>
                      <td className="py-2 pr-4 tabular-nums text-muted-foreground">
                        {s.resetInSec != null ? c.reset(s.resetInSec) : c.na}
                      </td>
                      <td className="py-2 pr-4 tabular-nums text-muted-foreground">
                        {s.lastOkAgeSec != null ? c.ago(s.lastOkAgeSec) : c.na}
                      </td>
                      <td className="py-2 tabular-nums text-muted-foreground">
                        {s.p95}ms
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 max-w-2xl text-xs text-muted-foreground">{c.note}</p>
      <p className="mt-2 text-xs">
        <a href="/api/metrics" className="font-medium text-primary">
          {c.metricsLink} ↗
        </a>
      </p>
    </main>
  );
}
