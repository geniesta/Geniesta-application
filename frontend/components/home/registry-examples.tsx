import Link from "next/link";
import { useTranslations } from "next-intl";
import { SOURCE_LABELS } from "@/lib/search-query";
import { type RegistrySource } from "@/components/home/shared";

// 各レジストリの空タブで出す「検索例」。製品テーゼ（star/DL で並べない）に従い、
// 空クエリでは人気一覧を出さず、検索を促す例示チップで誘導する（UI 補助・信頼データではない）。
const REGISTRY_EXAMPLES: Record<string, string[]> = {
  npm: ["react", "express", "zod", "axios"],
  crates: ["serde", "tokio", "clap", "rand"],
  rubygems: ["rails", "devise", "sidekiq", "rspec"],
  composer: [
    "laravel/framework",
    "symfony/console",
    "guzzlehttp/guzzle",
    "monolog/monolog",
  ],
  hex: ["phoenix", "ecto", "plug", "absinthe"],
  nuget: ["Newtonsoft.Json", "Serilog", "AutoMapper", "Polly"],
  pub: ["provider", "dio", "riverpod", "go_router"],
};

// 空タブの誘導 UI（人気/DL 順の一覧は出さない方針）。
// 「このレジストリの名前 → GitHub の信頼ファクトへ」という価値を示し、
// 見られる事実を提示しつつ、検索例チップで実検索へ誘導する。
export function RegistryExamples({ source }: { source: RegistrySource }) {
  const t = useTranslations("registry");
  const examples = REGISTRY_EXAMPLES[source] ?? [];
  const label = SOURCE_LABELS[source];
  return (
    <section aria-label={t("exampleRegion", { label })} className="max-w-2xl space-y-4">
      {/* 見出しの説明文（「{label} の名前から GitHub の事実へ」）はカードを見れば自明なので出さない。
          検索の起点となる例示チップだけを残す（5軸の説明はヒーロー/方法論に集約）。 */}
      {examples.length ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("tryExamples")}</span>
          {examples.map((ex) => (
            <Link
              key={ex}
              href={`/?q=${encodeURIComponent(ex)}&src=${source}`}
              className="rounded-full border bg-muted px-3 py-1 font-medium hover:bg-muted/70"
            >
              {ex}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
