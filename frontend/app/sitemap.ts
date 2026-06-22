import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { SOURCES } from "@/lib/search-query";

// 静的ルート＋各レジストリのランディング（/?src=...）。詳細ページは無限なので含めない
// （個別 repo は generateMetadata で個別最適化＋被リンクで発見される想定）。
export default function sitemap(): MetadataRoute.Sitemap {
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/methodology`, changeFrequency: "monthly", priority: 0.5 },
  ];
  const registries: MetadataRoute.Sitemap = SOURCES.filter(
    ([v]) => v !== "github",
  ).map(([value]) => ({
    url: `${SITE_URL}/?src=${value}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  return [...base, ...registries];
}
