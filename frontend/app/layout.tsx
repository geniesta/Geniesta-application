import type { Metadata } from "next";
import { Inter, Noto_Sans_JP, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { OfflineBanner } from "@/components/offline-banner";
import { ThemeWatcher } from "@/components/theme-watcher";
import { CompareTray } from "@/components/compare-tray";
import { WebVitals } from "@/components/web-vitals";
import { SITE_URL } from "@/lib/site";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/config";

// L141 設計指針どおり Inter（欧文）＋ Noto Sans JP（和文）。mono は Geist Mono を継続。
// preload は全フォント false にする。理由：既定ロケールは日本語で、ファーストビューの主要テキスト
// （ヒーロー見出し等）は Noto Sans JP（CJK＝巨大で preload 不可）で描画される。欧文の Inter / 和文外の
// Geist Mono を preload すると「preloaded but not used」警告が出るうえ、低速回線では LCP 用の帯域を奪う。
// すべて display:swap なので、フォント未読込でもフォールバックで即時表示→読込後に差し替わる
// （next/font の size-adjust フォールバックで CLS も最小化）。
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const notoJp = Noto_Sans_JP({
  variable: "--font-noto-jp",
  // 和文サブセットは大きいので weight を絞る（本文＋見出し）。
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const SITE_META = {
  ja: {
    title: "Geniesta — ライブラリ信頼性ファインダー",
    desc: "GitHub の OSS ライブラリを star でなく「信頼に関わる公開事実」で選ぶ。生存性・脆弱性・メンテナ・実使用・ライセンスを出典つきで確認できます。",
    ogLocale: "ja_JP",
  },
  en: {
    title: "Geniesta — Library trust finder",
    desc: "Choose GitHub OSS libraries by trust-relevant public facts, not stars. Check liveness, vulnerabilities, maintainers, real-world usage and license — with sources.",
    ogLocale: "en_US",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const m = SITE_META[(await getLocale()) === "en" ? "en" : "ja"];
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: m.title, template: "%s — Geniesta" },
    description: m.desc,
    applicationName: "Geniesta",
    openGraph: {
      title: m.title,
      description: m.desc,
      siteName: "Geniesta",
      type: "website",
      locale: m.ogLocale,
    },
    twitter: { card: "summary_large_image", title: m.title, description: m.desc },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requested = await getLocale();
  const locale = hasLocale(LOCALES, requested) ? requested : DEFAULT_LOCALE;
  return (
    <html
      lang={locale}
      // ダークモードは OS 設定連動（下の head スクリプトが描画前に .dark を付与）。
      // 属性は SSR 後にスクリプトで変わるため、html だけ hydration 警告を抑制する。
      suppressHydrationWarning
      className={`${inter.variable} ${notoJp.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* ダークモード(OS連動)の FOUC 回避：描画前（同期）に documentElement へ反映する。 */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var th=localStorage.getItem('geniesta:theme');var h=new Date().getHours();var night=(h>=18||h<6);var dk;if(th==='dark')dk=true;else if(th==='light')dk=false;else if(th==='time')dk=night;else dk=(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);if(dk)document.documentElement.classList.add('dark');}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-screen">
        {/* NextIntlClientProvider はクライアントにメッセージを供給（cookie ロケール）。 */}
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            {locale === "en" ? "Skip to content" : "本文へスキップ"}
          </a>
          {/* 時刻連動テーマの境界またぎを反映（表示なし）。 */}
          <ThemeWatcher />
          {/* J124 オフライン時の通知（復帰で自動消滅）。 */}
          <OfflineBanner />
          {/* モバイル（lg 未満）はサイドバーが消えるため上部にナビバーを出す。 */}
          <MobileNav />
          <div className="flex min-h-screen">
            <AppSidebar />
            {children}
          </div>
          <CompareTray />
          <WebVitals />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
