import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { num } from "@/lib/facts";
import type { RegistryPackage } from "@/lib/server/registries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// パッケージカード。GitHub リポジトリが判明していれば信頼ファクト詳細へ、
// 判明しなければレジストリページへ（外部リンク）。
export async function PackageCard({ pkg }: { pkg: RegistryPackage }) {
  const t = await getTranslations("card");
  const hasRepo = !!pkg.repo;
  const href = hasRepo
    ? `/repos/${pkg.repo!.owner}/${pkg.repo!.repo}`
    : pkg.url;
  const dlLabel = t(DL_LABEL_KEYS[pkg.registry] ?? "dlGeneric");

  return (
    <Link
      href={href}
      target={hasRepo ? undefined : "_blank"}
      rel={hasRepo ? undefined : "noreferrer"}
      aria-label={
        hasRepo
          ? t("pkgToFacts", { name: pkg.name })
          : t("pkgOpenIn", { name: pkg.name, reg: pkg.registry })
      }
      className="group block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Card className="h-full gap-3 transition group-hover:shadow-md group-hover:ring-foreground/20">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <PkgAvatar
              pkg={pkg}
              alt={
                pkg.repo ? t("ownerIconAlt", { owner: pkg.repo.owner }) : ""
              }
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold leading-tight">
                {pkg.name}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {pkg.registry}
                {pkg.repo ? ` · ${pkg.repo.owner}` : ""}
              </div>
            </div>
            {pkg.version ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                v{pkg.version}
              </span>
            ) : null}
          </div>

          {pkg.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {pkg.description}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">
              {dlLabel} {pkg.downloads != null ? num(pkg.downloads) : "—"}
            </Badge>
            {!hasRepo ? <Badge variant="outline">{t("pkgNoRepo")}</Badge> : null}
          </div>

          <div className="flex items-center text-sm text-muted-foreground">
            <span className="ml-auto font-semibold text-primary transition group-hover:translate-x-0.5">
              {hasRepo ? t("pkgViewFacts") : t("pkgOpenRegistry")}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// リポジトリが分かればオーナーアイコン、分からなければレジストリの色付きバッジ。
function PkgAvatar({ pkg, alt }: { pkg: RegistryPackage; alt: string }) {
  if (pkg.repo) {
    return (
      <Image
        src={`https://github.com/${pkg.repo.owner}.png?size=80`}
        alt={alt}
        width={40}
        height={40}
        unoptimized
        className="rounded-lg"
      />
    );
  }
  const b = REG_BADGE[pkg.registry] ?? { cls: "bg-slate-600", label: "pkg" };
  return (
    <span
      className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white ${b.cls}`}
      aria-hidden="true"
    >
      {b.label}
    </span>
  );
}

// レジストリ → DL の窓ラベルの i18n キー（週間/最近/総/汎用）。
const DL_LABEL_KEYS: Record<string, string> = {
  npm: "dlWeekly",
  crates: "dlRecent",
  hex: "dlRecent",
  composer: "dlTotal",
  rubygems: "dlTotal",
  nuget: "dlTotal",
  pub: "dlGeneric",
  maven: "dlGeneric",
  pypi: "dlGeneric",
  go: "dlGeneric",
};

const REG_BADGE: Record<string, { cls: string; label: string }> = {
  npm: { cls: "bg-red-600", label: "npm" },
  crates: { cls: "bg-amber-600", label: "rs" },
  composer: { cls: "bg-indigo-600", label: "php" },
  rubygems: { cls: "bg-rose-600", label: "rb" },
  hex: { cls: "bg-purple-600", label: "hex" },
  nuget: { cls: "bg-sky-600", label: "nu" },
  pub: { cls: "bg-cyan-600", label: "dart" },
  maven: { cls: "bg-orange-700", label: "mvn" },
  pypi: { cls: "bg-blue-700", label: "py" },
  go: { cls: "bg-cyan-700", label: "go" },
};
