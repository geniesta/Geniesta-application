"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  type Theme,
  setTheme,
  getThemeSnapshot,
  getThemeServerSnapshot,
  subscribeTheme,
} from "@/lib/stores/theme-store";

// テーマ切替（システム / ライト / ダーク）。OS 自動を既定にしつつ手動上書きできる。
export function ThemeToggle() {
  const t = useTranslations("theme");
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );
  const opts: Array<{ value: Theme; icon: React.ReactNode }> = [
    { value: "system", icon: <SystemIcon /> },
    { value: "time", icon: <ClockIcon /> },
    { value: "light", icon: <SunIcon /> },
    { value: "dark", icon: <MoonIcon /> },
  ];
  return (
    <div
      role="group"
      aria-label={t("label")}
      className="inline-flex rounded-md border p-0.5"
    >
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={theme === o.value}
          aria-label={t(o.value)}
          title={t(o.value)}
          onClick={() => setTheme(o.value)}
          className={`flex size-7 items-center justify-center rounded transition ${
            theme === o.value
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}

const sv = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function SystemIcon() {
  return (
    <svg {...sv}>
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg {...sv}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg {...sv}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg {...sv}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
