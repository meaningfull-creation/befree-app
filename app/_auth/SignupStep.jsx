"use client";

import { useState } from "react";
import { COLORS, FONT_DISPLAY } from "@/lib/theme";

// 入力フローの最初のステップとして出すアカウント作成フォーム(v6.8)。
//
// もともとは「入力 → AI診断 → 結果 → 最後にアカウント作成」という順序だった。
// 全部入力し終えたあとに登録を求められるのが面倒がられる、という指摘を受けて、
// 先にメールアドレスとパスワードだけ決めてもらう形に変えた。
// 登録した時点でログイン状態になるので、以降の入力・診断結果は自動で保存される。
export default function SignupStep({ role, onDone }) {
  const isCompany = role === "company";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [duplicate, setDuplicate] = useState(false);

  const loginHref = isCompany ? "/login/company" : "/login/talent";

  const submit = async (e) => {
    e.preventDefault();
    if (!agreed || loading) return;
    setLoading(true);
    setError(null);
    setDuplicate(false);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) setDuplicate(true);
        throw new Error(data.error || "登録に失敗しました");
      }
      onDone();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: "0 0 8px" }}>
        まず、アカウントを作成します
      </h1>
      <p style={{ color: COLORS.muted, fontSize: 14.5, lineHeight: 1.8, margin: "0 0 10px" }}>
        メールアドレスとパスワードだけ、30秒で終わります。
        {isCompany
          ? "このあとの会社情報と診断結果は自動で保存されるので、"
          : "このあとの経歴とスキルマップは自動で保存されるので、"}
        途中で中断しても続きから再開できます。
      </p>
      <p style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.8, margin: "0 0 28px" }}>
        ご登録のアドレスには「続きから始める」リンク付きのメールをお送りします。別の端末で続きをやる場合は、そのリンクからログインできます。
      </p>

      <form onSubmit={submit} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 24, maxWidth: 440 }}>
        <div style={{ marginBottom: 16 }}>
          <label className="field-label" htmlFor="signup-email">メールアドレス</label>
          <input
            id="signup-email" className="field-input" type="email" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label className="field-label" htmlFor="signup-password">パスワード(8文字以上)</label>
          <input
            id="signup-password" className="field-input" type="password" required minLength={8} autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p style={{ color: COLORS.amber, fontSize: 13, lineHeight: 1.8, margin: "12px 0 0" }}>
            {error}
            {duplicate && (
              <>
                {" "}
                <a href={loginHref} style={{ color: COLORS.tealDim, fontWeight: 700 }}>このアドレスでログインする</a>
              </>
            )}
          </p>
        )}

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 16, fontSize: 12, color: COLORS.muted, lineHeight: 1.8, cursor: "pointer" }}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, width: 20, height: 20, accentColor: COLORS.teal }} />
          <span>
            <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.tealDim }}>利用規約</a>と
            <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.tealDim }}>プライバシーポリシー</a>
            に同意します
          </span>
        </label>

        <button className="btn-primary" type="submit" disabled={loading || !agreed} style={{ width: "100%", justifyContent: "center", marginTop: 18 }}>
          {loading ? "作成中…" : isCompany ? "アカウントを作成して診断を始める" : "アカウントを作成して始める"}
        </button>
      </form>

      <p style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 16 }}>
        既にアカウントをお持ちの方は<a href={loginHref} style={{ color: COLORS.tealDim }}>こちらからログイン</a>してください。
      </p>
    </div>
  );
}
