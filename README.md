# Geniesta

GitHub の OSS ライブラリを、**star でなく「信頼に関わる公開事実」**で選ぶ開発者向けツール。
判定・採点はせず、**生存性・脆弱性・姿勢・メンテナ**の事実＋出典を、依存を選ぶその瞬間に集約して提示する。

---

## 最低要件（すべて満たす）

- [x] キーワード入力 → GitHub `search/repositories` で検索 → 結果一覧
- [x] 結果選択 → 詳細を**独立ページ**で表示（モーダル不可）：名前 / オーナーアイコン / 言語 / Star / **Watcher** / Fork / Issue
- [x] テストコード（unit / component / E2E / 契約 / ミューテーション）
- [x] プロダクション志向（サーバー側データ取得・token 秘匿・ISR キャッシュ・CI・可観測性）
- [x] 本 README に「工夫した点」＋「AI 利用方法のレポート」

> Watcher は star のエイリアスである `watchers_count` ではなく、正確な **`subscribers_count`** を採用。

## 起動

```bash
cd frontend
bun install
cp .env.local.example .env.local   # ← GITHUB_TOKEN を設定（下記）
bun dev      # http://localhost:3000
bun run build
bun run test      # unit + component + a11y
bun run test:e2e  # E2E は Playwright で別実行（一部は GITHUB_TOKEN で全網羅）
```

### 環境変数（`frontend/.env.local`）

`GITHUB_TOKEN` の設定を**推奨**します。`frontend/.env.local`（Next が読む場所・gitignore 済み）に置きます：

```bash
# frontend/.env.local
cp .env.local.example .env.local 
GITHUB_TOKEN=ghp_xxxxxxxx   # GitHub の Personal Access Token（public 読み取りでよい・特別な scope 不要）
```

| トークン | 挙動 |
| --- | --- |
| **あり（推奨）** | REST 5,000req/h ＋ **GraphQL 機能が有効**（正確な Watcher のバッチ取得・**脆弱性ダッシュボード**） |
| **なし（匿名）** | 検索・詳細の基本7項目は **REST で動作**（60req/h）。ただし **GitHub GraphQL は匿名 401 のため、脆弱性等の GraphQL 機能は縮退**（graceful degradation で壊れはしない） |

- トークン作成：GitHub → Settings → Developer settings → Personal access tokens。**public リポジトリの公開情報のみ**を読むので、fine-grained なら追加権限なし（Public read）、classic でも特別な scope は不要。
- **サーバー側専用**（`lib/server/*`）。クライアントには露出しません（`NEXT_PUBLIC_` を付けないこと）。
- e2e の一部（404・比較削除）は `GITHUB_TOKEN=... bun run test:e2e` のときのみ実行（匿名時は自動 skip）。

## 設計と工夫した点

- **クリーンアーキの層分離（依存は内向き）**：`lib/types`（ドメイン型）→ `lib/*`（ドメイン純関数 trust/version/licenses…）→ `lib/use-cases`（評価のオーケストレーション）→ `lib/server`（インフラ）。`lib/server/**` は全ファイルに `import "server-only"` ＝クライアントが誤 import したら**ビルドで失敗**（境界をコンパイラが強制）。
- **「判定しない」を設計の核に**：総合スコア・verdict を出さない（普遍的に正しい固定 rubric は存在しないという誠実さ）。状態→根拠→脆弱性の固定順、断罪語の排除、実害時のみ先頭で警告。
- **スコープを"削る"判断**：当初の Go BFF＋DB/Redis を「現要件に過剰」と撤去し Next.js 単体へ。外部データ源も**約20→4ベンダー**（GitHub・OSV・npm・crates）に圧縮（deps.dev/EPSS/ClickHouse/DLランキングは保守性・信頼性が価値に見合わず撤去）。足し算でなく**意図して削る判断**を設計に含めた。
- **アクセシビリティ**：セマンティック HTML・スキップリンク・キーボード完遂・可視フォーカス・`aria-live`・正確な数値の `sr-only` 併記。**WCAG 2 AA（コントラスト比 4.5:1 を含む）を、jest-axe（コンポーネント）＋実ページの axe スキャン（e2e：ホーム/詳細）で検証**。CI で jsx-a11y も強制。実機スクリーンリーダーでも確認。
  - 検証で実際に **状態チップの白文字 × 緑背景が AA 未達（emerald-600 ≒ 3.65:1）**だったのを検出し、`emerald-700`/`slate-600`/`red-700`/`amber-700` へ修正（テストが a11y 回帰を捕捉する設計の実例）。
- **セキュリティ**：token はサーバー側のみ（クライアント非露出）、`.env.local` は gitignore。

## 技術スタック

- **フロント**：Next.js v16（App Router・RSC）/ React 19 / TypeScript(strict) / Tailwind v4 / shadcn/ui
- **データ取得**：サーバー側（Server Component / Route Handler）。GitHub REST+GraphQL / OSV / レジストリ。ISR（`unstable_cache`/revalidate）＋サーキットブレーカ・single-flight・graceful degradation。
- **アーキ**：Next.js 単体（別建て BFF/DB なし）。推奨デプロイ先は Vercel、任意で Docker standalone。
- **i18n / テーマ**：next-intl（ja/en・cookie ベース）/ system・time・light・dark。

## テスト戦略

**形（ピラミッド/トロフィー）でなく、実行境界とバグの所在で配分する。**

| 層 | 対象 |
|----|------|
| unit | ドメイン純関数の境界・異常系 ＋ デクレーション検知 |
| component | 状態を持つ画面の確認(Storybookでのビジネスロジックを切り離したテストに移行することも検討) |
| E2E | 非同期Server Componentは単体・結合テストに乗らないため （検索→詳細・比較・キーボード動作確認/スクリーンリーダー動作確認） |
| ミューテーション | Stryker をドメイン純関数に限定し、境界ロジックの信頼度の調査のため　カバレッジ率のためではない |

## 信頼性・運用

- **graceful degradation**：源が落ちても本体は応答し、取れる事実だけ出す（`/api/health` は degraded でも 200）。
- **可観測性**：`/api/health`（源ごとの state/breaker/errorRate/headroom/p95）、`/api/metrics`（p50・p95・残枠・North Star＝出典クリック率）、`/status` ページでライブ可視化。
- 詳細な SLI/SLO は [`doc/要件定義書.md`](doc/要件定義書.md) と `lib/server/observability.ts` を参照。

## AI 利用方法のレポート

本課題は **Claude Code** を相棒に進めました。

- **設計の壁打ちとスコープ判断**：「この機能いる？」「Go BFF は過剰では？」「この外部依存は保守に見合う？」に忖度なしの利点・欠点を出させ、**Go BFF 撤去・外部源 20→4 への圧縮**を判断。足し算でなく削る判断を言語化。
- **実装**：学習データと異なる Next.js 16 の破壊的変更（`params`/`searchParams` の Promise 化等）に対応しつつ、検索→詳細・信頼ファクト・比較・テスト一式を生成・修正。
- **検証は鵜呑みにしない**：型・Lint・テスト・実描画を毎回確認。a11y は静的検査で見えない `<main role="status">` のランドマーク上書きバグを**実機スクリーンリーダーで発見・修正**。

### AI 運用の設計 ── 助言と強制を分ける

「守らせたいこと」を**指示でなく仕組みで強制**するのが要点。長いセッション・プロンプトインジェクションでは指示は破られうるため、硬いルールは決定的な仕組みに落とす。

| 区分 | 担保 |
|------|------|
| **助言（soft policy）** | `CLAUDE.md` / `AGENTS.md`（Next 最新ドキュメントを読む・Server 既定 等の方針） |
| **強制（deterministic）** | `import "server-only"`（コンパイラ強制）／ CI（型→Lint→カバレッジ→build→E2E）／ 契約テスト／ ミューテーション |
| **手順（procedural）** | セルフレビュー観点（useEffect でのデータ取得・use client 過剰・依存方向・同語反復テスト） |
| **隔離（実行環境）** | AI は Docker サンドボックスで実行。`~/.ssh`・`~/.gitconfig` を非マウント＝鍵に到達不能、gh CLI なし・`GITHUB_TOKEN` は git の push に使われない＝**push の資格情報が原理的に存在しない**。egress も deny-all＋許可制。 |

AI は思考の加速と実装代行に使い、**スコープ（何を作らないか）と事実の扱い方**の判断は人間が保持する。

### 正直な限界・自己評価（盛らない）

到達点だけでなく、至らない点も隠さず記す。

- **AI 依存度**：実装の多くは Claude Code で加速した。設計判断・スコープ・レビュー観点は自分が保持したが、**全行を一から手書きしたわけではない**。AI が出した誤り（稼働中の `.next` キャッシュ破損、進捗の過大申告など）は、型 / テスト / 実描画の確認と自己監査で検知・修正した。
- **バックエンド / インフラ**：本課題は要求（GitHub 検索 → 詳細）に絞り、API は Next.js の Route Handler で実装。**Go / PostgreSQL / AWS は本リポジトリでは扱っていない**（当初置いた Go BFF は今回の要件には過剰と判断し撤去）。今後公開データの取得に及び検討段階。
- **スコープを削った**：初期に広げた機能（多レジストリ・脆弱性深掘り等）は、外部API依存とその保守が困難なため**意図的に圧縮**した（足すより削る判断）。
- **テストの境界**：unit / component / contract / e2e を用意。async な Server Component は Next 公式方針に沿って行なっている。
App Router の実行境界を読み取ることから始まり、境界ロジックのユニットテストはデグレーションが起きないように実施
画面の動きはコンポーネント単位で実施
非同期のサーバーコンポーネントはE2Eに逃がし実施することで業務クリティカルを中心に実施

- **signals ≠ 保証**：提示するのは公開事実まで。コードの正しさや未公開の脆弱性は検出できない。

判断の理由はいずれも口頭で説明できる。未達は今後の課題として認識している。

---

詳細な要件・受け入れ基準は [`doc/要件定義書.md`](doc/要件定義書.md)。
