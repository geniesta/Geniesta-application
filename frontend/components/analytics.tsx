"use client";

import { useEffect } from "react";

// プロダクト分析（プライバシー配慮・件数のみ）。
//   view: マウント時に1回送る（detail_view / compare_open）
//   出典リンクのクリックは委譲で捕捉（テキストに「出典」/「Source」を含む a）＝per-link 改修不要・多言語対応。
export function sendEvent(name: string) {
  const body = JSON.stringify({ name });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon("/api/event", body);
    else
      void fetch("/api/event", {
        method: "POST",
        body,
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      });
  } catch {
    // best-effort
  }
}

export function AnalyticsTracker({ view }: { view?: string }) {
  useEffect(() => {
    if (view) sendEvent(view);

    // 出典リンク（「出典: …」/「Source: …」）クリックを North Star（出典クリック率）として計測。
    function onClick(e: MouseEvent) {
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a) return;
      const text = a.textContent ?? "";
      if (/出典|Source/.test(text)) sendEvent("source_click");
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [view]);

  return null;
}
