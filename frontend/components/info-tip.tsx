"use client";

import type { ReactNode } from "react";
import { Tooltip } from "radix-ui";

// B20 「この事実の読み方」ツールチップ（教育的 UX）。
// 各指標の隣に小さな「?」を置き、ホバー/フォーカスで読み方を出す。
// - キーボード完遂（Tab でフォーカス→開く・Esc で閉じる）と可視フォーカスを担保。
// - 装飾の「?」は aria-label で説明（アイコンのみボタンのラベル網羅・J100）。
// - 採点はしない：内容は「読み方の目安」に限る（herding を避ける中立な説明）。
export function InfoTip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/50 text-xs font-bold leading-none text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            ?
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={5}
            className="z-50 max-w-[16rem] rounded-md bg-foreground px-3 py-2 text-xs leading-relaxed text-background shadow-md"
          >
            {children}
            <Tooltip.Arrow className="fill-foreground" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
