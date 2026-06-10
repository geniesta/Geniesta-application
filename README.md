OSS への貢献機会を見つける GitHub リポジトリ検索アプリ。

- **frontend**: Next.js v16（App Router / bun）。本番は Vercel。
- **backend (bff)**: Go（現状は最小の hello world。本格実装は `backup/full-bff` ブランチに退避）。
- **nginx / postgres / redis**: ローカル開発用に Docker で起動。

詳しい設計は `CLAUDE.md` と `.kiro/steering/` を参照。

## 前提

- Docker Desktop（`docker compose` が使えること）
- このディレクトリ（`geniesta-application/`）で実行すること

compose は **base + overlay の2枚重ね**。`docker-compose.local.yml` が base（`docker-compose.yml`）を
`include` しているので、起動・停止とも **`-f docker-compose.local.yml` の1枚指定だけ**でOK。

> ⚠️ `-f` を付けない素の `docker compose up` / `down` は使わないこと。
> base のみが対象になり、nginx が起動失敗したり frontend が消し残し（orphan）になります。

## Docker で起動

```bash
docker compose -f docker-compose.local.yml up -d --build
```

起動後のアクセス先:

| URL | 内容 |
| --- | --- |
| http://localhost:3000 | frontend（dev / ホットリロード）← 普段の開発 |
| http://localhost:8000 | nginx 経由（`/graphql` 等のルーティング確認） |
| http://localhost:8080 | bff（現状 hello world） |

## Docker を停止

```bash
docker compose -f docker-compose.local.yml down
```

（コンテナとネットワークを削除。frontend も含めて綺麗に落ちます）

## 補助コマンド

```bash
# 状態確認
docker compose -f docker-compose.local.yml ps

# ログ追尾（サービス名を指定）
docker compose -f docker-compose.local.yml logs -f bff

# 再ビルドだけ
docker compose -f docker-compose.local.yml build
```

## PostgreSQL / Redis も起動したいとき

DB/Redis は `profile: db` でゲートしてあり、既定では起動しません（現状 backend は未使用）。
使う場合は `--profile db` を付けます。

```bash
# DB/Redis 込みで起動
docker compose -f docker-compose.local.yml --profile db up -d --build

# DB/Redis 込みで停止
docker compose -f docker-compose.local.yml --profile db down
```

接続情報（ローカル DB クライアント用）:

| 項目 | 値 |
| --- | --- |
| Host | localhost |
| Port | 5432（postgres）/ 6379（redis） |
| User / Password / DB | geniesta / geniesta / geniesta |
| SSL | disable |

## フロントだけ手元で動かす（任意）

バックエンドは Docker、フロントは `bun dev` で動かす構成も可能です。

```bash
docker compose -f docker-compose.local.yml up -d bff
cp frontend/.env.local.example frontend/.env.local   # 初回のみ
cd frontend && bun install && bun dev                # http://localhost:3000
# /graphql は next.config.ts の rewrite で BFF_URL に転送
```

## 本番（参考）

frontend は Vercel、backend は EC2 上で docker compose（nginx + Let's Encrypt で TLS 終端）。
手順は `docker-compose.prod.yml` 冒頭のコメントを参照。

```bash
API_DOMAIN=api.example.com docker compose -f docker-compose.prod.yml up -d --build
```
