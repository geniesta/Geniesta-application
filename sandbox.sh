#!/usr/bin/env bash
# Geniesta 開発サンドボックス（ホスト側ラッパー）。
#
# 使い方:
#   ./sandbox.sh build           # イメージをビルド
#   ./sandbox.sh init            # コンテナ内で依存インストール＋スモーク検証
#   ./sandbox.sh claude [args]   # サンドボックス内で Claude Code を起動（sbx run claude 相当）
#   ./sandbox.sh dev             # 開発サーバ（http://localhost:3000）
#   ./sandbox.sh shell           # 対話シェル
#   ./sandbox.sh run <cmd...>    # 任意コマンドをコンテナ内で実行
#
# 安全方針（push されない理由）:
#   - git 認証情報（~/.ssh, ~/.gitconfig）を一切マウントしない。gh CLI も入れない。
#     → リモートへの push に必要な資格情報が無く、原理的に push できない。
#   - GITHUB_TOKEN は「アプリの GitHub API 用（サーバー側）」であり、git push には使われない
#     （git は GITHUB_TOKEN を自動では参照しない）。
#   - 完全オフラインで動かしたいときは NETWORK=none（下記）。ただし Claude API/外部データ源は不通になる。
#
# 環境変数:
#   ANTHROPIC_API_KEY  Claude Code 用（未設定なら claude 側のログインに従う）
#   GITHUB_TOKEN       アプリの GitHub API レート緩和（任意）
#   NETWORK            docker network 指定（既定: bridge。none で完全遮断）
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE="geniesta-sbx"
NAME="geniesta-sbx"
NETWORK="${NETWORK:-bridge}"

run() {
  docker run --rm -it \
    --name "$NAME" \
    --network "$NETWORK" \
    -v "$ROOT":/work \
    -v geniesta_sbx_node_modules:/work/frontend/node_modules \
    -w /work \
    -p 3000:3000 \
    -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}" \
    -e GITHUB_TOKEN="${GITHUB_TOKEN:-}" \
    "$IMAGE" "$@"
}

cmd="${1:-shell}"
case "$cmd" in
  build)
    docker build -f "$ROOT/Dockerfile.sandbox" -t "$IMAGE" "$ROOT"
    ;;
  init)
    run bash sandbox-init-app.sh
    ;;
  claude)
    shift
    run claude "$@"
    ;;
  dev)
    run bash -lc "cd frontend && bun dev --hostname 0.0.0.0"
    ;;
  shell)
    run bash
    ;;
  run)
    shift
    run "$@"
    ;;
  *)
    echo "unknown command: $cmd" >&2
    echo "use: build | init | claude | dev | shell | run <cmd...>" >&2
    exit 2
    ;;
esac
