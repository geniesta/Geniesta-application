import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker セルフホスト用の standalone 出力。
  // Vercel は独自のビルド最適化を行うため不要（設定しないこと）。
  // Dockerfile で DOCKER_BUILD=1 をセットした場合のみ有効になる。
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,

  // /graphql を BFF にプロキシ。
  // - Docker 環境: nginx が先に捌くため rewrite は実質スルー
  // - ローカル dev (bun dev): この rewrite が BFF_URL に転送する
  async rewrites() {
    const bffUrl = process.env.BFF_URL ?? "http://localhost:8080";
    return [
      {
        source: "/graphql",
        destination: `${bffUrl}/graphql`,
      },
      {
        source: "/healthz",
        destination: `${bffUrl}/healthz`,
      },
    ];
  },
};

export default nextConfig;
