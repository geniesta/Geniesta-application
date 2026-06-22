import { NextResponse } from "next/server";
import { recordEvent } from "@/lib/server/observability";

// プロダクトイベント受信（detail_view / source_click / compare_open）。
// プライバシー配慮：件数のみ集計し、URL・ユーザー識別子・閲覧履歴は保存しない。
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: string };
    if (body.name) recordEvent(body.name);
  } catch {
    // 不正ボディは無視（計測の失敗を本処理に影響させない）。
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
