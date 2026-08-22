"use client";

import { useState } from "react";
import { Shell, StepTalentInput, StepTalentAnalyzing, StepTalentSkillMap } from "@/app/app/page";
import { COLORS, FONT_DISPLAY } from "@/lib/theme";

const STEPS = ["経歴入力", "AI解析", "スキルマップ", "アカウント作成"];

// アカウント作成フォーム(スキルマップが完成した最後の一歩としてのみ表示する)。
function SignupInline({ onSubmit, loading, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!agreed) return;
    onSubmit({ email, password });
  };

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
        スキルマップを保存して、企業提案を見る
      </h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px", lineHeight: 1.8 }}>
        メールアドレスとパスワードだけで完了します。今作成したスキルマップはこのアカウントに保存され、そのままログインした状態で企業提案に進めます。
      </p>
      <form onSubmit={submit} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 24, maxWidth: 420 }}>
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">メールアドレス</label>
          <input className="field-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label className="field-label">パスワード(8文字以上)</label>
          <input className="field-input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p style={{ color: COLORS.amber, fontSize: 13, margin: "10px 0 0" }}>{error}</p>}
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 16, fontSize: 11.5, color: COLORS.muted, lineHeight: 1.7, cursor: "pointer" }}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, accentColor: COLORS.teal }} />
          <span>
            <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.teal }}>利用規約</a>と
            <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.teal }}>プライバシーポリシー</a>
            に同意します
          </span>
        </label>
        <button className="btn-primary" type="submit" disabled={loading || !agreed} style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>
          {loading ? "保存中…" : "保存して企業提案を見る"}
        </button>
      </form>
      <p style={{ fontSize: 12, color: COLORS.faint, marginTop: 14 }}>
        既にアカウントをお持ちの方は<a href="/login/talent" style={{ color: COLORS.muted }}>こちらからログイン</a>してください。
      </p>
    </div>
  );
}

export default function JoinPage() {
  const [step, setStep] = useState(1);
  const [talent, setTalent] = useState(null);
  const [result, setResult] = useState(null); // /api/talent/analyze のレスポンス全体
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const handleCreateAccount = async ({ email, password }) => {
    setCreating(true);
    setCreateError(null);
    try {
      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "talent" }),
      });
      const signupData = await signupRes.json();
      if (!signupRes.ok) throw new Error(signupData.error || "登録に失敗しました");

      const claimRes = await fetch("/api/talent/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          talentForm: talent,
          scores: result.scores,
          phases: result.phases,
          bottlenecks: result.bottlenecks,
          summary: result.summary,
        }),
      });
      const claimData = await claimRes.json();
      if (!claimRes.ok) throw new Error(claimData.error || "スキルマップの保存に失敗しました");

      window.location.href = "/app";
    } catch (e) {
      setCreateError(e.message);
      setCreating(false);
    }
  };

  const headerRight = <a className="btn-ghost" href="/login/talent" style={{ padding: "6px 12px" }}>ログイン</a>;

  return (
    <Shell step={step} steps={STEPS} headerRight={headerRight} onStepClick={setStep}>
      {step === 1 && <StepTalentInput onNext={(form) => { setTalent(form); setStep(2); }} />}
      {step === 2 && (
        <StepTalentAnalyzing
          talentForm={talent}
          onNext={(res) => { setResult({ ...res, fallback: false }); setStep(3); }}
        />
      )}
      {step === 3 && result && (
        <StepTalentSkillMap name={talent?.name} scores={result.scores} fit={result} onNext={() => setStep(4)} />
      )}
      {step === 4 && <SignupInline onSubmit={handleCreateAccount} loading={creating} error={createError} />}
    </Shell>
  );
}
