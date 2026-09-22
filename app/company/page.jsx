import { COLORS, FONT_DISPLAY, GlobalStyle } from "@/lib/theme";

export const metadata = { title: "会社概要 | BATTER BOX" };

// 運営会社の登記情報。サービスブランド「BATTER BOX」と運営会社「株式会社BeFree」は別物として扱う。
const FIELDS = [
  { label: "サービス名", value: "BATTER BOX" },
  { label: "運営会社名", value: "株式会社BeFree" },
  { label: "所在地", value: "〒105-0014 東京都港区芝2-28-11 芝MKビル8F" },
  { label: "設立", value: "2021年11月" },
  { label: "資本金", value: "3,000万円" },
  { label: "電話番号", value: "03-6427-0871(受付時間 平日10時〜18時)" },
  { label: "従業員数", value: "正社員35名 / 業務委託15名" },
  { label: "事業内容", value: "AI課題診断×実行伴走人材プラットフォーム「BATTER BOX」の企画・開発・運営" },
  { label: "有料職業紹介事業許可番号", value: "13ーユー314626" },
  { label: "適格請求書発行事業者登録番号", value: "T8010701041862" },
  { label: "お問い合わせ", value: "__CONTACT_LINK__" },
];

export default function CompanyPage() {
  return (
    <div className="app-root">
      <GlobalStyle />
      <header className="app-topbar">
        <div className="app-topbar-inner" style={{ maxWidth: 640 }}>
          <a href="/"><img className="app-topbar-logo" src="/logo.png" alt="BATTER BOX" /></a>
        </div>
      </header>
      <div style={{ position: "relative", maxWidth: 640, margin: "0 auto", padding: "40px 24px 100px" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, margin: "0 0 8px" }}>会社概要</h1>
        <div style={{ marginBottom: 28 }} />

        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {FIELDS.map((f) => (
                <tr key={f.label} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "14px 16px", fontSize: 12.5, color: COLORS.muted, verticalAlign: "top", width: "34%" }}>{f.label}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13.5, color: f.value.startsWith("(") ? COLORS.faint : COLORS.text }}>
                    {f.value === "__CONTACT_LINK__" ? <a href="/contact" style={{ color: COLORS.teal }}>お問い合わせフォームへ</a> : f.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <a href="/" style={{ color: COLORS.teal, fontSize: 13, display: "inline-block", marginTop: 24 }}>← トップに戻る</a>
      </div>
    </div>
  );
}
