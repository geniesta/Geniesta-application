import { NextResponse } from "next/server";
import { snapshot } from "@/lib/server/observability";

// 運用メトリクス（外部データ源ごとの呼び出し/失敗/レート制限/p50・p95、GitHub 残枠）。
// 秘密情報は含まない（集計値のみ）。METRICS_TOKEN を設定した場合のみ Bearer 認証を要求する。
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = process.env.METRICS_TOKEN;
  if (token) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${token}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  return NextResponse.json(snapshot(), {
    headers: { "Cache-Control": "no-store" },
  });
}
