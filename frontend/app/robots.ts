import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// クローラ向け。検索結果（?q= 等）の無限バリアントは除外し、sitemap を案内。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // クエリ付きの検索/比較は重く無限に増えるためクロール対象から外す。
      disallow: ["/?", "/compare?"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
