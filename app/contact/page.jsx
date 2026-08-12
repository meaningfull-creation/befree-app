"use client";

import { useState } from "react";
import { COLORS, FONT_DISPLAY, GlobalStyle } from "@/lib/theme";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", companyName: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "送信に失敗しました");
      setStatus("sent");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="app-root">
        <GlobalStyle />
        <div style={{ position: "relative", maxWidth: 480, margin: "0 auto", padding: "100px 24px", textAlign: "center" }}>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, margin: "0 0 12px" }}>お問い合わせありがとうございます</h1>
          <p style={{ color: COLORS.muted, fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
            内容を確認の上、担当者よりご連絡いたします。少々お待ちください。
          </p>
          <a className="btn-ghost" href="/">← トップに戻る</a>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <GlobalStyle />
      <div style={{ position: "relative", maxWidth: 480, margin: "0 auto", padding: "56px 24px 100px" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, margin: "0 0 8px" }}>お問い合わせ</h1>
        <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 28px", lineHeight: 1.8 }}>
          BeFreeについてのご質問、導入のご相談など、お気軽にお問い合わせください。
        </p>

        <form onSubmit={submit} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 28 }}>
          <div style={{ marginBottom: 18 }}>
            <label className="field-label">お名前</label>
            <input className="field-input" required value={form.name} onChange={set("name")} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label className="field-label">メールアドレス</label>
            <input className="field-input" type="email" required value={form.email} onChange={set("email")} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label className="field-label">会社名(任意)</label>
            <input className="field-input" value={form.companyName} onChange={set("companyName")} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label className="field-label">お問い合わせ内容</label>
            <textarea
              className="field-input"
              rows={5}
              required
              style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
              value={form.message}
              onChange={set("message")}
            />
          </div>
          {errorMsg && <p style={{ color: COLORS.tealDim, fontSize: 13, margin: "10px 0 0" }}>{errorMsg}</p>}
          <button className="btn-primary" type="submit" disabled={status === "sending"} style={{ width: "100%", justifyContent: "center", marginTop: 18 }}>
            {status === "sending" ? "送信中…" : "送信する"}
          </button>
        </form>

        <a href="/" style={{ color: COLORS.teal, fontSize: 13, display: "inline-block", marginTop: 24 }}>← トップに戻る</a>
      </div>
    </div>
  );
}
