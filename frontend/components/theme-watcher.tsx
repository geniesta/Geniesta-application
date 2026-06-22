"use client";

import { useEffect } from "react";
import { getTheme, applyTheme } from "@/lib/stores/theme-store";

// 時刻連動（time・既定）モードで夜間帯の境界（18:00 / 06:00）をまたいでも、開いたまま
// 切り替わるよう毎分＋復帰時（visibilitychange / focus）に再適用する。表示は持たない。
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
