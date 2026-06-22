"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { parseSbom, type SbomDep } from "@/lib/sbom";
import { SOURCE_LABELS } from "@/lib/search-query";

// 依存一括チェック（196）。package.json / composer.json を貼り付けて解析し、
// 各依存の「信頼ファクト」ページへのリンク一覧に変換する。解析はクライアントで完結（送信しない）。
export function SbomChecker() {
  const t = useTranslations("check");
  const [text, setText] = useState("");
  const [deps, setDeps] = useState<SbomDep[] | null>(null);

  const analyze = () => setDeps(parseSbom(text));

  // 117 内訳サマリ：レジストリ別の件数（多い順）。
  const bySrc = deps
    ? [...deps.reduce((m, d) => m.set(d.src, (m.get(d.src) ?? 0) + 1), new Map<string, number>())]
        .sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="sbom" className="text-sm font-medium">
          {t("inputLabel")}
        </label>
        {/* 112 対応形式を常時可視（placeholder は入力で消えるため）。 */}
        <p className="mt-0.5 text-xs text-muted-foreground">{t("formats")}</p>
      </div>
      <textarea
        id="sbom"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("placeholder")}
        rows={10}
        className="w-full rounded-lg border bg-card p-3 font-mono text-xs"
      />
      {/* 115 「送信しない（ブラウザ内解析）」を入力欄直下に明示（安心材料を目立たせる）。 */}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <LockIcon />
        {t("privacy")}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={analyze}
          disabled={!text.trim()}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {t("analyze")}
        </button>
      </div>

      {deps !== null ? (
        deps.length === 0 ? (
          <p className="text-sm text-muted-foreground" role="status">
            {t("empty")}
          </p>
        ) : (
          <section aria-label={t("detected", { n: deps.length })}>
            <p className="text-sm font-medium" role="status">
              {t("detected", { n: deps.length })}
            </p>
            {/* 117 レジストリ別の内訳サマリ。 */}
            <p className="mb-2 text-xs text-muted-foreground">
              {bySrc.map(([src, n]) => `${SOURCE_LABELS[src] ?? src} ${n}`).join(" · ")}
            </p>
            <ul className="flex flex-wrap gap-2">
              {deps.map((d) => (
                <li key={`${d.src}:${d.name}`}>
                  <a
                    href={`/?src=${encodeURIComponent(d.src)}&q=${encodeURIComponent(d.name)}`}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs hover:bg-muted"
                  >
                    <span className="text-muted-foreground">
                      {SOURCE_LABELS[d.src] ?? d.src}
                    </span>
                    {d.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )
      ) : null}
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
