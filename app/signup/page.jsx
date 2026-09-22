"use client";

import { useState } from "react";
import { Building2, Users, Check, ArrowRight } from "lucide-react";
import { COLORS, FONT_DISPLAY, FONT_MONO, GlobalStyle } from "@/lib/theme";

// 登録前に「この先に何があるか」が見えるようにするための、ロール別の訴求。
// 抽象的な機能名の羅列ではなく、登録直後に実際に起きることを書く。
const ROLES = {
  company: {
    label: "企業",
    icon: Building2,
    headline: "会社に足りない経験を、必要な分だけ。",
    lead: "5つの質問に答えるだけで、成長を止めている課題が10軸のスコアで見えます。",
    accent: COLORS.teal,
    steps: [
      { n: "01", t: "5問の対話に答える", d: "AIが業種と成長段階に合わせて質問します。3分ほどで終わります。" },
      { n: "02", t: "Growth Mapが出る", d: "10軸のスコアと、成長を止めている課題TOP3がその場で表示されます。" },
      { n: "03", t: "必要な経験が提案される", d: "課題を解決できる実務経験者が、マッチ度の根拠つきで提案されます。" },
    ],
    perks: ["診断は無料・クレジットカード不要", "月10時間から依頼できます", "気に入らなければ契約せずに終われます"],
  },
  talent: {
    label: "実務経験者",
    icon: Users,
    headline: "あなたの経験が、どの会社で効くのか。",
    lead: "5つの質問に答えるだけで、これまでの実務経験が10軸のスキルマップになります。",
    accent: COLORS.amber,
    steps: [
      { n: "01", t: "5問の対話に答える", d: "職歴をもとにAIが質問します。履歴書の作成は不要です。" },
      { n: "02", t: "スキルマップが出る", d: "10軸のスコア、強み、経験を活かせる業界の候補まで可視化されます。" },
      { n: "03", t: "企業から声がかかる", d: "課題が合致する企業から、なぜあなたなのかの根拠つきで連絡が届きます。" },
    ],
    perks: ["登録は無料", "月10時間から、本業と並行して関われます", "稼働できる上限は自分で設定できます"],
  },
};

export default function SignupPage() {
  const [role, setRole] = useState(null); // "company" | "talent"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setError("利用規約・プライバシーポリシーへの同意が必要です");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登録に失敗しました");
      window.location.href = "/app";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const r = role ? ROLES[role] : null;

  return (
    <div className="app-root">
      <GlobalStyle />
      <header className="app-topbar">
        <div className="app-topbar-inner" style={{ maxWidth: 1000 }}>
          <a href="/"><img className="app-topbar-logo" src="/logo.png" alt="BATTER BOX" /></a>
          <a className="btn-ghost" href="/login" style={{ marginLeft: "auto", fontSize: 12.5, padding: "8px 16px" }}>ログイン</a>
        </div>
      </header>

      <div style={{ position: "relative", maxWidth: 1000, margin: "0 auto", padding: "44px 24px 100px" }}>
        {!role && (
          <div className="fade-in">
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ display: "inline-block", fontSize: 11, fontFamily: FONT_MONO, color: COLORS.tealDim, background: "#FFF3EA", border: `1px solid ${COLORS.teal}`, borderRadius: 999, padding: "5px 14px", marginBottom: 16 }}>
                無料・3分・クレジットカード不要
              </div>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 800, margin: "0 0 12px", lineHeight: 1.4 }}>
                まず、あなたはどちらですか？
              </h1>
              <p style={{ color: COLORS.muted, fontSize: 14, margin: 0, lineHeight: 1.9 }}>
                選んだ方に合わせて、登録後すぐにAI診断が始まります。<br />
                結果が出るまで料金は一切かかりません。
              </p>
            </div>

            <div className="two-col" style={{ display: "grid", gap: 18 }}>
              {Object.entries(ROLES).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setRole(key)}
                    className="role-card"
                    style={{
                      textAlign: "left", background: COLORS.surface, border: `1.5px solid ${COLORS.border}`,
                      borderRadius: 18, padding: 26, cursor: "pointer", color: COLORS.text,
                      display: "flex", flexDirection: "column", gap: 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <span style={{ width: 40, height: 40, borderRadius: 12, background: cfg.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={20} color={COLORS.onAccent} />
                      </span>
                      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15 }}>{cfg.label}として登録</span>
                    </div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17, lineHeight: 1.6, marginBottom: 8 }}>{cfg.headline}</div>
                    <div style={{ fontSize: 12.5, color: COLORS.muted, lineHeight: 1.9, marginBottom: 16 }}>{cfg.lead}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
                      {cfg.perks.map((p) => (
                        <div key={p} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, color: COLORS.muted }}>
                          <Check size={13} color={cfg.accent} style={{ flexShrink: 0, marginTop: 3 }} />
                          <span style={{ lineHeight: 1.7 }}>{p}</span>
                        </div>
                      ))}
                    </div>
                    <span style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, fontFamily: FONT_DISPLAY, color: cfg.accent }}>
                      これではじめる <ArrowRight size={15} />
                    </span>
                  </button>
                );
              })}
            </div>

            <p style={{ textAlign: "center", fontSize: 13, color: COLORS.muted, marginTop: 32 }}>
              既にアカウントをお持ちの方は <a href="/login" style={{ color: COLORS.teal }}>ログイン</a>
            </p>
          </div>
        )}

        {role && (
          <div className="fade-in" style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr", maxWidth: 940, margin: "0 auto" }}>
            <div className="signup-split" style={{ display: "grid", gap: 28, alignItems: "start" }}>
              {/* 左: 登録後に何が起きるかの3ステップ。入力中も「この先」が見えている状態にする */}
              <div>
                <button
                  type="button"
                  onClick={() => setRole(null)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12.5, color: COLORS.muted, marginBottom: 18, fontFamily: "inherit" }}
                >
                  ← 登録する種別を選び直す
                </button>
                <div style={{ fontSize: 11.5, color: r.accent, fontWeight: 700, fontFamily: FONT_DISPLAY, marginBottom: 8 }}>{r.label}として登録</div>
                <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800, margin: "0 0 10px", lineHeight: 1.5 }}>{r.headline}</h1>
                <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.9, margin: "0 0 26px" }}>{r.lead}</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {r.steps.map((st, i) => (
                    <div key={st.n} style={{ display: "flex", gap: 14, position: "relative", paddingBottom: i === r.steps.length - 1 ? 0 : 20 }}>
                      {i !== r.steps.length - 1 && (
                        <span style={{ position: "absolute", left: 15, top: 34, bottom: 6, width: 2, background: COLORS.border }} />
                      )}
                      <span style={{ width: 32, height: 32, borderRadius: 999, background: COLORS.surface, border: `2px solid ${r.accent}`, color: r.accent, fontFamily: FONT_MONO, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
                        {st.n}
                      </span>
                      <div style={{ paddingTop: 4 }}>
                        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{st.t}</div>
                        <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.8 }}>{st.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 右: 入力欄 */}
              <form onSubmit={submit} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: 28, boxShadow: "0 6px 28px rgba(4,22,45,0.06)" }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, marginBottom: 20 }}>アカウントを作成</div>
                <div style={{ marginBottom: 18 }}>
                  <label className="field-label">メールアドレス</label>
                  <input className="field-input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label className="field-label">パスワード(8文字以上)</label>
                  <input className="field-input" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {error && <p style={{ color: COLORS.tealDim, fontSize: 13, margin: "10px 0 0", lineHeight: 1.7 }}>{error}</p>}
                <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 18, fontSize: 11.5, color: COLORS.muted, lineHeight: 1.8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    style={{ marginTop: 3, flexShrink: 0, accentColor: COLORS.teal, width: 16, height: 16 }}
                  />
                  <span>
                    <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.teal }}>利用規約</a>と
                    <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.teal }}>プライバシーポリシー</a>
                    に同意します
                  </span>
                </label>
                <button className="btn-primary" type="submit" disabled={loading || !agreed} style={{ width: "100%", justifyContent: "center", marginTop: 18, padding: "14px 24px", fontSize: 15 }}>
                  {loading ? "登録中…" : "無料ではじめる"}
                </button>
                <p style={{ fontSize: 11, color: COLORS.faint, textAlign: "center", margin: "12px 0 0", lineHeight: 1.7 }}>
                  登録後すぐに診断が始まります。途中でやめても料金はかかりません。
                </p>
                <p style={{ textAlign: "center", fontSize: 12.5, color: COLORS.muted, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
                  既にアカウントをお持ちの方は <a href="/login" style={{ color: COLORS.teal }}>ログイン</a>
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
