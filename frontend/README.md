# Geniesta — frontend（Next.js アプリ）

このディレクトリは Geniesta の Next.js アプリ本体です。

**セットアップ・設計・テスト・`GITHUB_TOKEN` の設定方法などは、プロジェクトの README を参照してください：**

→ [`../README.md`](../README.md)

## 最短手順
```bash
bun install
cp .env.local.example .env.local   # GITHUB_TOKEN を設定（推奨。詳細は ../README.md）
bun dev                            # http://localhost:3000
```

- `GITHUB_TOKEN` あり：REST 5,000req/h ＋ GraphQL 機能（脆弱性・正確な Watcher）有効。
- なし（匿名）：基本7項目は REST で動作（60req/h）／GraphQL 機能は縮退（GitHub 仕様）。
