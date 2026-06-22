"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { SOURCES, COMING_SOON_SOURCES } from "@/lib/search-query";
import { BrandIcon } from "@/components/ecosystem-icons";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

// O169/170・A1/A8/A14 モバイルナビ。サイドバーは lg 未満で消えるため、小画面では
// この上部バー＋ドロワー（native <details>＝キーボード/SR で開閉可）でレジストリ切替・
// 主要導線（方法論/稼働状況/依存チェック）・言語切替を提供する。
export function MobileNav() {
  const t = useTranslations("nav");
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (ref.current) ref.current.open = false;
  };

  // native <details> は「外側タップ」「Escape」で閉じない。SR/キーボードの利点は保ちつつ、
  // ドロワーらしく：メニュー外タップと Escape で閉じる（言語/テーマ操作では閉じない）。
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const d = ref.current;
      if (d?.open && e.target instanceof Node && !d.contains(e.target)) {
        d.open = false;
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) ref.current.open = false;
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="relative z-40 border-b bg-background/95 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2 px-4 py-2">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <ShieldIcon />
          </span>
          <b className="text-sm font-semibold">Geniesta</b>
        </Link>
        <details ref={ref} className="group ml-auto">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <MenuIcon />
            {t("menu")}
          </summary>
          <nav
            aria-label={t("ecosystemNav")}
            className="absolute inset-x-0 top-full z-50 max-h-[75vh] overflow-y-auto border-b bg-background p-4 shadow-lg"
          >
            <p className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("application")}
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-1">
              {SOURCES.map(([value, label]) => (
                <li key={value}>
                  <Link
                    href={value === "github" ? "/" : `/?src=${value}`}
                    onClick={close}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    <BrandIcon source={value} size={16} />
                    {label}
                  </Link>
                </li>
              ))}

              {/* ロードマップ（準備中）。<span>＝リンク/ボタンではない＝検索/遷移から到達不能。 */}
              {COMING_SOON_SOURCES.map(([value, label]) => (
                <li key={value}>
                  <span
                    aria-disabled="true"
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground/55"
                  >
                    <BrandIcon source={value} size={16} />
                    {label}
                    <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("comingSoon")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-col gap-1.5 border-t pt-3 text-sm">
              <Link href="/methodology" onClick={close} className="font-medium text-primary">
                {t("methodology")}
              </Link>
              <Link href="/status" onClick={close} className="font-medium text-primary">
                {t("status")}
              </Link>
              <Link href="/check" onClick={close} className="font-medium text-primary">
                {t("check")}
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
