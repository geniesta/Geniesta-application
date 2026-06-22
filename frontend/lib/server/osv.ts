import "server-only";
// OSV.dev（Google）でパッケージの脆弱性を照会し、GHSA と突き合わせる（単一ソース依存の冗長化）。
// GHSA(GraphQL) だけに頼らず、OSV が持つ GHSA ID 集合と比較して「一致／OSVのみ」を可視化する。
// 採点はしない：取得元が複数で食い違うか、という事実だけを示す。

import { unstable_cache } from "next/cache";
import { resilientFetch, singleFlight } from "@/lib/server/external";
import { tracked } from "@/lib/server/observability";

// GHSA エコシステム enum → OSV のエコシステム名。
const OSV_ECOSYSTEM: Record<string, string> = {
  NPM: "npm",
  PIP: "PyPI",
  RUST: "crates.io",
  GO: "Go",
  MAVEN: "Maven",
  NUGET: "NuGet",
  RUBYGEMS: "RubyGems",
  COMPOSER: "Packagist",
  ERLANG: "Hex",
  PUB: "Pub",
};

export type OsvResult = { total: number; ghsaIds: string[] };

const fetchOsv = unstable_cache(
  async (osvEco: string, pkg: string): Promise<OsvResult> => {
    return singleFlight(`osv:${osvEco}:${pkg}`, () =>
      tracked("osv", async () => {
      const res = await resilientFetch("https://api.osv.dev/v1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: { ecosystem: osvEco, name: pkg } }),
      });
      if (!res.ok) throw new Error(`osv ${res.status}`);
      const data = (await res.json()) as {
        vulns?: Array<{ id?: string; aliases?: string[]; withdrawn?: string }>;
      };
      const vulns = (data.vulns ?? []).filter((v) => !v.withdrawn);
      const ghsa = new Set<string>();
      for (const v of vulns) {
        for (const id of [v.id, ...(v.aliases ?? [])]) {
          if (id?.startsWith("GHSA")) ghsa.add(id);
        }
      }
        return { total: vulns.length, ghsaIds: [...ghsa] };
      }),
    );
  },
  ["osv-v1"],
  { revalidate: 3600 },
);

/** OSV のクロスチェック結果（GHSA エコシステムのみ・失敗は null）。 */
export async function getOsvCrossCheck(
  ghsaEcosystem: string,
  pkg: string,
): Promise<OsvResult | null> {
  const osvEco = OSV_ECOSYSTEM[ghsaEcosystem];
  if (!osvEco) return null;
  try {
    return await fetchOsv(osvEco, pkg);
  } catch {
    return null; // ベストエフォート（クロスチェック行を出さないだけ）
  }
}
