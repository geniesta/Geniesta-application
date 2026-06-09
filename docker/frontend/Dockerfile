# syntax=docker/dockerfile:1
#
# ContribRadar frontend — マルチステージ本番イメージ。
# - 依存解決/ビルドは bun（高速）。
# - 実行は Next.js standalone を node ランタイムで（枯れていて安定）。
# - 非 root 実行・最小ランタイムでサイズと攻撃面を縮小。

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

# ---- 3) 実行 --------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# 非 root ユーザー
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
# standalone 出力 + 静的アセット + public を最小コピー
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
# 簡易ヘルスチェック（将来 /api/health に差し替え予定）
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
