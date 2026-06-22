import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { POPULAR_BY_SOURCE } from "@/lib/showcase";

// 「ライブラリから探す（例）」。採点・人気ランキングではなく、調べ始めの起点として
// 代表的なライブラリ（いずれも npm パッケージ）をカテゴリ別に例示する。各チップは GitHub
// オーナーのアバター＋名前で、クリックで検索へ（既存の「例で試す」を name＋icon に拡張）。
// source 指定時はそのレジストリ内検索（/?q=…&src=…）に飛ばす。
// アバターは github.com/<owner>.png（オーナー組織のロゴ）。遅延読込なのでリダイレクトコスト許容。
export function PopularLibraries({ source }: { source: string }) {
  const t = useTranslations("home");
  const groups = POPULAR_BY_SOURCE[source] ?? [];
  const hrefFor = (query: string) =>
    `/?q=${encodeURIComponent(query)}` + (source !== "github" ? `&src=${source}` : "");
  return (
    <section aria-label={t("popularTitle")}>
      <h2 className="mb-1 text-lg font-semibold">{t("popularTitle")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{t("popularNote")}</p>

      <div className="space-y-5">
        {groups.map(([cat, libs]) => (
          <div key={cat}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t(`libCat.${cat}`)}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {libs.map(([label, query, owner]) => (
                <li key={label}>
                  <Link
                    href={hrefFor(query)}
                    className="inline-flex items-center gap-2 rounded-full border bg-background py-1 pl-1.5 pr-3 text-sm font-medium text-foreground transition hover:border-foreground/25 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Image
                      src={`https://github.com/${owner}.png?size=40`}
                      alt=""
                      aria-hidden="true"
                      width={20}
                      height={20}
                      unoptimized
                      className="rounded-full ring-1 ring-border dark:bg-white"
                    />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
