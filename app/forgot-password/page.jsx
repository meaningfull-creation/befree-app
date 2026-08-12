"use client";

import { useState } from "react";
import { COLORS, FONT_DISPLAY, GlobalStyle } from "@/lib/theme";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const [errorMsg, setErrorMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "送信に失敗しました");
      setStatus("sent");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("idle");
    }
  };

  return (
    <div className="app-root">
      <GlobalStyle />
      <div style={{ position: "relative", maxWidth: 420, margin: "0 auto", padding: "80px 24px" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, margin: "0 0 12px", textAlign: "center" }}>
          パスワードをお忘れですか?
        </h1>
        <p style={{ color: COLORS.muted, fontSize: 13.5, lineHeight: 1.8, textAlign: "center", margin: "0 0 24px" }}>
          登録済みのメールアドレスを入力してください。リセット用のリンクをお送りします。
        </p>

        {status === "sent" ? (
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 28, textAlign: "center", fontSize: 13.5, color: COLORS.text, lineHeight: 1.8 }}>
            入力いただいたメールアドレスが登録されている場合、パスワード再設定用のリンクを送付しました。
          </div>
        ) : (
          <form onSubmit={submit} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 28 }}>
            <div style={{ marginBottom: 8 }}>
              <label className="field-label">メールアドレス</label>
              <input className="field-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {errorMsg && <p style={{ color: COLORS.tealDim, fontSize: 13, margin: "10px 0 0" }}>{errorMsg}</p>}
            <button className="btn-primary" type="submit" disabled={status === "sending"} style={{ width: "100%", justifyContent: "center", marginTop: 18 }}>
              {status === "sending" ? "送信中…" : "リセットリンクを送る"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", fontSize: 13, color: COLORS.muted, marginTop: 18 }}>
          <a href="/login" style={{ color: COLORS.teal }}>← ログインに戻る</a>
        </p>
      </div>
    </div>
  );
}
