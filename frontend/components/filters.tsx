"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LANGUAGES, FRAMEWORKS, LICENSES } from "@/lib/search-query";

type Props = {
  q: string;
  owner: string;
  lang: string;
  status: string;
  license: string;
  framework: string;
  sort: string;
  // 検索対象（レジストリ選択中はリンクで維持する）。未指定＝GitHub。
  src?: string;
  // レジストリ表示。topic 依存のフレームワーク節を隠し、提供元の既定を「すべて」にする。
  registry?: boolean;
};

export function Filters(props: Props) {
  const router = useRouter();
  const t = useTranslations("filters");

  // 提供元の既定値（URL に載せない値）。ページの既定（org-only）と一致させる。
  const ownerDefault = "org-only";

  // 選択肢ラベルは i18n（owner/status/sort は和訳が要る。言語/FW/ライセンスは固有名のため
  // "すべて" だけ訳す）。値（value）は検索ロジックの共有定数と一致させる。
  const ownerOpts: ReadonlyArray<readonly [string, string]> = [
    ["org-only", t("ownerOrgOnly")],
    ["org-first", t("ownerOrgFirst")],
    ["all", t("optAll")],
  ];
  const statusOpts: ReadonlyArray<readonly [string, string]> = [
    ["all", t("optAll")],
    ["active", t("statusActive")],
    ["archived", t("statusArchived")],
  ];
  const sortOpts: ReadonlyArray<readonly [string, string]> = [
    ["", t("sortBest")],
    ["stars", t("sortStars")],
    ["updated", t("sortUpdated")],
  ];
  // 言語/FW/ライセンスは固有名（locale 非依存）。先頭の "すべて" だけ訳す。
  const withAll = (
    opts: ReadonlyArray<readonly [string, string]>,
  ): ReadonlyArray<readonly [string, string]> =>
    opts.map(([v, l]) => [v, v === "" ? t("optAll") : l] as const);

  // src を保つ基底パラメータ（q ＋ レジストリなら src）。
  function baseParams() {
    const params = new URLSearchParams();
    params.set("q", props.q);
    if (props.src && props.src !== "github") params.set("src", props.src);
    return params;
  }

  // 1つのフィルターを差し替えて URL を更新する。q（と src）は常に維持。
  function pick(key: keyof Omit<Props, "q" | "src" | "registry">, value: string) {
    const merged: Record<string, string> = {
      owner: props.owner,
      lang: props.lang,
      status: props.status,
      license: props.license,
      framework: props.framework,
      sort: props.sort,
      [key]: value,
    };
    const params = baseParams();
    for (const [k, v] of Object.entries(merged)) {
      // 既定値（空 / status=all / owner=既定）はURLに載せない
      if (
        v &&
        !(k === "status" && v === "all") &&
        !(k === "owner" && v === ownerDefault)
      ) {
        params.set(k, v);
      }
    }
    router.push(`/?${params.toString()}`);
  }

  const hasFilters =
    props.lang ||
    props.license ||
    (!props.registry && props.framework) ||
    props.sort ||
    (props.owner && props.owner !== ownerDefault) ||
    (props.status && props.status !== "all");

  return (
    <aside aria-label={t("aria")} className="text-sm">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{t("title")}</h2>
          {/* G93 適用は即時（ボタン不要）であることを明示。 */}
          <p className="text-xs text-muted-foreground">{t("instant")}</p>
        </div>
        {hasFilters ? (
          <button
            onClick={() => router.push(`/?${baseParams().toString()}`)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t("clear")}
          </button>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card">
        <Section
          title={t("owner")}
          paramKey="owner"
          current={props.owner || ownerDefault}
          options={ownerOpts}
          onPick={pick}
          note={t("ownerNote")}
        />
        <Section title={t("status")} paramKey="status" current={props.status || "all"} options={statusOpts} onPick={pick} />
        <Section title={t("sort")} paramKey="sort" current={props.sort} options={sortOpts} onPick={pick} />
        {/* 言語・フレームワークは GitHub 検索専用（レジストリは単一言語が前提なので不要）。 */}
        {!props.registry ? (
          <>
            <Section title={t("lang")} paramKey="lang" current={props.lang} options={withAll(LANGUAGES)} onPick={pick} />
            <Section
              title={t("framework")}
              paramKey="framework"
              current={props.framework}
              options={withAll(FRAMEWORKS)}
              onPick={pick}
              note={t("frameworkNote")}
            />
          </>
        ) : null}
        <Section title={t("license")} paramKey="license" current={props.license} options={withAll(LICENSES)} onPick={pick} last />
      </div>
    </aside>
  );
}

type FilterKey = keyof Omit<Props, "q" | "src" | "registry">;

function Section({
  title,
  paramKey,
  current,
  options,
  onPick,
  note,
  last,
}: {
  title: string;
  paramKey: FilterKey;
  current: string;
  options: ReadonlyArray<readonly [string, string]>;
  onPick: (key: FilterKey, value: string) => void;
  note?: string;
  last?: boolean;
}) {
  return (
    <details open className={last ? "p-3" : "border-b p-3"}>
      <summary className="cursor-pointer select-none font-semibold text-foreground">
        {title}
      </summary>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
      <div className="mt-2 flex flex-col gap-0.5">
        {options.map(([val, label]) => {
          const active = current === val;
          return (
            <button
              key={val || "_all"}
              type="button"
              aria-pressed={active}
              onClick={() => onPick(paramKey, val)}
              className={`rounded-md px-2 py-1 text-left transition ${
                active
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </details>
  );
}
