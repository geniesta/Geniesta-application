import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// i18n リクエスト設定（cookie でロケール決定）を next-intl に登録。
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Docker セルフホスト用の standalone 出力。
  // Vercel は独自のビルド最適化を行うため不要（設定しないこと）。
  // Dockerfile で DOCKER_BUILD=1 をセットした場合のみ有効になる。
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,

  // GitHub のオーナーアイコンを next/image で最適化するため許可。
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // パッケージのオーナーアイコン（github.com/{owner}.png → avatars に 302）。
      { protocol: "https", hostname: "github.com" },
    ],
  },

  // 124 セキュリティヘッダ。inline スクリプト（密度の no-flash 等）・Next ランタイムを壊さない範囲で堅牢化。
  // strict-CSP（script-src nonce）は別途 middleware で導入する余地を残し、ここでは安全な集合を全ルートに付与。
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // default-src は付けず（inline を壊さない）、注入面のみ締める。
            key: "Content-Security-Policy",
            value:
              "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
