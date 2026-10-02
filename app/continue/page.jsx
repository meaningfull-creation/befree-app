"use client";

import { useState } from "react";
import { COLORS, FONT_DISPLAY, GlobalStyle } from "@/lib/theme";

// 「この続きはこちらから」メールのリンク先。
// 開いただけではログインしない(メールクライアントの先読み対策)。
// ボタンを押したときに初めてワンタイムトークンを消費してログインする。
export default function ContinuePage({ searchParams }) {
  const token = searchParams?.token || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ログインに失敗しました");
      // 入力が途中ならアプリ側が診断フローの続きを出す
      window.location.href = "/app";
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="app-root" style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <GlobalStyle />
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 32, maxWidth: 420, width: "100%", textAlign: "center" }}>
        <img src="/logo.png" alt="BATTER BOX" style={{ height: 40, width: "auto", margin: "0 auto 22px", display: "block" }} />
        {!token ? (
          <>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, margin: "0 0 10px" }}>リンクが正しくありません</h1>
            <p style={{ fontSize: 13.5, color: COLORS.muted, lineHeight: 1.9, margin: "0 0 22px" }}>
              メール内のリンクをもう一度お試しいただくか、パスワードでログインしてください。
            </p>
            <a className="btn-primary" href="/login" style={{ width: "100%", justifyContent: "center" }}>ログイン画面へ</a>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, margin: "0 0 10px" }}>続きから始める</h1>
            <p style={{ fontSize: 13.5, color: COLORS.muted, lineHeight: 1.9, margin: "0 0 22px" }}>
              下のボタンを押すと、ご登録のアカウントにログインして続きから再開します。
            </p>
            {error && (
              <p style={{ fontSize: 13, color: COLORS.amber, lineHeight: 1.8, margin: "0 0 16px" }}>{error}</p>
            )}
            <button className="btn-primary" onClick={submit} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "ログイン中…" : "ログインして続きから"}
            </button>
            <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 16 }}>
              うまくいかない場合は<a href="/login" style={{ color: COLORS.tealDim }}>パスワードでログイン</a>してください。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
