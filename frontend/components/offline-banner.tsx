"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

// J124 オフライン通知。ネットワーク断時に上部へ控えめなバナーを出す（復帰で自動的に消える）。
export function OfflineBanner() {
  const t = useTranslations("states");
  // 初期は「オンライン」と仮定（SSR と一致）。マウント後に実状態へ同期する。
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900 dark:bg-amber-900/60 dark:text-amber-100"
    >
      {t("offline")}
    </div>
  );
}
