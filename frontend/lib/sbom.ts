// マニフェスト/SBOM 解析（196）。貼り付けた依存ファイルから依存名を取り出し、
// 各依存を「名前 → GitHub 信頼ファクト」へ引く入口（/?src=&q=）に変換するための純関数。
// クライアントで解析し、自動エンリッチはしない（レート消費を避け、リンク提示にとどめる）。

export type SbomDep = { src: string; name: string };

function keysOf(...objs: Array<Record<string, unknown> | undefined | null>): string[] {
  const out: string[] = [];
  for (const o of objs) {
    if (o && typeof o === "object") out.push(...Object.keys(o));
  }
  return out;
}

function uniq(names: string[]): string[] {
  return [...new Set(names.map((n) => n.trim()).filter(Boolean))];
}

/**
 * 依存ファイルのテキストを解析して {src, name}[] を返す（対応外/空は []）。
 * 対応: package.json(npm) / composer.json(composer)。いずれもレジストリ検索が機能する
 * エコシステムに限定する（準備中の PyPI 等は検索バックエンドが無いためリンク切れを避け対象外）。
 */
export function parseSbom(text: string): SbomDep[] {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [];

  // JSON マニフェスト（package.json / composer.json）。
  if (trimmed.startsWith("{")) {
    let j: Record<string, unknown>;
    try {
      j = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return [];
    }
    // composer.json は require / require-dev（vendor/pkg 形式）。
    if (j.require || j["require-dev"]) {
      const names = keysOf(
        j.require as Record<string, unknown>,
        j["require-dev"] as Record<string, unknown>,
      ).filter((n) => n.includes("/") && !n.startsWith("ext-") && n !== "php");
      return uniq(names).map((name) => ({ src: "composer", name }));
    }
    // package.json は dependencies 各種。
    const names = keysOf(
      j.dependencies as Record<string, unknown>,
      j.devDependencies as Record<string, unknown>,
      j.peerDependencies as Record<string, unknown>,
      j.optionalDependencies as Record<string, unknown>,
    );
    return uniq(names).map((name) => ({ src: "npm", name }));
  }

  // JSON 以外（requirements.txt 等）は現状対象外。
  return [];
}
