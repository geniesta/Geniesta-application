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
  // 通常フローのアンカーナビ（sticky にせず、スクロールで本文と一緒に流れる）。
  return (
    <nav
      aria-label={label}
      className="mb-5 flex flex-wrap items-center gap-1.5 rounded-lg border bg-background p-2 text-xs shadow-sm"
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
