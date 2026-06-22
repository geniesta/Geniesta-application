"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, setLocaleCookie } from "@/i18n/config";

// cookie でロケールを切り替え、RSC を再取得して反映（i18n ルーティング無し版）。
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("lang");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function set(next: string) {
    if (next === locale) return;
    setLocaleCookie(next);
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md border p-0.5 text-xs"
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === locale}
          disabled={pending}
          onClick={() => set(l)}
          className={`whitespace-nowrap rounded px-2 py-0.5 transition ${
            l === locale
              ? "bg-primary/10 font-semibold text-primary"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {t(l)}
        </button>
      ))}
    </div>
  );
}
