// 検索結果の各状態（ローディング / 結果なし / エラー）。shadcn/ui の Card・Skeleton を使用。
// next-intl の useTranslations はサーバーコンポーネントでも同期で使える。

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { aliasSuggestion, fuzzySuggestion } from "@/lib/search-query";
import { RetryButton } from "@/components/retry-button";

export function ResultsSkeleton() {
  const t = useTranslations("states");
  return (
    <div
      className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]"
      role="status"
      aria-busy="true"
      aria-label={t("loading")}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-16" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function NoResults({ q, src }: { q: string; src?: string }) {
  const t = useTranslations("states");
  // C22/C27 別名（接尾辞除去）を優先し、無ければ fuzzy（タイプミス補正）を「もしかして」候補に。
  const alias = aliasSuggestion(q) ?? fuzzySuggestion(q);
  const aliasHref = alias
    ? `/?q=${encodeURIComponent(alias)}${src ? `&src=${encodeURIComponent(src)}` : ""}`
    : null;
  const githubHref = `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories`;
  return (
    <Card role="status">
      <CardContent className="text-center text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">
          {t("noResultsTitle", { q })}
        </p>
        <p className="text-sm">{t("noResultsHint")}</p>
        {/* C27 ゼロ件救済：別名での再検索（C22）と GitHub 直検索への誘導 */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
          {aliasHref ? (
            <a href={aliasHref} className="font-medium text-primary hover:underline">
              {t("tryAlias", { alias: alias! })}
            </a>
          ) : null}
          <a
            href={githubHref}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {t("githubDirect")} ↗
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  const t = useTranslations("states");
  return (
    <Card
      role="alert"
      className="bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-900"
    >
      <CardContent>
        <p className="mb-1 font-semibold">{t("errorTitle")}</p>
        <p className="text-sm">{message}</p>
        {/* J127 次の行動を示す（一時的な失敗は再読み込みで回復することが多い）。 */}
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">{t("errorHint")}</p>
        {/* J125 再試行（再読み込み）導線。 */}
        <RetryButton label={t("retry")} />
      </CardContent>
    </Card>
  );
}
