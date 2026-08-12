"use client";

import { useState } from "react";
import { COLORS, FONT_DISPLAY, GlobalStyle } from "@/lib/theme";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ログインに失敗しました");

      if (data.user.role === "admin") window.location.href = "/admin";
      else window.location.href = "/app";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-root">
      <GlobalStyle />
      <div style={{ position: "relative", maxWidth: 420, margin: "0 auto", padding: "80px 24px" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: "0 0 24px", textAlign: "center" }}>
          BATTER BOXにログイン
        </h1>
        <form onSubmit={submit} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 28 }}>
          <div style={{ marginBottom: 18 }}>
            <label className="field-label">メールアドレス</label>
            <input className="field-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label className="field-label">パスワード</label>
            <input className="field-input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div style={{ textAlign: "right", marginBottom: 8 }}>
            <a href="/forgot-password" style={{ color: COLORS.muted, fontSize: 12 }}>パスワードをお忘れですか?</a>
          </div>
          {error && <p style={{ color: COLORS.amber, fontSize: 13, margin: "10px 0 0" }}>{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 18 }}>
            {loading ? "ログイン中…" : "ログイン"}
          </button>
        </form>
        <p style={{ textAlign: "center", fontSize: 13, color: COLORS.muted, marginTop: 18 }}>
          アカウントをお持ちでない方は{" "}
          <a href="/signup" style={{ color: COLORS.teal }}>
            新規登録
          </a>
        </p>
      </div>
    </div>
  );
}
