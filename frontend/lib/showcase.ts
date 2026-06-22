// ランディングで「組織から探す」ための有名な団体・企業（GitHub org のログイン名 / 表示名 / 数値ID）。
// クリックで org:<login> 検索に飛ぶ。アイコンは数値IDで直 CDN（avatars.githubusercontent.com/u/<id>）。
// login パス（github.com/<login>.png）はリダイレクト1回を挟むので、固定リストでは ID 直指定でゼロ往復にする。
// ID は安定（GitHub の user/org の数値IDは不変）。`gh api users/<login> --jq .id` などで取得。
export const FEATURED_ORGS = [
  ["google", "Google", 1342004],
  ["microsoft", "Microsoft", 6154722],
  ["aws", "AWS", 2232217],
  ["facebook", "Meta", 69631],
  ["vercel", "Vercel", 14985020],
  ["apache", "Apache", 47359],
  ["kubernetes", "Kubernetes", 13629408],
  ["cloudflare", "Cloudflare", 314135],
  ["golang", "Go", 4314092],
  ["rust-lang", "Rust", 5430905],
] as const;

// 「ライブラリから探す（例）」用のキュレーション。採点・人気ランキングではなく、
// "調べ始めの起点" として代表的なライブラリをカテゴリ別に例示する（製品テーゼ：star/DL で並べない）。
// 各エントリ = [表示名, 検索クエリ, GitHub オーナー（アイコン用アバター）]。
// クリックで /?q=<query> 検索へ。オーナーは全件アバター実在を確認済み。
export type LibEntry = readonly [label: string, query: string, owner: string];
export type LibCategory = readonly [category: string, libs: ReadonlyArray<LibEntry>];
// source（レジストリ）ごとのキュレーション。各エコシステムの代表的ライブラリをカテゴリ別に例示する。
// オーナーは全件アバター実在を確認済み。クリックで /?q=<query>&src=<source> 検索へ。
export const POPULAR_BY_SOURCE: Record<string, ReadonlyArray<LibCategory>> = {
  npm: [
  ["lang", [
    ["TypeScript", "typescript", "microsoft"],
    ["zod", "zod", "colinhacks"],
    ["valibot", "valibot", "fabian-hiller"],
  ]],
  ["ui", [
    ["React", "react", "facebook"],
    ["Vue", "vue", "vuejs"],
    ["Angular", "angular", "angular"],
    ["Svelte", "svelte", "sveltejs"],
    ["Next.js", "nextjs", "vercel"],
    ["Astro", "astro", "withastro"],
  ]],
  ["build", [
    ["Vite", "vite", "vitejs"],
    ["webpack", "webpack", "webpack"],
    ["Rollup", "rollup", "rollup"],
    ["esbuild", "esbuild", "evanw"],
    ["Rolldown", "rolldown", "rolldown"],
    ["oxc", "oxc linter", "oxc-project"],
  ]],
  ["test", [
    ["Jest", "jest", "jestjs"],
    ["Vitest", "vitest", "vitest-dev"],
    ["Testing Library", "testing library", "testing-library"],
    ["Playwright", "playwright", "microsoft"],
    ["Cypress", "cypress", "cypress-io"],
    ["MSW", "mock service worker", "mswjs"],
    ["Storybook", "storybook", "storybookjs"],
  ]],
  ["state", [
    ["Redux Toolkit", "redux toolkit", "reduxjs"],
    ["Zustand", "zustand", "pmndrs"],
    ["Jotai", "jotai", "pmndrs"],
    ["TanStack Query", "tanstack query", "TanStack"],
    ["SWR", "swr", "vercel"],
  ]],
  ["routing", [
    ["React Router", "react router", "remix-run"],
    ["TanStack Router", "tanstack router", "TanStack"],
  ]],
  ["styling", [
    ["Tailwind CSS", "tailwindcss", "tailwindlabs"],
    ["styled-components", "styled components", "styled-components"],
    ["Emotion", "emotion", "emotion-js"],
  ]],
  ["backend", [
    ["Express", "express", "expressjs"],
    ["Fastify", "fastify", "fastify"],
    ["NestJS", "nestjs", "nestjs"],
    ["Koa", "koa", "koajs"],
    ["Hono", "hono", "honojs"],
    ["Elysia", "elysia", "elysiajs"],
  ]],
  ["auth", [
    ["Better Auth", "better auth", "better-auth"],
    ["Clerk", "clerk", "clerk"],
    ["Auth.js", "next-auth", "nextauthjs"],
    ["Lucia", "lucia auth", "lucia-auth"],
    ["Auth0", "auth0", "auth0"],
  ]],
  ["orm", [
    ["Prisma", "prisma", "prisma"],
    ["Drizzle", "drizzle orm", "drizzle-team"],
    ["TypeORM", "typeorm", "typeorm"],
    ["Kysely", "kysely", "kysely-org"],
    ["Knex", "knex", "knex"],
    ["node-postgres", "node postgres", "brianc"],
    ["Sequelize", "sequelize", "sequelize"],
    ["Turso", "turso libsql", "tursodatabase"],
  ]],
  ["lint", [
    ["ESLint", "eslint", "eslint"],
    ["Prettier", "prettier", "prettier"],
    ["Biome", "biome", "biomejs"],
  ]],
  ["ai", [
    ["Vercel AI SDK", "vercel ai sdk", "vercel"],
    ["Anthropic SDK", "anthropic sdk", "anthropics"],
    ["OpenAI", "openai node", "openai"],
  ]],
  ["util", [
    ["Lodash", "lodash", "lodash"],
    ["date-fns", "date-fns", "date-fns"],
    ["Day.js", "dayjs", "iamkun"],
    ["Axios", "axios", "axios"],
    ["dotenv", "dotenv", "motdotla"],
  ]],
  ],
  crates: [
    ["web", [
      ["actix-web", "actix-web", "actix"],
      ["axum", "axum", "tokio-rs"],
      ["Rocket", "rocket rust", "rwf2"],
      ["warp", "warp rust", "seanmonstar"],
    ]],
    ["async", [
      ["Tokio", "tokio", "tokio-rs"],
      ["Rayon", "rayon", "rayon-rs"],
      ["Tracing", "tracing rust", "tokio-rs"],
    ]],
    ["http", [
      ["reqwest", "reqwest", "seanmonstar"],
      ["hyper", "hyper rust", "hyperium"],
    ]],
    ["orm", [
      ["SQLx", "sqlx", "launchbadge"],
      ["Diesel", "diesel", "diesel-rs"],
      ["SeaORM", "sea-orm", "SeaQL"],
    ]],
    ["util", [
      ["serde", "serde", "serde-rs"],
      ["clap", "clap rust", "clap-rs"],
      ["rand", "rand rust", "rust-random"],
      ["anyhow", "anyhow", "dtolnay"],
      ["thiserror", "thiserror", "dtolnay"],
    ]],
  ],
  rubygems: [
    ["web", [
      ["Rails", "rails", "rails"],
      ["Sinatra", "sinatra", "sinatra"],
      ["Hanami", "hanami", "hanami"],
    ]],
    ["test", [
      ["RSpec", "rspec", "rspec"],
    ]],
    ["orm", [
      ["Sequel", "sequel ruby", "jeremyevans"],
    ]],
    ["auth", [
      ["Devise", "devise", "heartcombo"],
      ["Pundit", "pundit", "varvet"],
    ]],
    ["util", [
      ["Sidekiq", "sidekiq", "sidekiq"],
      ["Nokogiri", "nokogiri", "sparklemotion"],
      ["Puma", "puma", "puma"],
      ["Faraday", "faraday", "lostisland"],
    ]],
  ],
  composer: [
    ["web", [
      ["Laravel", "laravel", "laravel"],
      ["Symfony", "symfony", "symfony"],
      ["Yii", "yii2", "yiisoft"],
      ["Inertia", "inertia laravel", "inertiajs"],
      ["Slim", "slim framework php", "slimphp"],
      ["CodeIgniter", "codeigniter4", "codeigniter4"],
    ]],
    ["http", [
      ["Guzzle", "guzzle", "guzzle"],
    ]],
    ["test", [
      ["PHPUnit", "phpunit", "sebastianbergmann"],
      ["Pest", "pest php", "pestphp"],
    ]],
    ["orm", [
      ["Doctrine", "doctrine orm", "doctrine"],
    ]],
    ["util", [
      ["Monolog", "monolog", "Seldaek"],
      ["Carbon", "carbon php", "briannesbitt"],
      ["PHP-Parser", "php-parser", "nikic"],
    ]],
  ],
  hex: [
    ["web", [
      ["Phoenix", "phoenix", "phoenixframework"],
      ["Plug", "plug elixir", "elixir-plug"],
    ]],
    ["orm", [
      ["Ecto", "ecto", "elixir-ecto"],
    ]],
    ["util", [
      ["Absinthe", "absinthe", "absinthe-graphql"],
      ["Oban", "oban", "oban-bg"],
    ]],
  ],
  nuget: [
    ["test", [
      ["xUnit", "xunit", "xunit"],
    ]],
    ["orm", [
      ["EF Core", "entity framework core", "dotnet"],
    ]],
    ["util", [
      ["Newtonsoft.Json", "Newtonsoft.Json", "JamesNK"],
      ["Serilog", "serilog", "serilog"],
      ["AutoMapper", "automapper", "AutoMapper"],
      ["Polly", "polly resilience", "App-vNext"],
      ["FluentValidation", "fluentvalidation", "FluentValidation"],
    ]],
  ],
  pub: [
    ["state", [
      ["Provider", "provider dart", "rrousselGit"],
      ["Riverpod", "riverpod", "rrousselGit"],
      ["Bloc", "flutter_bloc", "felangel"],
    ]],
    ["http", [
      ["Dio", "dio dart", "cfug"],
    ]],
    ["routing", [
      ["go_router", "go_router", "flutter"],
    ]],
  ],
};
