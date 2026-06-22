// B19 ページ内アンカーナビ。描画されるセクションへのジャンプリンク（純表示・a11y: nav+ラベル）。
export function AnchorNav({
  items,
  label,
  title,
}: {
  items: Array<{ id: string; label: string }>;
  label: string;
  title?: string;
}) {
  // UX60/61 sticky 化：スクロール中も各セクションへ移動でき、現在地（パッケージ名）も保持する。
  return (
    <nav
      aria-label={label}
      className="sticky top-2 z-30 mb-5 flex flex-wrap items-center gap-1.5 rounded-lg border bg-background/90 p-2 text-xs shadow-sm backdrop-blur"
    >
      {title ? (
        <span className="mr-1 max-w-[40%] truncate border-r pr-2 font-semibold text-foreground">
          {title}
        </span>
      ) : null}
      {items.map((a) => (
        <a
          key={a.id}
          href={`#${a.id}`}
          className="rounded-md px-2 py-1 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {a.label}
        </a>
      ))}
    </nav>
  );
}
