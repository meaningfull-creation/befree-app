import { COLORS, FONT_DISPLAY, GlobalStyle } from "@/lib/theme";
import { Building2, Users } from "lucide-react";

export const metadata = { title: "ログイン | BATTER BOX" };

// 企業と実務経験者でログイン先を分けている。役割ごとに専用の画面(/login/company, /login/talent)へ進む。
export default function LoginChooserPage() {
  return (
    <div className="app-root">
      <GlobalStyle />
      <div style={{ position: "relative", maxWidth: 460, margin: "0 auto", padding: "80px 24px" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, margin: "0 0 8px", textAlign: "center" }}>
          ログイン
        </h1>
        <p style={{ color: COLORS.muted, fontSize: 13.5, textAlign: "center", margin: "0 0 28px" }}>
          どちらのアカウントでログインしますか?
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <a
            href="/login/company"
            style={{ textAlign: "left", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, textDecoration: "none", color: COLORS.text, display: "block" }}
          >
            <Building2 size={20} color={COLORS.teal} />
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, margin: "12px 0 4px" }}>企業として</div>
            <div style={{ fontSize: 12, color: COLORS.muted }}>課題診断・人材提案を利用</div>
          </a>
          <a
            href="/login/talent"
            style={{ textAlign: "left", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, textDecoration: "none", color: COLORS.text, display: "block" }}
          >
            <Users size={20} color={COLORS.amber} />
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, margin: "12px 0 4px" }}>実務経験者として</div>
            <div style={{ fontSize: 12, color: COLORS.muted }}>スキルマップ・企業提案を利用</div>
          </a>
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: COLORS.muted, marginTop: 24 }}>
          アカウントをお持ちでない方は{" "}
          <a href="/signup" style={{ color: COLORS.teal }}>新規登録</a>
        </p>
      </div>
    </div>
  );
}
