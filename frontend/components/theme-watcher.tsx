"use client";

import { useEffect } from "react";
import { getTheme, applyTheme } from "@/lib/stores/theme-store";

// 時刻連動（time）モードで夜間帯の境界（18:00 / 06:00）をまたいでも、開いたまま切り替わるよう
// 毎分＋復帰時に再適用する。system モードの OS 変更にも追従（保険）。表示は持たない。
export function ThemeWatcher() {
  useEffect(() => {
    const reapply = () => applyTheme(getTheme());
    reapply(); // マウント時に現在設定へ同期
    const id = window.setInterval(reapply, 60_000);
    document.addEventListener("visibilitychange", reapply);
    window.addEventListener("focus", reapply);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", reapply);
      window.removeEventListener("focus", reapply);
    };
  }, []);
  return null;
}
