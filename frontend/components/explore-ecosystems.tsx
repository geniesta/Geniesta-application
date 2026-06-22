import Link from "next/link";
import { useTranslations } from "next-intl";
import { SOURCES } from "@/lib/search-query";
import { BRAND_ICONS, BrandIcon } from "@/components/ecosystem-icons";

// Snyk security.snyk.io 風の「エコシステムから探す」グリッド。
// security.snyk.io はカテゴリ見出し＋アイコン付きピルチップの羅列で探索口を提示する。
// 本プロダクトのソースはすべて「名前から GitHub の信頼ファクトを引く入口」なので、
//   1) GitHub（土台）  2) パッケージレジストリ
// の 2 グループに分け、各レジストリへ `/?src=<value>` で遷移させる。
type Source = (typeof SOURCES)[number];

const GITHUB: Source = SOURCES.find(([v]) => v === "github")!;
const REGISTRIES = SOURCES.filter(([v]) => v !== "github");

function Chip({ value, label }: { value: string; label: string }) {
  const href = value === "github" ? "/" : `/?src=${value}`;
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-foreground/25 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {BRAND_ICONS[value] ? <BrandIcon source={value} /> : null}
      {label}
    </Link>
  );
}

function Group({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2.5">{children}</div>
    </div>
  );
}

export function ExploreEcosystems() {
  const t = useTranslations("explore");
  return (
    <section aria-label={t("title")}>
      <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
      <p className="mt-1 mb-6 max-w-2xl text-sm text-muted-foreground">
        {t("lead")}
      </p>

      <div className="space-y-8">
        <Group title={t("githubGroup")}>
          <Chip value={GITHUB[0]} label={GITHUB[1]} />
        </Group>

        <Group title={t("registryGroup")}>
          {REGISTRIES.map(([value, label]) => (
            <Chip key={value} value={value} label={label} />
          ))}
        </Group>
      </div>
    </section>
  );
}
