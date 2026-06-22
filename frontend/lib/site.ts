// サイトの公開 URL（メタデータ/sitemap/robots で使用）。本番は SITE_URL を設定。
export const SITE_URL = (
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

// 89 訂正可能性：「この事実おかしい」報告の宛先（プロジェクトの issue tracker）。
// クライアントからも参照するため NEXT_PUBLIC_。未設定時は Geniesta リポジトリ。
export const PROJECT_REPO_URL = (
  process.env.NEXT_PUBLIC_PROJECT_REPO ||
  "https://github.com/geniesta/Geniesta-application"
).replace(/\/$/, "");

/** 事実の訂正報告用に、内容を prefill した GitHub issue 作成 URL を返す。 */
export function reportIssueUrl(subject: string): string {
  const title = `[fact report] ${subject}`;
  const body = `対象: ${subject}\nURL: \n\n気になった事実・出典との食い違い:\n`;
  return `${PROJECT_REPO_URL}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}
