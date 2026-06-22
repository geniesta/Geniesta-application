import { NextResponse } from "next/server";
import { health } from "@/lib/server/observability";

// ヘルス/レディネス（116/117）。どの外部データ源が今“縮退中”か（サーキットブレーカ状態・失敗率）を返す。
// graceful degradation 前提のため、源が落ちていても本体は 200 を返し status=degraded で示す
// （= 監視は status フィールドで判定。アプリ自体の死活は HTTP 200 が返るかで判定できる）。
// 秘密情報は含まない（集計値のみ）。
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(health(), {
    headers: { "Cache-Control": "no-store" },
  });
}
