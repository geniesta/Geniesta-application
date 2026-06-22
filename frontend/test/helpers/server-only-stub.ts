// `server-only` パッケージは React Server Component 以外（vitest/node）で import すると
// 例外を投げる。テストでは lib/server/* を直接ユニットテストするため、空モジュールへ alias する
// （vitest.config.ts の resolve.alias）。本番ビルドでは本物の server-only が境界を強制する。
export {};
