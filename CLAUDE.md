# Geniesta — プロジェクト指示書

新しいセッションが文脈ゼロから作業継続できる要約。詳細は [`README.md`](README.md)（製品概要・工夫点・
テスト戦略・AI 利用レポート）と [`doc/要件定義書.md`](doc/要件定義書.md)（要件・受け入れ基準）を参照。**実装が正、本書は要約。**

## プロダクト
GitHub の OSS ライブラリ/リポジトリを、**star でなく「信頼に関わる公開事実」**で選ぶ開発者向けツール。
**判定・採点はしない** ── 生存性・脆弱性・姿勢・メンテナの**事実＋出典**を、依存を選ぶその瞬間に集約して提示する。

## アーキテクチャ（Next.js 単体）
別建てバックエンド（Go BFF / DB / Redis）は持たない（現要件に過剰と判断し撤去）。データ取得は
すべて **Server Component / Route Handler（サーバー側）** で外部 API を直接叩く。`GITHUB_TOKEN` 等は
サーバー側のみで使い、クライアントに露出しない。

- **レイヤード構成 ＋ FW 非依存の純ドメイン核**（"クリーンアーキ"ではない＝ポート/DIP は未導入。下記補足）:
  - `lib/types.ts` … ドメイン型（Repo 等。framework/infra 非依存の最内層）
  - `lib/*`（直下）… ドメイン純関数（trust / facts / version / licenses / search-query / sbom / pkg-name / site / flags …）。**infra を一切 import しない**（依存の逆流なし＝ドメインのみ隔離してテスト可能）
  - `lib/use-cases/*` … アプリケーション層（評価のオーケストレーション。例 `evaluate-repo.ts`）。**具体インフラを直接 import する**（依存性逆転はしない＝RSC では過剰と判断）
  - `lib/server/**` … インフラ層（github / osv / registries / manifest / external / observability）。**各ファイル先頭に
    `import "server-only";`** ＝クライアントが誤 import したら**ビルドで失敗**（境界をコンパイラが強制）
  - `lib/stores/**` … クライアント状態（compare / recent / theme / watch。localStorage + `useSyncExternalStore`）
  - 配信層 = `app/**/page.tsx`・`app/api/**/route.ts`（use-case を呼ぶだけ。notFound/描画など HTTP/RSC の関心のみ）
- パッケージマネージャは **bun**（`bun.lock`。`package-lock.json` は置かない）。

## 信頼ファクト（4軸・中立）— 判定せず「事実＋出典」
| 軸 | 事実 | データ源 |
|----|------|------|
| 生存性 | 最終コミット/リリース・頻度・月次コミット推移 | GitHub REST/GraphQL |
| 脆弱性 | 未修正の有無 × 修正の速さ・CVSS | GitHub Advisory(GHSA) ＋ OSV |
| 姿勢 | SECURITY.md・行動規範等の有無・community health | GitHub community profile |
| メンテナ集中 | 活発な人数・トップ貢献者の占有率 | GitHub contributors |

## 外部データ源（4 ベンダー）
**GitHub・OSV・npm・crates** ＋ 検索 API が堅いレジストリ（rubygems/packagist/hex/nuget/pub）。
レジストリは **機能 8 ＋「準備中」6（pip/Go/Maven/Swift/CocoaPods/Conan＝公開検索 API が無いため UI 表示のみ）**。
当初は多源（deps.dev / EPSS / ClickHouse / ecosyste.ms / DL ランキング）を採用したが、保守性・信頼性が価値に
見合わないと判断し撤去（経緯は README「振り返り」）。

## コーディング規約
- **セマンティック HTML**：`<main>/<header>/<nav>/<article>/<section>`。h1→h2→h3（1ページ h1 は1つ）。リンクは `<a>`、操作は `<button>`（div/span にクリックを付けない）。
- **アクセシビリティ必須**：キーボード完遂・可視フォーカス(`:focus-visible`)・アイコンボタンに `aria-label`・装飾は `aria-hidden`・状態は `aria-live`・正確な数値は `sr-only` 併記。`<main>` のロールを上書きしない（loading は `aria-busy` のみ）。
- **パフォーマンス**：データ取得は RSC。ISR（`fetch` revalidate ＋ `unstable_cache`）でレート節約・取得失敗は非キャッシュ＝自己回復。重い照会は詳細ページで Suspense ストリーミング。`next/image`・`next/font`。
- **Watcher は `subscribers_count`**（`watchers_count` は star のエイリアス）。詳細はモーダル不可・独立 URL（AC-7）。全事実に出典リンク。
- **AI に守らせたいことは指示でなく仕組みで強制**：硬いルールは `server-only` 境界・CI で決定的に。柔らかい方針のみ本書/AGENTS.md に。

## テスト戦略
実行境界で配分：ドメイン純関数 → **unit**（異常系/境界）／状態を持つ画面 → **component**（RTL+MSW+getByRole+jest-axe）／
非同期 RSC・動線 → **E2E**（Playwright+axe）／外部 API 契約 → **contract**（nightly・実 API）／同語反復の裏取り → **mutation**（Stryker・ドメインのみ）。
CI（`.github/workflows/frontend-ci.yml`）で 型→Lint→カバレッジゲート→build→E2E を fail-fast。

## 起動
```bash
cd frontend && bun install && bun dev    # http://localhost:3000
cd frontend && bun run build             # ビルド検証
cd frontend && bun test                  # unit + component + a11y
```

## 重要メモ
- `frontend/AGENTS.md`：**「This is NOT the Next.js you know」** ＝コードを書く前に `node_modules/next/dist/docs/` を読む。
- ドキュメントの言語は**日本語**。`doc/` は `要件定義書.md`（要件・受け入れ基準）に絞り、それ以外は README ＋コードへ集約した。
