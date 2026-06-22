import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  totalPages,
  base,
}: {
  page: number;
  totalPages: number;
  base: string;
}) {
  const t = useTranslations("search");
  if (totalPages <= 1) return null;
  const href = (n: number) => `/?${base}${base ? "&" : ""}page=${n}`;
  return (
    <nav
      aria-label={t("pagination")}
      className="mt-8 flex items-center justify-center gap-3 text-sm"
    >
      {page > 1 ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page - 1)}>{t("prev")}</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          {t("prev")}
        </Button>
      )}
      <span className="text-muted-foreground" aria-current="page">
        {t("pageOf", { page, total: totalPages })}
      </span>
      {page < totalPages ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page + 1)}>{t("next")}</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          {t("next")}
        </Button>
      )}
    </nav>
  );
}
