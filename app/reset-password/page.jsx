"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { COLORS, FONT_DISPLAY, GlobalStyle } from "@/lib/theme";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done
  const [errorMsg, setErrorMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "再設定に失敗しました");
      setStatus("done");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("idle");
    }
  };

  if (!token) {
    return (
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 28, textAlign: "center", fontSize: 13.5, color: COLORS.text }}>
        リンクが正しくありません。<a href="/forgot-password" style={{ color: COLORS.teal }}>再度リクエスト</a>してください。
      </div>
    );
  }

  if (status === "done") {
    return (
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 28, textAlign: "center", fontSize: 13.5, color: COLORS.text, lineHeight: 1.8 }}>
        パスワードを再設定しました。<a href="/login" style={{ color: COLORS.teal }}>ログイン画面へ</a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 28 }}>
      <div style={{ marginBottom: 8 }}>
        <label className="field-label">新しいパスワード(8文字以上)</label>
        <input className="field-input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {errorMsg && <p style={{ color: COLORS.tealDim, fontSize: 13, margin: "10px 0 0" }}>{errorMsg}</p>}
      <button className="btn-primary" type="submit" disabled={status === "sending"} style={{ width: "100%", justifyContent: "center", marginTop: 18 }}>
        {status === "sending" ? "設定中…" : "パスワードを再設定する"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="app-root">
      <GlobalStyle />
      <div style={{ position: "relative", maxWidth: 420, margin: "0 auto", padding: "80px 24px" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, margin: "0 0 24px", textAlign: "center" }}>
          パスワードの再設定
        </h1>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
