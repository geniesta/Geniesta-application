// 詳細ページの共有カード（174・動的 OG 画像）。リポジトリ名＋主要事実をブランドカードに描画する。
// テキストは満遍なく描画できるよう Latin 中心（satori 既定フォントは CJK 非対応のため）。
import { ImageResponse } from "next/og";
import { getRepo } from "@/lib/server/github";

export const alt = "Geniesta — library trust facts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = { params: Promise<{ owner: string; repo: string }> };

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export default async function Image({ params }: Params) {
  const { owner, repo } = await params;

  // 事実はベストエフォート（取れなければ名前だけのカードに縮退）。
  let stars: number | null = null;
  let language: string | null = null;
  try {
    const r = await getRepo(owner, repo);
    stars = r?.stargazers_count ?? null;
    language = r?.language ?? null;
  } catch {
    // 縮退（名前のみ）
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "white",
          background:
            "linear-gradient(120deg, #047857 0%, #059669 50%, #0d9488 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* ブランド */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            Geniesta
          </div>
          <div style={{ fontSize: 22, opacity: 0.8 }}>library trust facts</div>
        </div>

        {/* リポジトリ名＋事実 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 30, opacity: 0.85 }}>
            {owner} /
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            {repo}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              fontSize: 30,
              marginTop: 8,
            }}
          >
            {stars != null ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* ★ は satori 既定フォントに無いため SVG で描画 */}
                <svg width="30" height="30" viewBox="0 0 24 24" fill="#fbbf24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span>{fmt(stars)}</span>
              </div>
            ) : null}
            {language ? (
              <div style={{ display: "flex", opacity: 0.9 }}>{language}</div>
            ) : null}
          </div>
        </div>

        {/* テーゼ */}
        <div style={{ display: "flex", fontSize: 28, opacity: 0.9 }}>
          Choose by trust facts, not stars — with sources.
        </div>
      </div>
    ),
    size,
  );
}
