// 404 ページ（notFound() 到達時・未定義ルート時）。サーバーコンポーネント。
// レイアウト内に描画されるため、サイドバー付きのアプリシェルを保ったまま 404 を表示する。

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 lg:px-10">
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 bg-clip-text text-5xl font-bold text-transparent">
          404
        </p>
        <h1 className="mt-3 text-lg font-semibold">{t("notFoundTitle")}</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {t("notFoundBody")}
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
