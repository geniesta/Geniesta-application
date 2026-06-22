#!/usr/bin/env bash
# サンドボックス内で最初に一度走らせる初期化。
# アプリの依存をコンテナ専用の node_modules（匿名ボリューム）に入れる。
# ※ ホストの node_modules とは分離されるため、ホスト環境を汚さない。
set -euo pipefail

# workspace ルート（geniesta-application）をマウントしているので、Next アプリの frontend へ。
cd /work/frontend

echo "==> bun install (frozen)"
if ! bun install --frozen-lockfile; then
  echo "   lockfile 不一致のため通常 install にフォールバック"
  bun install
fi

echo "==> typecheck / lint / test（スモーク）"
bun run typecheck
bun run lint
bun run test

echo ""
echo "==> 準備完了。"
echo "    開発サーバ:  bun dev --hostname 0.0.0.0   → http://localhost:3000"
echo "    Claude:      claude"
