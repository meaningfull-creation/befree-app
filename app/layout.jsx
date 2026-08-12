export const metadata = {
  title: "BATTER BOX — AI課題診断×実行伴走人材プラットフォーム",
  description: "スタートアップの成長課題をAIで診断し、実務経験者とのマッチングを行うプラットフォーム(開発用プロトタイプ)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
