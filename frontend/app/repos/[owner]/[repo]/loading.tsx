// 詳細ページ遷移中のローディングUI（App Router の loading.tsx）。
// これが無いと、遷移時にサーバが getRepoDetail（必須7項目の GitHub API）を await し終えるまで
// 画面が切り替わらない。loading.tsx を置くと遷移と同時に即スケルトンを出し、本体はストリーミングで
// 流し込めるため、体感の遷移を 1 秒未満に保てる（データ取得時間と切り離す）。
// サーバーコンポーネント。詳細レイアウト（max-w-3xl・56px アバター＋見出し・ファクトカード群）に寄せる。

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  const t = useTranslations("states");
  return (
    <main
      id="main"
      className="mx-auto max-w-3xl px-6 py-10"
      aria-busy="true"
    >
      {/* 読み込み中の通知は sr-only の live region に置く。<main> に role="status" を付けると
          main ランドマークが status に上書きされ、スクリーンリーダーが「本文」へ移動できなくなるため。 */}
      <span role="status" className="sr-only">
        {t("loading")}
      </span>
      {/* 戻るリンク相当 */}
      <Skeleton className="mb-4 h-4 w-24" />
      {/* パンくず相当 */}
      <Skeleton className="mb-3 h-3 w-40" />

      {/* 見出し（アバター 56px ＋ タイトル ＋ 言語/リンク） */}
      <header className="mb-6 flex items-center gap-4">
        <Skeleton className="size-14 rounded-xl" />
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="ml-auto flex shrink-0 gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </header>

      {/* 必須7項目の統計バー相当 */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 py-3">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 信頼ファクト（5軸）のカード群相当 */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 py-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
