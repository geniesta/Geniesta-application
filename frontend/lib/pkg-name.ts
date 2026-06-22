// パッケージ名正規化の一元化（76）。エコシステムごとの“同一性”ルールを 1 か所に集約する。
// 目的: 「Flask」「flask」「zope.interface」「zope_interface」などの表記揺れで
// DL/バージョン/脆弱性の照会が外れないようにする（事実の取りこぼし防止）。
// eco は GHSA/Usage の enum（NPM / PIP / RUST / ...）。未対応 eco はトリムのみ。

/** エコシステム規約に沿ってパッケージ名を正規化する（照会キー用）。 */
export function normalizePackageName(
  eco: string | null | undefined,
  name: string,
): string {
  const n = (name ?? "").trim();
  if (!n) return n;
  switch (eco) {
    case "PIP":
      // PEP 503: 小文字化し、連続する [-_.] を 1 つの "-" に畳む。
      return n.toLowerCase().replace(/[-_.]+/g, "-");
    case "RUST":
      // crates.io は大文字小文字を区別しない（正規化は小文字）。区切り(-/_)は保持。
      return n.toLowerCase();
    case "NUGET":
      // NuGet の ID は大文字小文字を区別しない。
      return n.toLowerCase();
    case "COMPOSER":
      // Packagist は vendor/package を小文字で扱う。
      return n.toLowerCase();
    default:
      // npm（スコープ名の大小は歴史的に有意）/ Go（module path はそのまま）/ Maven 等は触らない。
      return n;
  }
}
