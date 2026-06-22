import "server-only";

// パッケージレジストリ（npm / crates.io）の検索クライアント（サーバー側専用）。
// GitHub リポジトリ検索とは別系統。パッケージの repository から GitHub の owner/repo を
// 取り出し、判明すれば既存の信頼ファクト詳細（/repos/owner/repo）へ橋渡しする。

export type RegistryName =
  | "npm"
  | "crates"
  | "composer"
  | "rubygems"
  | "hex"
  | "nuget"
  | "pub";

export type RegistryPackage = {
  id: string;
  registry: RegistryName;
  name: string;
  description: string | null;
  version: string | null;
  downloads: number | null; // npm=週間 / crates=最近(約90日)
  repo: { owner: string; repo: string } | null; // GitHub が判明すれば
  url: string; // レジストリのページ
};

export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistryError";
  }
}

/** repository URL から GitHub の owner/repo を取り出す（無ければ null）。 */
export function parseGitHubRepo(
  url: string | null | undefined,
): { owner: string; repo: string } | null {
  if (!url) return null;
  // 例: git+https://github.com/owner/repo.git, https://github.com/owner/repo,
  //     git://github.com/owner/repo.git, github:owner/repo
  const shorthand = url.match(/^github:([^/]+)\/([^/#]+)$/i);
  const m =
    shorthand ??
    url.match(/github\.com[/:]([^/]+)\/([^/#?]+?)(?:\.git)?(?:[/#?].*)?$/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/i, "") };
}

/** npm パッケージ検索。関連度順。週間 DL は別 API で best-effort 取得し、事実として併記。 */
export async function searchNpm(q: string): Promise<RegistryPackage[]> {
  const term = q.trim();
  if (!term) return []; // 空クエリは一覧を出さない（例示チップで誘導）
  const res = await fetch(
    `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(term)}&size=250`,
    { next: { revalidate: 300 } },
  );
  if (!res.ok) throw new RegistryError("npm の検索に失敗しました");
  const data = (await res.json()) as {
    objects?: Array<{
      package: {
        name: string;
        version?: string;
        description?: string;
        links?: { npm?: string; repository?: string; homepage?: string };
      };
    }>;
  };

  const pkgs: RegistryPackage[] = (data.objects ?? []).map((o) => {
    const p = o.package;
    return {
      id: `npm:${p.name}`,
      registry: "npm",
      name: p.name,
      description: p.description ?? null,
      version: p.version ?? null,
      downloads: null,
      repo: parseGitHubRepo(p.links?.repository ?? p.links?.homepage),
      url: p.links?.npm ?? `https://www.npmjs.com/package/${p.name}`,
    };
  });

  return enrichNpmDownloads(pkgs);
}

// 週間 DL を一括取得して埋める（unscoped のみ。scoped は "—" のまま）。失敗しても無視。
async function enrichNpmDownloads(
  pkgs: RegistryPackage[],
): Promise<RegistryPackage[]> {
  // npm の一括 DL API は 1 リクエスト 128 パッケージまで。超過分は DL 未取得（"—"）。
  const unscoped = pkgs
    .filter((p) => !p.name.startsWith("@"))
    .map((p) => p.name)
    .slice(0, 128);
  if (!unscoped.length) return pkgs;
  try {
    const dres = await fetch(
      `https://api.npmjs.org/downloads/point/last-week/${unscoped.join(",")}`,
      { next: { revalidate: 300 } },
    );
    if (dres.ok) {
      const dl = (await dres.json()) as Record<
        string,
        { downloads?: number; package?: string }
      > & { downloads?: number; package?: string };
      if (typeof dl.downloads === "number" && dl.package) {
        // 単一パッケージのときはネストしない形で返る
        const hit = pkgs.find((p) => p.name === dl.package);
        if (hit) hit.downloads = dl.downloads;
      } else {
        for (const p of pkgs) {
          const d = dl[p.name];
          if (d && typeof d.downloads === "number") p.downloads = d.downloads;
        }
      }
    }
  } catch {
    // best-effort
  }
  return pkgs;
}

/** Composer（Packagist / PHP）検索。関連度順。DL は事実として併記（並び替えには使わない）。 */
export async function searchPackagist(q: string): Promise<RegistryPackage[]> {
  const term = q.trim();
  if (!term) return []; // 空クエリは一覧を出さない（例示チップで誘導／人気で並べない＝テーゼ）
  const url = `https://packagist.org/search.json?q=${encodeURIComponent(term)}&per_page=100`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new RegistryError("Packagist の検索に失敗しました");
  const data = (await res.json()) as {
    results?: Array<PackagistPkg>;
    packages?: Array<PackagistPkg>;
  };
  const list = data.results ?? data.packages ?? [];
  return list.map((p) => ({
    id: `composer:${p.name}`,
    registry: "composer" as const,
    name: p.name,
    description: p.description ?? null,
    version: null, // search.json はバージョンを含まない
    downloads: typeof p.downloads === "number" ? p.downloads : null,
    repo: parseGitHubRepo(p.repository),
    url: p.url ?? `https://packagist.org/packages/${p.name}`,
  }));
}

type PackagistPkg = {
  name: string;
  description?: string;
  url?: string;
  repository?: string;
  downloads?: number;
};

/** RubyGems 検索（関連度順。検索結果に source_code_uri/homepage_uri を含む）。 */
export async function searchRubyGems(q: string): Promise<RegistryPackage[]> {
  const term = q.trim();
  if (!term) return [];
  const url = `https://rubygems.org/api/v1/search.json?query=${encodeURIComponent(term)}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new RegistryError("RubyGems の検索に失敗しました");
  const data = (await res.json()) as Array<{
    name: string;
    info?: string;
    version?: string;
    downloads?: number;
    homepage_uri?: string;
    source_code_uri?: string;
  }>;
  return data.slice(0, 100).map((p) => ({
    id: `rubygems:${p.name}`,
    registry: "rubygems" as const,
    name: p.name,
    description: p.info ?? null,
    version: p.version ?? null,
    downloads: typeof p.downloads === "number" ? p.downloads : null,
    repo: parseGitHubRepo(p.source_code_uri ?? p.homepage_uri),
    url: `https://rubygems.org/gems/${p.name}`,
  }));
}

/** Hex（Erlang/Elixir）検索。関連度（名前一致）順。DL は事実として併記。 */
export async function searchHex(q: string): Promise<RegistryPackage[]> {
  const term = q.trim();
  if (!term) return [];
  const url = `https://hex.pm/api/packages?search=${encodeURIComponent(term)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Geniesta/0.1" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new RegistryError("Hex の検索に失敗しました");
  const data = (await res.json()) as Array<{
    name: string;
    meta?: { description?: string; links?: Record<string, string> };
    downloads?: { all?: number; recent?: number };
  }>;
  return data.slice(0, 100).map((p) => {
    const ghUrl = Object.values(p.meta?.links ?? {}).find((u) =>
      /github\.com/i.test(u),
    );
    return {
      id: `hex:${p.name}`,
      registry: "hex" as const,
      name: p.name,
      description: p.meta?.description ?? null,
      version: null,
      downloads: p.downloads?.recent ?? p.downloads?.all ?? null,
      repo: parseGitHubRepo(ghUrl),
      url: `https://hex.pm/packages/${p.name}`,
    };
  });
}

/** NuGet（.NET）検索。projectUrl から repo を解決。DL は事実として併記。 */
export async function searchNuGet(q: string): Promise<RegistryPackage[]> {
  const term = q.trim();
  if (!term) return [];
  const res = await fetch(
    `https://azuresearch-usnc.nuget.org/query?q=${encodeURIComponent(term)}&take=100`,
    { next: { revalidate: 300 } },
  );
  if (!res.ok) throw new RegistryError("NuGet の検索に失敗しました");
  const data = (await res.json()) as {
    data?: Array<{
      id: string;
      description?: string;
      version?: string;
      totalDownloads?: number;
      projectUrl?: string;
    }>;
  };
  return (data.data ?? []).map((p) => ({
    id: `nuget:${p.id}`,
    registry: "nuget" as const,
    name: p.id,
    description: p.description ?? null,
    version: p.version ?? null,
    downloads: typeof p.totalDownloads === "number" ? p.totalDownloads : null,
    repo: parseGitHubRepo(p.projectUrl), // projectUrl が GitHub なら採用
    url: `https://www.nuget.org/packages/${p.id}`,
  }));
}

/** Pub（Dart）検索。関連度順。検索は名前のみ返るので、上位を個別取得して repo を解決（N+1）。 */
export async function searchPub(q: string): Promise<RegistryPackage[]> {
  const term = q.trim();
  if (!term) return [];
  const url = `https://pub.dev/api/search?q=${encodeURIComponent(term)}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new RegistryError("pub.dev の検索に失敗しました");
  const data = (await res.json()) as { packages?: Array<{ package: string }> };
  const names = (data.packages ?? []).slice(0, 12).map((p) => p.package);
  const results = await Promise.all(
    names.map(async (name): Promise<RegistryPackage | null> => {
      try {
        const r = await fetch(
          `https://pub.dev/api/packages/${encodeURIComponent(name)}`,
          { next: { revalidate: 3600 } },
        );
        if (!r.ok) return null;
        const d = (await r.json()) as {
          latest?: {
            version?: string;
            pubspec?: {
              description?: string;
              repository?: string;
              homepage?: string;
            };
          };
        };
        const ps = d.latest?.pubspec;
        return {
          id: `pub:${name}`,
          registry: "pub",
          name,
          description: ps?.description ?? null,
          version: d.latest?.version ?? null,
          downloads: null,
          repo: parseGitHubRepo(ps?.repository ?? ps?.homepage),
          url: `https://pub.dev/packages/${name}`,
        };
      } catch {
        return null;
      }
    }),
  );
  return results.filter((p): p is RegistryPackage => p !== null);
}

/** crates.io 検索。関連度順。DL（最近約90日）は事実として併記。 */
export async function searchCrates(q: string): Promise<RegistryPackage[]> {
  const term = q.trim();
  if (!term) return [];
  const query = `q=${encodeURIComponent(term)}&per_page=100`;
  const res = await fetch(`https://crates.io/api/v1/crates?${query}`, {
    // crates.io は User-Agent 必須（無いと拒否される）。
    headers: { "User-Agent": "Geniesta/0.1 (library trust finder)" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new RegistryError("crates.io の検索に失敗しました");
  const data = (await res.json()) as {
    crates?: Array<{
      id: string;
      name: string;
      description?: string;
      downloads?: number;
      recent_downloads?: number;
      max_stable_version?: string;
      newest_version?: string;
      repository?: string;
    }>;
  };
  return (data.crates ?? []).map((c) => ({
    id: `crates:${c.id}`,
    registry: "crates" as const,
    name: c.name,
    description: c.description ?? null,
    version: c.max_stable_version ?? c.newest_version ?? null,
    downloads: c.recent_downloads ?? c.downloads ?? null,
    repo: parseGitHubRepo(c.repository),
    url: `https://crates.io/crates/${c.name}`,
  }));
}

// ── 代表例カード（空タブのデフォルト表示）─────────────────────────────────────────
// 製品テーゼ（DL で並べない）を守るため、空タブは人気順を出さず「代表的なパッケージ」を
// 固定順で提示する。名前は手選びだが、各カードのファクト（Star/ライセンス等）は live。

// 検索結果から目的の名前に一致する1件を選ぶ（完全一致 → vendor/name 末尾一致 → 先頭）。
function pickExact(
  list: RegistryPackage[],
  name: string,
): RegistryPackage | null {
  const n = name.toLowerCase();
  return (
    list.find((p) => {
      const pn = p.name.toLowerCase();
      return pn === n || pn.endsWith(`/${n}`) || pn.endsWith(`:${n}`);
    }) ??
    list[0] ??
    null
  );
}

// npm パッケージのメタを「直読み」で解決する（全文検索 API より軽量・確実）。
async function resolveNpmExact(name: string): Promise<RegistryPackage | null> {
  try {
    // 全文書（registry.npmjs.org/{name}）は人気パッケージで数十MBになり Next の
    // fetch キャッシュ上限(2MB)を超えて失敗する。最新版マニフェストだけの軽量
    // エンドポイント /{name}/latest を使う（repository/version/description を含む）。
    // scoped（@scope/name）は "/" を %2f にしてパス化する。
    const res = await fetch(
      `https://registry.npmjs.org/${name.replace(/\//g, "%2f")}/latest`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      name?: string;
      version?: string;
      description?: string;
      homepage?: string;
      repository?: { url?: string } | string;
    };
    const repoField = data.repository;
    const repoUrl =
      typeof repoField === "string" ? repoField : (repoField?.url ?? data.homepage);
    return {
      id: `npm:${data.name ?? name}`,
      registry: "npm",
      name: data.name ?? name,
      description: data.description ?? null,
      version: data.version ?? null,
      downloads: null,
      repo: parseGitHubRepo(repoUrl ?? null),
      url: `https://www.npmjs.com/package/${name}`,
    };
  } catch {
    return null;
  }
}

// Pub は exact lookup（searchPub の N+1 を避ける）。
async function resolvePubExact(name: string): Promise<RegistryPackage | null> {
  try {
    const r = await fetch(
      `https://pub.dev/api/packages/${encodeURIComponent(name)}`,
      { next: { revalidate: 3600 } },
    );
    if (!r.ok) return null;
    const d = (await r.json()) as {
      latest?: {
        version?: string;
        pubspec?: { description?: string; repository?: string; homepage?: string };
      };
    };
    const ps = d.latest?.pubspec;
    return {
      id: `pub:${name}`,
      registry: "pub",
      name,
      description: ps?.description ?? null,
      version: d.latest?.version ?? null,
      downloads: null,
      repo: parseGitHubRepo(ps?.repository ?? ps?.homepage),
      url: `https://pub.dev/packages/${name}`,
    };
  } catch {
    return null;
  }
}

// Hex は検索が名前順（relevance 無し）で exact を取り逃すため、パッケージ詳細を直接 lookup。
async function resolveHexExact(name: string): Promise<RegistryPackage | null> {
  try {
    const r = await fetch(
      `https://hex.pm/api/packages/${encodeURIComponent(name)}`,
      { headers: { "User-Agent": "Geniesta/0.1" }, next: { revalidate: 3600 } },
    );
    if (!r.ok) return null;
    const p = (await r.json()) as {
      name?: string;
      meta?: { description?: string; links?: Record<string, string> };
      downloads?: { all?: number; recent?: number };
    };
    const ghUrl = Object.values(p.meta?.links ?? {}).find((u) =>
      /github\.com/i.test(u),
    );
    return {
      id: `hex:${name}`,
      registry: "hex",
      name: p.name ?? name,
      description: p.meta?.description ?? null,
      version: null,
      downloads: p.downloads?.recent ?? p.downloads?.all ?? null,
      repo: parseGitHubRepo(ghUrl),
      url: `https://hex.pm/packages/${name}`,
    };
  } catch {
    return null;
  }
}

// 代表例の名前を 1 件の RegistryPackage に解決（軽量・exact 優先）。
export async function resolveExample(
  source: RegistryName,
  name: string,
): Promise<RegistryPackage | null> {
  try {
    switch (source) {
      case "pub":
        return await resolvePubExact(name);
      case "hex":
        return await resolveHexExact(name);
      case "npm":
        return await resolveNpmExact(name);
      case "crates":
        return pickExact(await searchCrates(name), name);
      case "composer":
        return pickExact(await searchPackagist(name), name);
      case "rubygems":
        return pickExact(await searchRubyGems(name), name);
      case "nuget":
        return pickExact(await searchNuGet(name), name);
      default:
        return null;
    }
  } catch {
    return null;
  }
}
