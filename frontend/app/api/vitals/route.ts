import { NextResponse } from "next/server";
import { recordVital } from "@/lib/server/observability";

// クライアントの useReportWebVitals からの Core Web Vitals を受け取り集計に反映する。
// sendBeacon でも届くよう POST のみ・本文は { name, value }。秘密情報は扱わない。
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: string; value?: number };
    if (body.name && ALLOWED.has(body.name) && typeof body.value === "number") {
      recordVital(body.name, body.value);
    }
  } catch {
    // 不正なボディは無視（計測の失敗を本処理に影響させない）。
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
