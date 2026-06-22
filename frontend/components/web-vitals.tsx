"use client";

import { useReportWebVitals } from "next/web-vitals";

// Core Web Vitals（LCP/INP/CLS/FCP/TTFB）を /api/vitals へ送る（実ユーザー計測）。
// sendBeacon があればページ離脱時も確実に送信。失敗は握りつぶす（体感に影響させない）。
export function WebVitals() {
  useReportWebVitals((metric) => {
    const body = JSON.stringify({ name: metric.name, value: metric.value });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/vitals", body);
      } else {
        void fetch("/api/vitals", {
          method: "POST",
          body,
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch {
      // best-effort
    }
  });
  return null;
}
