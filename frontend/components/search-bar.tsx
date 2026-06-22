"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getRecentSnapshot,
  getRecentServerSnapshot,
  subscribeRecent,
} from "@/lib/stores/recent-store";

// C16 新規ユーザー向けの定番候補（履歴が空でも価値を出す）。検索へ誘導する小辞書。
const POPULAR = [
  "react", "vue", "next", "express", "axios", "lodash", "tailwindcss",
  "supabase", "prisma", "zod", "typescript", "vite", "eslint",
  "django", "flask", "fastapi", "requests", "numpy", "pandas",
];

export function SearchBar({
  initial = "",
  src = "github",
  compact = false,
}: {
  initial?: string;
  src?: string;
  /** B14 サイドバー常設用の縦積み・小型レイアウト（全ページから再検索できる）。 */
  compact?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("search");
  const [q, setQ] = useState(initial);
  // C21/C28 オートサジェスト＋キーボード操作（ARIA combobox パターン）。
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // B18 遷移中フィードバック：送信/候補遷移を transition で包み、ボタンを pending 表示にする。
  const [isPending, startTransition] = useTransition();
  // B27 IME 変換確定の Enter で誤送信しないよう、変換中フラグを持つ。
  const composingRef = useRef(false);
  const listId = useId();
  const recent = useSyncExternalStore(
    subscribeRecent,
    getRecentSnapshot,
    getRecentServerSnapshot,
  );

  // 候補（API 不要・grounded）。
  //  1) 最近見たパッケージ＝詳細へ直行（recent）
  //  2) C16 新規ユーザー向けに「定番パッケージ」を補完＝検索へ（popular）
  // recent を優先し、popular は重複を避けて補う（最大6件）。
  // src のみに依存。useCallback で identity を安定させ、useMemo の依存配列に正直に載せられる
  //（exhaustive-deps を抑制しないため）。submitSearch でも再利用する。
  const searchHref = useCallback(
    (term: string): string => {
      const params = new URLSearchParams();
      params.set("q", term);
      if (src && src !== "github") params.set("src", src);
      return `/?${params.toString()}`;
    },
    [src],
  );
  const suggestions = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const out: Array<{ label: string; sub?: string; href: string }> = [];
    for (const r of recent) {
      if (`${r.owner}/${r.repo}`.toLowerCase().includes(term)) {
        out.push({ label: r.repo, sub: r.owner, href: `/repos/${r.owner}/${r.repo}` });
      }
    }
    for (const p of POPULAR) {
      if (out.length >= 6) break;
      if (p.includes(term) && !out.some((s) => s.label === p)) {
        out.push({ label: p, href: searchHref(p) });
      }
    }
    return out.slice(0, 6);
  }, [q, recent, searchHref]);
  const showList = open && suggestions.length > 0;

  function submitSearch() {
    const term = q.trim();
    // src（タブ）は維持。空入力での送信は検索結果をリセット（タブはそのまま）。
    const qs = term ? searchHref(term) : "/";
    startTransition(() => router.push(qs));
  }

  function goTo(i: number) {
    const s = suggestions[i];
    if (!s) return;
    setOpen(false);
    setActive(-1);
    startTransition(() => router.push(s.href));
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (composingRef.current) return; // IME 変換中の確定 Enter は送信しない
        submitSearch();
      }}
      className={
        compact ? "flex w-full flex-col gap-2" : "flex w-full max-w-xl gap-2"
      }
    >
      <div className={compact ? "relative w-full" : "relative flex-1"}>
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          // 候補クリック（mousedown）を拾えるよう、blur での閉鎖は少し遅延。
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onCompositionStart={() => (composingRef.current = true)}
          onCompositionEnd={() => (composingRef.current = false)}
          onKeyDown={(e) => {
            // B27 IME 変換中のキー操作（候補移動/確定 Enter）は無視する。
            if (e.nativeEvent.isComposing || composingRef.current) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (suggestions.length > 0) {
                setOpen(true);
                setActive((i) => Math.min(i + 1, suggestions.length - 1));
              }
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              // 候補を選択中なら詳細へ。未選択なら通常の検索送信（form onSubmit）。
              if (showList && active >= 0) {
                e.preventDefault();
                goTo(active);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
          }}
          placeholder={compact ? t("compactPlaceholder") : t("placeholder")}
          aria-label={t("ariaLabel")}
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && active >= 0 ? `${listId}-opt-${active}` : undefined
          }
          autoComplete="off"
          className={
            // ライト＝白地＋黒字（明るい emerald ヒーロー上）。ダーク＝暗地＋白字（深い emerald ヒーロー上・眩しさ回避）。
            // Input 基底の dark:bg-input/30 を明示上書きして、テーマごとに確実な配色にする。
            compact
              ? "h-9 w-full bg-white pr-8 text-neutral-900 placeholder:text-neutral-500 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder:text-neutral-400"
              : "h-11 w-full bg-white pr-9 text-neutral-900 placeholder:text-neutral-500 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder:text-neutral-400"
          }
        />
        {/* B17 クリアボタン（入力があるときだけ・×で空に戻す）。 */}
        {q ? (
          <button
            type="button"
            aria-label={t("clear")}
            onClick={() => {
              setQ("");
              setOpen(false);
              setActive(-1);
            }}
            className="absolute inset-y-0 right-2 my-auto flex size-5 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
        {showList ? (
          <ul
            id={listId}
            role="listbox"
            aria-label={t("suggestionsLabel")}
            className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-background shadow-md"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.href}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown（click より先）で確定＝input の blur に先行して遷移できる。
                onMouseDown={(e) => {
                  e.preventDefault();
                  goTo(i);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
                  i === active ? "bg-muted" : ""
                }`}
              >
                <span className="font-medium">{s.label}</span>
                {s.sub ? (
                  <span className="text-xs text-muted-foreground">{s.sub}</span>
                ) : (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {t("suggestSearch")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <Button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className={compact ? "h-9 w-full" : "h-11 px-6"}
      >
        {isPending ? t("searching") : t("button")}
      </Button>
    </form>
  );
}
