import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SbomChecker } from "@/components/sbom-checker";

// 依存一括チェック（196）。マニフェストを貼って各依存の信頼ファクトへ引く。
export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  return {
    title: en ? "Check your dependencies" : "依存をまとめて確認",
    description: en
      ? "Paste package.json / composer.json and jump to each dependency's trust facts."
      : "package.json / composer.json を貼り付けて、各依存の信頼ファクトへ。",
  };
}

export default async function CheckPage() {
  const t = await getTranslations("check");
  return (
    <main id="main" className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-6 py-8 lg:px-10">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        {t("back")}
      </Link>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">{t("lead")}</p>
      <SbomChecker />
    </main>
  );
}
