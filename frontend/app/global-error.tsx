"use client";

// ルートレイアウト自体が落ちた場合の最終防衛線。layout を置き換えるため
// 自前の <html>/<body> を持ち、Provider に依存できない（文言は固定）。

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily:
            "Inter, 'Noto Sans JP', ui-sans-serif, system-ui, sans-serif",
          background: "#f6f7f9",
          color: "#0f1115",
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: 480,
            padding: "28px 24px",
            textAlign: "center",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            background: "#fff",
          }}
        >
          <h1 style={{ fontSize: 18, margin: "0 0 6px" }}>
            アプリでエラーが発生しました
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 16px" }}>
            予期しないエラーが発生しました。再読み込みしてください。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              font: "inherit",
              fontWeight: 600,
              fontSize: 14,
              color: "#fff",
              border: 0,
              borderRadius: 10,
              padding: "8px 16px",
              cursor: "pointer",
              background:
                "linear-gradient(120deg,#047857,#059669,#0d9488)",
            }}
          >
            再読み込み
          </button>
          {error.digest ? (
            <p
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "#9aa0a6",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              ref: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
