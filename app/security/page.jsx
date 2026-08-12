import { COLORS, FONT_DISPLAY, GlobalStyle } from "@/lib/theme";

export const metadata = { title: "セキュリティについて | BeFree" };

const ITEMS = [
  {
    title: "パスワードの保護",
    body: "パスワードは平文で保存せず、ソルト付きハッシュ(scrypt)に変換して保存しています。当社の運営者を含め、誰もユーザーのパスワードそのものを閲覧することはできません。",
  },
  {
    title: "通信の暗号化",
    body: "本サービスとブラウザ間の通信はHTTPSで暗号化されます。ログイン情報はhttpOnly Cookieで管理し、JavaScriptから直接アクセスできない形で保護しています。",
  },
  {
    title: "AIサービスとの連携",
    body: "課題診断・スキルマップ生成にはAnthropic社が提供するAI(Claude)のAPIを利用しています。APIキーはサーバー側でのみ保持し、ブラウザに公開されることはありません。処理に必要な情報のみをAPIに送信しています。",
  },
  {
    title: "メッセージ機能のアクセス制御",
    body: "企業ユーザーと実務経験者ユーザーの間のメッセージは、そのやり取りの当事者(または運営者)以外は閲覧できないようアクセス制御しています。",
  },
  {
    title: "管理画面の権限管理",
    body: "運営者向けの管理画面は、管理者権限を持つアカウントでのログインが必須です。管理画面上のすべての操作(マッチングの記録、契約の管理等)についても、操作のたびに権限を再検証しています。",
  },
];

export default function SecurityPage() {
  return (
    <div className="app-root">
      <GlobalStyle />
      <div style={{ position: "relative", maxWidth: 680, margin: "0 auto", padding: "56px 24px 100px" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, margin: "0 0 8px" }}>セキュリティについて</h1>
        <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 32px", lineHeight: 1.8 }}>
          BeFreeは、企業の課題情報や実務経験者の職務経歴という機微な情報を取り扱うサービスです。現在講じている保護策をご紹介します。
        </p>

        {ITEMS.map((item) => (
          <section key={item.title} style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>{item.title}</h2>
            <p style={{ fontSize: 13.5, lineHeight: 1.9, color: COLORS.text, margin: 0 }}>{item.body}</p>
          </section>
        ))}

        <p style={{ fontSize: 12, color: COLORS.faint, marginTop: 32, lineHeight: 1.8 }}>
          詳しい個人情報の取扱いについては<a href="/legal/privacy" style={{ color: COLORS.muted }}>プライバシーポリシー</a>をご覧ください。
        </p>

        <a href="/" style={{ color: COLORS.teal, fontSize: 13, display: "inline-block", marginTop: 20 }}>← トップに戻る</a>
      </div>
    </div>
  );
}
