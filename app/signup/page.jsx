"use client";

import { useState } from "react";
import { Building2, Users } from "lucide-react";
import { COLORS, FONT_DISPLAY, GlobalStyle } from "@/lib/theme";

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

  return (
    <div className="app-root">
      <GlobalStyle />
      <div style={{ position: "relative", maxWidth: 460, margin: "0 auto", padding: "80px 24px" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: "0 0 24px", textAlign: "center" }}>
          BATTER BOXに新規登録
        </h1>

        {!role && (
          <div className="two-col" style={{ display: "grid", gap: 14 }}>
            <button
              onClick={() => setRole("company")}
              style={{ textAlign: "left", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, cursor: "pointer", color: COLORS.text }}
            >
              <Building2 size={20} color={COLORS.teal} />
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, margin: "12px 0 4px" }}>企業として登録</div>
              <div style={{ fontSize: 12.5, color: COLORS.muted, lineHeight: 1.6 }}>AI課題診断・人材提案を利用</div>
            </button>
            <button
              onClick={() => setRole("talent")}
              style={{ textAlign: "left", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, cursor: "pointer", color: COLORS.text }}
            >
              <Users size={20} color={COLORS.amber} />
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, margin: "12px 0 4px" }}>実務経験者として登録</div>
              <div style={{ fontSize: 12.5, color: COLORS.muted, lineHeight: 1.6 }}>スキルマップ可視化・企業提案を利用</div>
            </button>
          </div>
        )}

        {role && (
          <form onSubmit={submit} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 28 }}>
            <div style={{ marginBottom: 16, fontSize: 12.5, color: COLORS.muted }}>
              {role === "company" ? "企業として登録します。" : "実務経験者として登録します。"}{" "}
              <button type="button" onClick={() => setRole(null)} className="btn-ghost" style={{ padding: "3px 8px", fontSize: 11.5 }}>
                変更する
              </button>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label className="field-label">メールアドレス</label>
              <input className="field-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label className="field-label">パスワード(8文字以上)</label>
              <input className="field-input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p style={{ color: COLORS.amber, fontSize: 13, margin: "10px 0 0" }}>{error}</p>}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 18, fontSize: 11.5, color: COLORS.muted, lineHeight: 1.7, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0, accentColor: COLORS.teal }}
              />
              <span>
                <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.teal }}>利用規約</a>と
                <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.teal }}>プライバシーポリシー</a>
                に同意します
              </span>
            </label>
            <button className="btn-primary" type="submit" disabled={loading || !agreed} style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
              {loading ? "登録中…" : "登録する"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", fontSize: 13, color: COLORS.muted, marginTop: 18 }}>
          既にアカウントをお持ちの方は{" "}
          <a href="/login" style={{ color: COLORS.teal }}>
            ログイン
          </a>
        </p>
      </div>
    </div>
  );
}
