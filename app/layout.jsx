import { getSiteUrl } from "@/lib/siteUrl";

// metadataBase を設定しないと、LINE・X等がOGP画像の絶対URLを解決できない。
// 画像の実体は app/opengraph-image.png(ロゴ・1200x630)。
export const metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "BATTER BOX — その経験に、次の打席を。",
  description:
    "企業に足りないのは、人ではなく「経験」かもしれない。AIが経営課題を分析し、いま必要な経験を持つ人と企業をつなぐプラットフォーム、BATTER BOX。",
  openGraph: {
    type: "website",
    siteName: "BATTER BOX",
    locale: "ja_JP",
    title: "BATTER BOX — その経験に、次の打席を。",
    description:
      "企業に足りないのは、人ではなく「経験」かもしれない。AIが経営課題を分析し、いま必要な経験を持つ人と企業をつなぐ。",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
