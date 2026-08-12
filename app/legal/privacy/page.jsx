import { COLORS, FONT_DISPLAY, GlobalStyle } from "@/lib/theme";

export const metadata = { title: "プライバシーポリシー | BATTER BOX" };

const SECTIONS = [
  {
    title: "1. 収集する情報",
    body: `当社は、本サービスの提供にあたり、以下の情報を取得します。(1)企業ユーザー: 会社名、事業ドメイン、従業員数、事業フェーズ、売上規模、AI課題診断の対話内容。(2)実務経験者ユーザー: 氏名、メールアドレス、直近の役職、業種経験、実務経験年数、職務経歴・プロジェクト実績。(3)共通: メールアドレス、パスワード(ハッシュ化して保存)、本サービス上でのメッセージ内容、利用ログ。`,
  },
  {
    title: "2. 利用目的",
    body: `取得した情報は、(1)AIによる課題診断・スキルマップの生成、(2)企業と実務経験者のマッチング、(3)本人確認・アカウント管理、(4)本サービスの品質改善・マッチング精度向上のための分析、(5)お問い合わせへの対応、(6)重要な通知の送付、の目的で利用します。`,
  },
  {
    title: "3. 第三者提供・外部送信について",
    body: `AI課題診断・スキルマップ生成の一部処理には、Anthropic, PBC(以下「Anthropic社」)が提供するAI(Claude)のAPIを利用しています。ユーザーが入力した企業情報・対話内容・職務経歴の一部は、診断・解析処理のためAnthropic社のAPIに送信されます。送信された情報の取扱いはAnthropic社のプライバシーポリシーおよび利用規約に準拠します。当社は、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供しません。`,
  },
  {
    title: "4. 業務委託先への提供",
    body: `当社は、本サービスの運営に必要な範囲で、クラウドインフラ事業者・決済事業者等の業務委託先に個人情報の取扱いを委託する場合があります。この場合、委託先に対して適切な監督を行います。`,
  },
  {
    title: "5. 安全管理措置",
    body: `当社は、取得した個人情報について、不正アクセス・紛失・破壊・改ざん・漏えい等を防止するため、パスワードのハッシュ化、通信の暗号化(HTTPS)、アクセス制御等の合理的な安全管理措置を講じます。`,
  },
  {
    title: "6. 個人情報の開示・訂正・削除",
    body: `ユーザーは、当社が保有する自己の個人情報について、開示・訂正・利用停止・削除を請求できます。請求方法は、お問い合わせ窓口(本ページ末尾)までご連絡ください。本人確認の上、法令に従い合理的な期間内に対応します。`,
  },
  {
    title: "7. Cookie等の利用",
    body: `本サービスは、ログイン状態を維持するためにセッションCookieを利用します。当該Cookieは本サービスの機能提供に必要な範囲でのみ利用し、広告目的のトラッキングには利用しません。`,
  },
  {
    title: "8. 保存期間",
    body: `個人情報は、利用目的の達成に必要な期間、または法令で定める期間保管し、不要となった場合は適切に削除します。アカウント退会後の取扱いについては別途定めます。`,
  },
  {
    title: "9. プライバシーポリシーの変更",
    body: `当社は、必要に応じて本ポリシーを変更することがあります。重要な変更を行う場合は、本サービス上での掲示等、適切な方法で周知します。`,
  },
  {
    title: "10. お問い合わせ窓口",
    body: `個人情報の取扱いに関するお問い合わせは、本サービスのお問い合わせフォーム(/contact)までご連絡ください。`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="app-root">
      <GlobalStyle />
      <div style={{ position: "relative", maxWidth: 720, margin: "0 auto", padding: "56px 24px 100px" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, margin: "0 0 8px" }}>プライバシーポリシー</h1>
        <p style={{ color: COLORS.muted, fontSize: 12.5, margin: "0 0 24px" }}>制定日: ドラフト版</p>

        <div
          style={{
            background: "rgba(27,58,99,0.08)",
            border: `1px solid ${COLORS.amber}`,
            borderRadius: 10,
            padding: "14px 18px",
            fontSize: 12.5,
            color: COLORS.text,
            lineHeight: 1.7,
            marginBottom: 32,
          }}
        >
          このページは初期ドラフトです。正式に公開する前に、個人情報保護法等の関連法令に照らして専門家によるレビューを受けてください。特に「3. 第三者提供・外部送信について」は、実際のAI連携構成(どのデータをどの範囲で送信しているか)と齟齬がないか確認が必要です。
        </div>

        {SECTIONS.map((s) => (
          <section key={s.title} style={{ marginBottom: 26 }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>{s.title}</h2>
            <p style={{ fontSize: 13.5, lineHeight: 1.9, color: COLORS.text, margin: 0 }}>{s.body}</p>
          </section>
        ))}

        <a href="/signup" style={{ color: COLORS.teal, fontSize: 13 }}>← 新規登録に戻る</a>
      </div>
    </div>
  );
}
