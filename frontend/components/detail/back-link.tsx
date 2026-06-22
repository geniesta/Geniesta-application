import Link from "next/link";
import { useTranslations } from "next-intl";

export function BackLink() {
  const t = useTranslations("detail");
  return (
    <Link
      href="/"
      className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      {t("back")}
    </Link>
  );
}
