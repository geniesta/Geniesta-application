// 検索フィルターを GitHub `search/repositories` のクエリ修飾子に変換する純関数。
// 追加 API コールは発生しない（q 文字列に qualifier を足すだけ）。
// フレームワークは GitHub に専用 qualifier が無いため topic: で近似する（精度は落ちる）。

export type RepoStatus = "all" | "active" | "archived";
export type SortKey = "" | "stars" | "updated";

// 検索対象（機能する＝検索バックエンドあり）。routing と SearchSource 型の真実の源。
export const SOURCES = [
  ["github", "GitHub"],
  ["npm", "npm"],
  ["crates", "Cargo"],
  ["rubygems", "RubyGems"],
  ["composer", "Composer"],
  ["hex", "Hex"],
  ["nuget", "NuGet"],
  ["pub", "Pub"],
] as const;

// SearchSource は SOURCES からのみ導出する（coming-soon の値は検索ソースとして
// 代入不能にする＝型レベルのガード）。
export type SearchSource = (typeof SOURCES)[number][0];

// ロードマップのプレースホルダ（UI のみ。検索バックエンドなし・ネットワーク呼び出しなし）。
// SearchSource には含めない＝検索/ルーティングからは到達不能。表示ラベルだけに使う。
export const COMING_SOON_SOURCES = [
  ["pypi", "pip"],
  ["go", "Go"],
  ["maven", "Maven"],
  ["swift", "Swift"],
  ["cocoapods", "CocoaPods"],
  ["conan", "Conan"],
] as const;

// 機能する／coming-soon の両方のラベルを解決できるようにする（UI 表示用）。
export const SOURCE_LABELS: Record<string, string> = Object.fromEntries([
  ...SOURCES,
  ...COMING_SOON_SOURCES,
]);

// レジストリ → GitHub Advisory(GHSA) のエコシステム enum。
// 対応しないもの（GitHub）は脆弱性アドバイザリ照会の対象外。
export const GHSA_ECOSYSTEM: Record<string, string> = {
  npm: "NPM",
  crates: "RUST",
  rubygems: "RUBYGEMS",
  composer: "COMPOSER",
  hex: "ERLANG",
  nuget: "NUGET",
  pub: "PUB",
};

// GHSA で受け付けるエコシステム enum の集合（URL パラメータの検証に使う）。
export const GHSA_ECOSYSTEMS = new Set(Object.values(GHSA_ECOSYSTEM));

// 提供元（団体/個人）の優先表示。GitHub に「組織所有」修飾子が無いため取得後に並べ替える。
//   all       … 並べ替えない（純粋に GitHub の関連度）
//   org-first … 団体・企業を前に（安定ソート＝関連度の相対順は維持。個人リポも残す）
//   org-only  … 団体・企業のみに絞る
export type OwnerPref = "all" | "org-first" | "org-only";

function isOrg(owner: { type?: string }): boolean {
  return owner.type === "Organization";
}

export function applyOwnerPreference<T extends { owner: { type?: string } }>(
  items: T[],
  mode: OwnerPref,
): T[] {
  if (mode === "org-only") return items.filter((r) => isOrg(r.owner));
  if (mode === "org-first") {
    // sort は安定（同ランク内は元順を維持）。団体=0 を先頭に。
    return [...items].sort(
      (a, b) => (isOrg(a.owner) ? 0 : 1) - (isOrg(b.owner) ? 0 : 1),
    );
  }
  return items;
}

// C22/C27 ゼロ件救済のためのエイリアス候補。装飾的な接尾辞（拡張子/言語接尾）を外した
// “別名”を提案する（自動では書き換えず、ユーザーに再検索リンクとして提示する＝誘導性を抑える）。
// 例: "react.js" → "react" / "node-js" → "node" / "vue3" → "vue"。
export function aliasSuggestion(q: string): string | null {
  const raw = q.trim();
  if (!raw) return null;
  let s = raw;
  // 拡張子風の接尾（.js/.ts/.py/.rb/.go/.rs/.jsx/.tsx）を除去。
  s = s.replace(/\.(jsx?|tsx?|py|rb|go|rs)$/i, "");
  // "-js" / "-py" / ".js" 以外の言語接尾（react-js / vue-js）を除去。
  s = s.replace(/[-_.]?(js|ts|py|rb|go|rs)$/i, (m, lang, off: number) =>
    // 単独（"js" だけ）や短すぎる残りは触らない。
    off >= 2 ? "" : m,
  );
  // 末尾のメジャーバージョン（vue3 / react18）を除去。
  s = s.replace(/(\d{1,2})$/i, (m, _d, off: number) => (off >= 2 ? "" : m));
  s = s.trim();
  if (!s || s.toLowerCase() === raw.toLowerCase()) return null;
  return s;
}

// C22 タイプミス許容（fuzzy）。よく検索される名称の小辞書に対し編集距離の最近傍を返す。
// 自動では書き換えず「もしかして」候補として提示する（誘導性を抑える＝aliasSuggestion と同方針）。
const FUZZY_DICT = [
  "react", "vue", "angular", "svelte", "sveltekit", "nextjs", "nuxt", "remix",
  "astro", "django", "flask", "fastapi", "rails", "laravel", "express",
  "lodash", "axios", "webpack", "typescript", "eslint", "prettier", "jest",
  "redux", "graphql", "tailwindcss", "mongoose", "prisma", "supabase",
  "numpy", "pandas", "requests", "pytest", "tensorflow", "pytorch",
];

/** 2 文字列の編集距離（Levenshtein）。依存なし・純関数。 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

/**
 * タイプミス補正候補（小辞書に対する編集距離の最近傍）。完全一致・短すぎる語・遠い語は提案しない。
 * 語長が短いほど許容距離を絞る（誤誘導を避ける）。
 */
export function fuzzySuggestion(q: string): string | null {
  const s = q.trim().toLowerCase();
  if (s.length < 3) return null;
  let best: string | null = null;
  let bestD = Infinity;
  for (const cand of FUZZY_DICT) {
    if (cand === s) return null; // 完全一致＝補正不要
    const d = levenshtein(s, cand);
    if (d < bestD) {
      bestD = d;
      best = cand;
    }
  }
  const maxD = s.length <= 4 ? 1 : 2;
  return best && bestD >= 1 && bestD <= maxD ? best : null;
}

export type SearchFilters = {
  q: string;
  lang?: string;
  status?: RepoStatus;
  license?: string;
  framework?: string;
};

// C30 スコープ付き検索構文：検索窓に `lang:rust license:mit status:active` を直接書けるようにする。
// 既知の修飾子だけを抽出して filters に落とし、残り（キーワード＋GitHub ネイティブ修飾子 stars: 等）は
// text としてそのまま検索へ渡す（GitHub は stars: を解釈できる／レジストリでは単なる語）。
export function parseScopedQuery(q: string): {
  text: string;
  lang?: string;
  license?: string;
  status?: RepoStatus;
} {
  const out: { text: string; lang?: string; license?: string; status?: RepoStatus } =
    { text: "" };
  const rest: string[] = [];
  for (const tok of (q ?? "").split(/\s+/).filter(Boolean)) {
    const m = /^(lang|language|license|status):(.+)$/i.exec(tok);
    if (m) {
      const k = m[1].toLowerCase();
      const v = m[2].toLowerCase();
      if ((k === "lang" || k === "language") && !out.lang) {
        out.lang = v;
        continue;
      }
      if (k === "license" && !out.license) {
        out.license = v;
        continue;
      }
      if (
        k === "status" &&
        (v === "active" || v === "archived" || v === "all") &&
        !out.status
      ) {
        out.status = v;
        continue;
      }
    }
    rest.push(tok);
  }
  out.text = rest.join(" ");
  return out;
}

export function buildSearchQuery(f: SearchFilters): string {
  const parts: string[] = [f.q.trim()];
  if (f.framework) parts.push(`topic:${f.framework}`);
  if (f.lang) parts.push(`language:${f.lang}`);
  if (f.license) parts.push(`license:${f.license}`);
  if (f.status === "active") parts.push("archived:false");
  else if (f.status === "archived") parts.push("archived:true");
  return parts.filter(Boolean).join(" ");
}

// UI とテストで共有する選択肢（単一の真実の源）。[value, label]
export const LANGUAGES = [
  ["", "すべて"],
  ["javascript", "JavaScript"],
  ["typescript", "TypeScript"],
  ["go", "Go"],
  ["python", "Python"],
  ["rust", "Rust"],
  ["ruby", "Ruby"],
  ["java", "Java"],
  ["php", "PHP"],
] as const;

export const FRAMEWORKS = [
  ["", "すべて"],
  ["nextjs", "Next.js"],
  ["nuxt", "Nuxt"],
  ["remix", "Remix"],
  ["astro", "Astro"],
  ["sveltekit", "SvelteKit"],
  ["django", "Django"],
  ["rails", "Rails"],
  ["laravel", "Laravel"],
  ["spring-boot", "Spring"],
] as const;

export const LICENSES = [
  ["", "すべて"],
  ["mit", "MIT"],
  ["apache-2.0", "Apache-2.0"],
  ["gpl-3.0", "GPL-3.0"],
  ["bsd-3-clause", "BSD-3-Clause"],
  ["isc", "ISC"],
] as const;

export const STATUSES = [
  ["all", "すべて"],
  ["active", "更新中のみ"],
  ["archived", "アーカイブのみ"],
] as const;

export const SORTS = [
  ["", "ベストマッチ"],
  ["stars", "Star 数"],
  ["updated", "最近更新"],
] as const;

export const OWNERS = [
  ["org-only", "団体・企業のみ"],
  ["org-first", "団体・企業を優先"],
  ["all", "すべて"],
] as const;

// 検索語が「フレームワーク／エコシステム名」だったときに、その topic で
// 関連ライブラリ（エコシステムの人気＝目安）を併せて出すための対応表。
export type Ecosystem = { topic: string; label: string };

const ECOSYSTEMS: Record<string, Ecosystem> = {
  react: { topic: "react", label: "React" },
  vue: { topic: "vue", label: "Vue" },
  "vue.js": { topic: "vue", label: "Vue" },
  angular: { topic: "angular", label: "Angular" },
  svelte: { topic: "svelte", label: "Svelte" },
  sveltekit: { topic: "sveltekit", label: "SvelteKit" },
  next: { topic: "nextjs", label: "Next.js" },
  nextjs: { topic: "nextjs", label: "Next.js" },
  "next.js": { topic: "nextjs", label: "Next.js" },
  nuxt: { topic: "nuxt", label: "Nuxt" },
  remix: { topic: "remix", label: "Remix" },
  astro: { topic: "astro", label: "Astro" },
  django: { topic: "django", label: "Django" },
  flask: { topic: "flask", label: "Flask" },
  fastapi: { topic: "fastapi", label: "FastAPI" },
  rails: { topic: "rails", label: "Rails" },
  laravel: { topic: "laravel", label: "Laravel" },
  express: { topic: "express", label: "Express" },
  spring: { topic: "spring-boot", label: "Spring" },
};

/** 検索語が既知のフレームワーク／エコシステムなら、その topic と表示名を返す。 */
export function detectEcosystem(query: string): Ecosystem | null {
  const norm = query.trim().toLowerCase();
  return ECOSYSTEMS[norm] ?? null;
}
