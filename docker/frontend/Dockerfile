# syntax=docker/dockerfile:1
#
# ContribRadar frontend — マルチステージ本番イメージ。
# - 依存解決/ビルドは bun（高速）。
# - 実行は node:22-alpine（OS 脆弱性が少ない）。runtime 不要の npm は削除して攻撃面を縮小。
# - 非 root 実行。

# ---- 1) 依存解決 ----------------------------------------------------------
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- 2) ビルド ------------------------------------------------------------
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# standalone 出力を有効化（Docker セルフホスト用）
ENV DOCKER_BUILD=1
RUN bun run build

# ---- 3) 実行（node:22-alpine。runtime に不要な npm を削除＝picomatch 等を排除） ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# 実行時に使わない npm/npx を削除（同梱 npm 由来の脆弱性を排除）＋非 root ユーザー作成
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
 && addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs
# standalone 出力 + 静的アセット + public を最小コピー
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
