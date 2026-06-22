import "server-only";
// GitHub の自動ライセンス検出（LICENSE ファイル走査）が失敗したときのフォールバック。
// リポジトリのパッケージマニフェストの `license` 宣言を読む。
// LICENSE ファイル検出とは“確からしさ”が異なるため、表示側で由来を明記する。

export type ManifestLicense = {
  spdx: string; // 宣言された値（SPDX もしくは SPDX 式）
  source: string; // 由来ファイル名（package.json 等）
  href: string; // 出典（GitHub 上のそのファイル）
};

// 試す順。最初に license を宣言していたものを採用する。
const MANIFESTS = ["package.json", "composer.json", "Cargo.toml"] as const;

/** マニフェスト本文から license 宣言を取り出す純関数（テスト可能）。 */
export function licenseFromManifest(file: string, text: string): string | null {
  if (file.endsWith(".toml")) {
    // [package] の license = "..." を素朴に拾う（license-file は対象外）
    const m = text.match(/^\s*license\s*=\s*"([^"]+)"/m);
    return m ? m[1] : null;
  }
  // package.json / composer.json（JSON）
  try {
    const j = JSON.parse(text) as {
      license?: unknown;
      licenses?: Array<{ type?: string }>;
    };
    if (typeof j.license === "string") return j.license || null;
    if (Array.isArray(j.license) && typeof j.license[0] === "string") {
      return j.license[0];
    }
    if (
      j.license &&
      typeof j.license === "object" &&
      typeof (j.license as { type?: string }).type === "string"
    ) {
      return (j.license as { type?: string }).type ?? null;
    }
    if (Array.isArray(j.licenses) && typeof j.licenses[0]?.type === "string") {
      return j.licenses[0].type ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

// GitHub も manifest も SPDX 化できないとき、LICENSE 本文のタイトルで
// 既知の source-available ライセンスを同定する（live・curation なし）。
// タイトルが一意なので誤検知はほぼ無い。判定できなければ null（黙る）。
const TEXT_RULES: Array<[RegExp, string]> = [
  [/business source license/i, "BUSL-1.1"],
  [/server side public license/i, "SSPL-1.0"],
  [/elastic license\s*2\.0/i, "Elastic-2.0"],
];

export function classifyLicenseText(text: string): string | null {
  // タイトルは冒頭付近にあるので先頭だけ見る（本文中の引用での誤検知を避ける）。
  const head = text.slice(0, 4000);
  for (const [re, spdx] of TEXT_RULES) {
    if (re.test(head)) return spdx;
  }
  return null;
}

const LICENSE_FILES = ["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"];

/** LICENSE ファイル本文から既知の source-available ライセンスを同定する。 */
export async function detectLicenseFromText(
  owner: string,
  repo: string,
  ref: string = "HEAD",
): Promise<ManifestLicense | null> {
  for (const file of LICENSE_FILES) {
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${file}`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) continue;
      const spdx = classifyLicenseText(await res.text());
      // ファイルは見つかったので、ここで判定を確定（一致しなければ null）。
      return spdx
        ? {
            spdx,
            source: file,
            href: `https://github.com/${owner}/${repo}/blob/${ref}/${file}`,
          }
        : null;
    } catch {
      // 次の候補ファイルへ
    }
  }
  return null;
}

export async function detectManifestLicense(
  owner: string,
  repo: string,
  ref: string = "HEAD",
): Promise<ManifestLicense | null> {
  for (const file of MANIFESTS) {
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${file}`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) continue;
      const spdx = licenseFromManifest(file, await res.text());
      if (spdx) {
        return {
          spdx,
          source: file,
          href: `https://github.com/${owner}/${repo}/blob/${ref}/${file}`,
        };
      }
    } catch {
      // 次のマニフェストへ
    }
  }
  return null;
}
