"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { SOURCES, COMING_SOON_SOURCES } from "@/lib/search-query";
import { BrandIcon } from "@/components/ecosystem-icons";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

// 各エコシステムの代表言語（「名前 | 言語」表記用）。
const ECOSYSTEM_LANGS: Record<string, string> = {
  github: "OSS 全般",
  npm: "JavaScript",
  crates: "Rust",
  composer: "PHP",
  rubygems: "Ruby",
  hex: "Elixir / Erlang",
  nuget: "C# / F# / VB",
  pub: "Dart, Flutter",
  maven: "Java, Kotlin",
  pypi: "Python",
  go: "Go",
  cocoapods: "Objective-C, Swift",
  swift: "Swift",
  conan: "C / C++",
};

// 表示順は SOURCES の宣言順（GitHub → npm → Cargo → … → Conan）。
// GitHub は「直接」、以降は「名前から探す」入口として区切る。
const REGISTRIES = SOURCES.filter(([value]) => value !== "github");

// アプリシェルの左サイドバー（全ページ共通）。
// 「APPLICATION」配下に各エコシステムをラジオ式で並べ、選ぶとそのレジストリへ遷移する。
export function AppSidebar() {
  const t = useTranslations("nav");
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-muted/30 p-4 lg:flex">
      <Link href="/" className="flex items-center gap-2.5 px-1.5 py-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
          <ShieldIcon />
        </span>
        <span className="leading-tight">
          <b className="block text-sm font-semibold">Geniesta</b>
          <span className="text-xs text-muted-foreground">{t("tagline")}</span>
        </span>
      </Link>

      {/* useSearchParams は Suspense 境界が必要（静的ルートのビルド対策）。
          フォールバックは未選択にし、誤ハイライトの一瞬を避ける（ハイドレーションで確定）。 */}
      <Suspense fallback={<EcosystemList current={null} />}>
        <EcosystemNav />
      </Suspense>

      <div className="mt-auto border-t pt-3 text-xs leading-relaxed text-muted-foreground">
        <p>
          {t("disclaimer1")}
          <br />
          {t("disclaimer2")}
        </p>
        <Link
          href="/methodology"
          className="mt-1.5 block py-1 font-medium text-primary hover:underline"
        >
          {t("methodology")}
          <span aria-hidden="true" className="ml-1">→</span>
        </Link>
        <Link
          href="/status"
          className="mt-1 block py-1 font-medium text-primary hover:underline"
        >
          {t("status")}
          <span aria-hidden="true" className="ml-1">→</span>
        </Link>
        <Link
          href="/check"
          className="mt-1 block py-1 font-medium text-primary hover:underline"
        >
          {t("check")}
          <span aria-hidden="true" className="ml-1">→</span>
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

function EcosystemNav() {
  const pathname = usePathname();
  const sp = useSearchParams();
  // ホームでのみ選択を反映（src 既定は github）。詳細ページ等では非選択。
  const current = pathname === "/" ? (sp.get("src") ?? "github") : null;
  return <EcosystemList current={current} />;
}

function EcosystemList({ current }: { current: string | null }) {
  const t = useTranslations("nav");
  return (
    <nav aria-label={t("ecosystemNav")}>
      <details open className="group">
        <summary className="flex cursor-pointer select-none items-center gap-1.5 px-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <ChevronIcon />
          {t("application")}
        </summary>
        <ul className="mt-2 flex flex-col gap-0.5">
          {/* GitHub は信頼ファクトの土台＝直接探す入口 */}
          <Item value="github" label={t("github")} current={current} />

          {/* 区切り（GitHub と各レジストリ。説明ラベルはカードで自明なので出さない） */}
          <li aria-hidden="true" className="mx-2 my-1.5 border-t" />

          {REGISTRIES.map(([value, label]) => (
            <Item
              key={value}
              value={value}
              label={label}
              lang={ECOSYSTEM_LANGS[value]}
              current={current}
            />
          ))}

          {/* ロードマップ（準備中）。リンクではない非インタラクティブ項目＝検索/遷移から到達不能。 */}
          {COMING_SOON_SOURCES.map(([value, label]) => (
            <ComingSoonItem
              key={value}
              value={value}
              label={label}
              lang={ECOSYSTEM_LANGS[value]}
              comingSoon={t("comingSoon")}
            />
          ))}
        </ul>
      </details>
    </nav>
  );
}

// 準備中（ロードマップ）。<span> で描画し href/onClick を持たない＝操作不能。
// 視覚的に減光し、小さなバッジで「準備中」を示す。
function ComingSoonItem({
  value,
  label,
  lang,
  comingSoon,
}: {
  value: string;
  label: string;
  lang?: string;
  comingSoon: string;
}) {
  return (
    <li>
      <span
        aria-disabled="true"
        className="flex items-center gap-2 rounded-md border-l-2 border-transparent px-2 py-1.5 text-sm text-muted-foreground/55"
      >
        <BrandIcon source={value} size={16} />
        <span className="min-w-0 truncate">
          {label}
          {lang ? <span className="text-xs"> · {lang}</span> : null}
        </span>
        <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {comingSoon}
        </span>
      </span>
    </li>
  );
}

function Item({
  value,
  label,
  lang,
  current,
}: {
  value: string;
  label: string;
  lang?: string;
  current: string | null;
}) {
  const selected = current === value;
  const href = value === "github" ? "/" : `/?src=${value}`;
  // A4 ラジオ体裁（フォームに見える）をやめ、ナビらしい左アクセント＋背景で選択を示す。
  return (
    <li>
      <Link
        href={href}
        aria-current={selected ? "page" : undefined}
        className={`flex items-center gap-2 rounded-md border-l-2 px-2 py-1.5 text-sm transition ${
          selected
            ? "border-primary bg-primary/10 font-medium text-foreground"
            : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <BrandIcon source={value} size={16} />
        <span className="min-w-0 truncate">
          {label}
          {/* UX5 言語接尾は補助情報＝小さく薄くして名称の可読性を優先 */}
          {lang ? <span className="text-xs text-muted-foreground"> · {lang}</span> : null}
        </span>
      </Link>
    </li>
  );
}


function ChevronIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="transition group-open:rotate-180"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="20"
      height="20"
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
