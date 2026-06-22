"use client";

// J125 再試行（再読み込み）。エラー状態から手動でやり直せる導線。
export function RetryButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => location.reload()}
      className="mt-3 rounded-md border border-amber-300 px-3 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-800 dark:text-amber-100 dark:hover:bg-amber-900/50"
    >
      {label}
    </button>
  );
}
