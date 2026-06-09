# ContribRadar — プロジェクト指示書（エージェント向けオリエンテーション）

> このファイルはプロジェクト直下のメモリ。Docker Sandbox(sbx) 等の新しい Claude Code
> セッションが、文脈ゼロからでも即座に作業を継続できるようにするための要約。
> 詳細な決定事項は `.kiro/steering/`、要件は `.kiro/specs/github-repo-search/` を読むこと。

## プロダクト
**ContribRadar** — OSS への貢献機会を見つける GitHub リポジトリ検索アプリ。
キーワード検索 → 一覧 → 詳細**ページ**（モーダル不可。名前/オーナーアイコン/言語/Star/Watcher/Fork/Issue 数）を表示し、
さらに **「まだ PR が着手されていない open issue（貢献の空き地）」** を「貢献容易度スコア」で序列化して提示する。
（選考課題の最低要件を満たしつつ差別化する設計。背景は `doc/mission.md`）

## 構成（モノレポ）
```
frontend/   Next.js v16 (App Router, bun, Tailwind v4)  ※本番=Vercel。素のスキャフォルド（BFF 未接続）
backend/    Go 1.26 BFF（ヘキサゴナル + gqlgen + ent）   ※本番=EC2。実装済・build/vet/test 検証済
infra/      Terraform (AWS EC2 + docker compose ほか)   ※未実装（spec のみ）
docker-compose.yml         base（postgres/redis/bff/nginx。全環境共通。project=geniesta）
docker-compose.local.yml   ローカル overlay（ポート公開 + frontend dev/HMR）
docker-compose.prod.yml    本番(EC2) overlay（nginx TLS + restart。frontend は無し=Vercel）
docker/nginx/              dev=default.conf / 本番=templates/default.conf.template
.kiro/      spec 駆動開発（specs/ requirements・steering/ tech・structure）
```

## 起動・検証

> compose は base + overlay の2枚重ね。overlay が base を include 済みなので `-f` は1枚でよい。

### ローカル全スタック（Docker）
```bash
GITHUB_TOKEN=xxx docker compose -f docker-compose.local.yml up -d --build
# frontend(dev/HMR): http://localhost:3000   ← 普段の開発
# nginx(本番相当):   http://localhost:8000   （/graphql 等のルーティング確認）
# BFF Playground:    http://localhost:8080
```

### フロントだけ bun dev（バックエンドは Docker）
```bash
GITHUB_TOKEN=xxx docker compose -f docker-compose.local.yml up -d postgres redis bff
cp frontend/.env.local.example frontend/.env.local  # 初回のみ
cd frontend && bun install && bun dev               # http://localhost:3000
# /graphql は next.config.ts の rewrite で BFF_URL に転送される
```

### 本番（frontend=Vercel / backend=EC2）
- frontend: Vercel にデプロイ（Docker 不使用）。env で `BFF_URL=https://<API_DOMAIN>` を設定。
- backend: EC2 で `docker compose -f docker-compose.prod.yml up -d`
  （nginx が 80/443=Let's Encrypt で TLS 終端 → bff。手順は `docker-compose.prod.yml` 冒頭コメント）。

### 個別ビルド・テスト
```bash
cd backend && go build -mod=vendor ./... && go vet -mod=vendor ./... && go test -mod=vendor ./...
cd frontend && bun install && bun run build
```

## 確定している技術決定（変更時は steering を更新）
- フロント: App Router / RSC + Streaming / **URL 駆動状態** / Tailwind v4（`@theme` トークン）
- BFF: **net/http + gqlgen（GraphQL）+ ent（ORM）**、Redis(go-redis)、slog 構造化ログ
  - API: `POST /graphql`（gqlgen）、`GET /healthz`、`GET /readyz`
  - DB アクセス: **ent**（User/Favorite/SearchHistory/RepoScoreCache スキーマ。起動時 auto-migrate）
  - GitHub データ: **GitHub GraphQL API**（issue↔PR 突合）＋ REST フォールバック
- 依存方向: **adapter → usecase → domain**（domain は技術非依存）
- DB: **PostgreSQL**（永続化）+ **Redis**（ホットキャッシュ）併用
- 認証: ハイブリッド（未ログイン=サーバートークン / GitHub OAuth でパーソナライズ）
- インフラ: **frontend=Vercel / backend=AWS EC2 で docker compose**（Terraform で IaC）。コスト最優先で **DB/Redis もコンテナ**（RDS/ElastiCache 不使用。将来は `POSTGRES_HOST`/`REDIS_HOST` 差し替えで移行可）。**nginx + Let's Encrypt で TLS 終端**、公開は **80/443 のみ**、管理は **SSM**（SSH ポート非公開）。本番 compose は `docker-compose.prod.yml`
  - フロント↔BFF: クライアントは相対 `/graphql` を叩き、Next.js の rewrite が `BFF_URL` へ転送（local=bff:8080 / Vercel=https://API_DOMAIN）。BFF 側に CORS(`ALLOWED_ORIGIN`) も実装済み

## コーディング規約・思想
- アクセシビリティ必須（キーボード完遂・ARIA・`sr-only` で正確値併記・reduced-motion・可視フォーカス）。
- 貢献機会の判定は**ヒューリスティック**。UI/レスポンスで必ずその旨を開示する（誠実性）。
- 正確な Watcher 数は GitHub の `subscribers_count`（`watchers_count` は star のエイリアス）。
- テスト: 純粋関数で境界を固定、コンポーネントはアクセシブルロールでアサート、issue↔PR 突合とスコアを最重要ケースに。

## ドキュメント言語
プロジェクトに書く Markdown（requirements/design/README 等）は**日本語**で記述する。

## 次にやると良いこと（優先度順）
1. frontend を BFF GraphQL（`/graphql`）に配線し、検索→一覧→詳細→貢献機会を縦に1本通す。
2. GitHub OAuth 認証実装（ctx に userID を注入する middleware）。
3. `infra/` に Terraform（EC2 backend〔DB/Redis 含む全コンテナ + nginx TLS + SSM・80/443 のみ〕、frontend は Vercel）。
4. README に工夫点・AI 利用レポート・競合分析（OSS Insight/OpenSauced との差別化）。
