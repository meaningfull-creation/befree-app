"use client";

import { useEffect, useState } from "react";
import { Shell, StepCompany, StepDialog, StepSkillMap } from "@/app/app/page";
import SignupStep from "@/app/_auth/SignupStep";
import { COLORS, FONT_DISPLAY } from "@/lib/theme";

// v6.8で順序を変更。
// 旧: 会社情報 → AI課題診断 → 診断結果 → アカウント作成(最後)
// 新: アカウント作成(最初) → 会社情報 → AI課題診断 → 診断結果
//
// 全部入力し終えたあとに登録を求められるのが面倒がられるため、先に登録してもらう。
// ログイン済みの状態で入力するので、会社情報も診断結果も各APIがその場で保存する
// (以前の「最後にまとめて引き取る」/api/diagnosis/claim は不要になった)。
const STEPS = ["アカウント作成", "会社情報", "AI課題診断", "診断結果"];

export default function DiagnosePage() {
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState(null);
  const [result, setResult] = useState(null); // { scores, summary, axisNotes, topIssueDetails }
  const [auth, setAuth] = useState({ loading: true, user: null });

  // 既にログイン済みならアカウント作成は飛ばす(メールのリンクから戻ってきた場合など)
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setAuth({ loading: false, user: data.user || null });
        if (data.user?.role === "company") setStep((s) => (s === 1 ? 2 : s));
      })
      .catch(() => setAuth({ loading: false, user: null }));
  }, []);

  const headerRight = auth.user ? null : (
    <a className="btn-ghost" href="/login/company" style={{ padding: "6px 14px" }}>ログイン</a>
  );

  // 人材アカウントで企業の診断フローを開いてしまった場合の案内
  if (!auth.loading && auth.user && auth.user.role !== "company") {
    return (
      <Shell steps={STEPS} headerRight={null}>
        <div className="fade-in" style={{ maxWidth: 440 }}>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 21, fontWeight: 700, margin: "0 0 10px" }}>
            企業アカウントでログインしてください
          </h1>
          <p style={{ color: COLORS.muted, fontSize: 13.5, lineHeight: 1.9, margin: "0 0 22px" }}>
            いまは{auth.user.role === "talent" ? "実務経験者" : "運営"}アカウントでログインしています。企業の課題診断は、企業アカウントでご利用いただけます。
          </p>
          <a className="btn-primary" href="/app" style={{ justifyContent: "center" }}>マイページへ戻る</a>
        </div>
      </Shell>
    );
  }

  // minClickableStep: 登録が済んだらステップ1(アカウント作成)には戻せない。
  // 戻れてしまうと「既に登録されています」で詰まるため。
  return (
    <Shell step={step} steps={STEPS} headerRight={headerRight} onStepClick={setStep} minClickableStep={auth.user ? 2 : 1}>
      {step === 1 && <SignupStep role="company" onDone={() => { setAuth((a) => ({ ...a, user: { role: "company" } })); setStep(2); }} />}
      {step === 2 && <StepCompany onNext={(form) => { setCompany(form); setStep(3); }} initialForm={company} />}
      {step === 3 && (
        <StepDialog
          companyForm={company}
          onNext={(scores, summary, axisNotes, topIssueDetails) => {
            setResult({ scores, summary, axisNotes, topIssueDetails });
            setStep(4);
          }}
        />
      )}
      {step === 4 && result && (
        <StepSkillMap
          scores={result.scores}
          summary={result.summary}
          axisNotes={result.axisNotes}
          topIssueDetails={result.topIssueDetails}
          companyForm={company}
          // 診断が終わったら候補一覧へ直行する(v6.7でURLから開けるようにした画面)
          onNext={() => { window.location.href = "/app?view=candidates"; }}
        />
      )}
    </Shell>
  );
}
