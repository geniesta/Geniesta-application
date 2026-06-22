import Link from "next/link";
import { useTranslations } from "next-intl";
import { SOURCES, COMING_SOON_SOURCES } from "@/lib/search-query";

// 検索対象の切り替え。各タブは別 URL（/?src=...）へ遷移するため、ARIA の「タブ」パターン
// （矢印キー移動＋単一タブストップ＋tabpanel 紐付け）ではなく、ナビゲーションのリンク群として
// 実装する。これがセマンティクス的に正しく（遷移先が URL）、Tab→Enter で操作でき、現在地は
// aria-current="page" で示す。リンクなので prefetch も効き、クライアント JS も不要（Server Component）。
function SourceLink({
  href,
  label,
  selected,
}: {
  href: string;
  label: string;
  selected: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`shrink-0 rounded-lg px-3 py-1 text-sm font-medium transition ${
        selected
          ? "bg-white text-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
          : "text-emerald-950/70 hover:bg-white/30 dark:text-emerald-50/80 dark:hover:bg-white/10"
      }`}
    >
      {label}
    </Link>
  );
}

// ロードマップのプレースホルダ。リンク/ボタンではない（href/onClick なし）＝
// 検索・遷移から到達不能。視覚的に減光した pill ＋「準備中」バッジで示す（Server Component）。
function ComingSoonTab({
  label,
  comingSoon,
}: {
  label: string;
  comingSoon: string;
}) {
  return (
    <span
      aria-disabled="true"
      className="flex shrink-0 cursor-default items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-medium text-emerald-950/45 dark:text-emerald-50/40"
    >
      {label}
      <span className="rounded-full bg-white/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-950/55 dark:bg-white/10 dark:text-emerald-50/50">
        {comingSoon}
      </span>
    </span>
  );
}

export function SourceTabs({ src }: { src: string }) {
  const t = useTranslations("nav");
  const registries = SOURCES.filter(([value]) => value !== "github");
  // レジストリ切替時は検索語をリセットする（前のレジストリの検索語は引き継がない）。
  const hrefFor = (s: string) => (s !== "github" ? `/?src=${s}` : "/");

  return (
    <nav
      aria-label={t("tablistLabel")}
      // モバイルは折り返さず 1 行・横スクロール（多数のレジストリが多段に膨らんでヒーローが画面を
      // 占有するのを防ぐ）。スクロールバーは隠す。
      className="mt-3 flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-xl bg-white/30 p-1 dark:bg-white/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* 目的地：GitHub の信頼ファクトを直接探す */}
      <SourceLink
        href={hrefFor("github")}
        label={t("github")}
        selected={src === "github"}
      />

      {/* 区切り（GitHub と各レジストリの視覚的グルーピング） */}
      <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-emerald-950/20 dark:bg-white/20" />

      {registries.map(([value, label]) => (
        <SourceLink
          key={value}
          href={hrefFor(value)}
          label={label}
          selected={src === value}
        />
      ))}

      {/* ロードマップ（準備中）。機能するレジストリの後に、非インタラクティブで提示。 */}
      {COMING_SOON_SOURCES.map(([value, label]) => (
        <ComingSoonTab key={value} label={label} comingSoon={t("comingSoon")} />
      ))}
    </nav>
  );
}
