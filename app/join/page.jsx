"use client";

import { useEffect, useState } from "react";
import { Shell, StepTalentInput, StepTalentDialogue, StepTalentSkillMap } from "@/app/app/page";
import SignupStep from "@/app/_auth/SignupStep";
import { COLORS, FONT_DISPLAY } from "@/lib/theme";

// v6.8で順序を変更(企業側の /diagnose と同じ理由)。
// 旧: 経歴入力 → AI自己分析 → スキルマップ → アカウント作成(最後)
// 新: アカウント作成(最初) → 経歴入力 → AI自己分析 → スキルマップ
//
// ログイン済みの状態で入力するので、経歴もスキルマップも各APIがその場で保存する
// (以前の /api/talent/claim は不要になった)。
const STEPS = ["アカウント作成", "経歴入力", "AI自己分析", "スキルマップ"];

export default function JoinPage() {
  const [step, setStep] = useState(1);
  const [talent, setTalent] = useState(null);
  const [result, setResult] = useState(null); // /api/talent/dialogue/answer の最終ターン(done:true)のレスポンス全体
  const [auth, setAuth] = useState({ loading: true, user: null });
  const [restoring, setRestoring] = useState(true); // 保存済みの入力内容を読み込み中かどうか

  // 既にログイン済みならアカウント作成は飛ばす(メールのリンクから戻ってきた場合など)。
  // あわせて、途中まで入力して離脱した方のために、保存済みの内容をフォームに戻す(v6.14)。
  // 復元が終わるまで入力画面を出さない — 先に空のフォームを描いてしまうと、
  // 初期値は最初の描画時にしか読まれないため、あとから届いた内容が反映されない。
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await fetch("/api/auth/me").then((r) => r.json());
        const user = me.user || null;
        if (!alive) return;
        setAuth({ loading: false, user });
        if (user?.role === "talent") {
          setStep((s) => (s === 1 ? 2 : s));
          try {
            const profile = await fetch("/api/me/profile").then((r) => r.json());
            // 名前が空のレコード(アカウント作成だけで離脱)は、復元しても意味がないので無視する
            if (alive && profile?.talentForm?.name) setTalent(profile.talentForm);
          } catch {
            // 復元できなくても入力はできるので、失敗は無視して空のフォームを出す
          }
        }
      } catch {
        if (alive) setAuth({ loading: false, user: null });
      } finally {
        if (alive) setRestoring(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const headerRight = auth.user ? null : (
    <a className="btn-ghost" href="/login/talent" style={{ padding: "6px 14px" }}>ログイン</a>
  );

  // 企業アカウントで人材の登録フローを開いてしまった場合の案内
  if (!auth.loading && auth.user && auth.user.role !== "talent") {
    return (
      <Shell steps={STEPS} headerRight={null}>
        <div className="fade-in" style={{ maxWidth: 440 }}>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 21, fontWeight: 700, margin: "0 0 10px" }}>
            実務経験者アカウントでログインしてください
          </h1>
          <p style={{ color: COLORS.muted, fontSize: 13.5, lineHeight: 1.9, margin: "0 0 22px" }}>
            いまは{auth.user.role === "company" ? "企業" : "運営"}アカウントでログインしています。経験の登録は、実務経験者アカウントでご利用いただけます。
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
      {step === 1 && <SignupStep role="talent" onDone={() => { setAuth((a) => ({ ...a, user: { role: "talent" } })); setStep(2); }} />}
      {step === 2 && restoring && (
        <div className="fade-in" style={{ textAlign: "center", padding: "80px 0", color: COLORS.muted, fontSize: 13.5 }}>
          読み込んでいます…
        </div>
      )}
      {step === 2 && !restoring && <StepTalentInput onNext={(form) => { setTalent(form); setStep(3); }} initialForm={talent} />}
      {step === 3 && (
        <StepTalentDialogue
          talentForm={talent}
          onNext={(res) => { setResult({ ...res, fallback: false }); setStep(4); }}
        />
      )}
      {step === 4 && result && (
        <StepTalentSkillMap
          name={talent?.name}
          scores={result.scores}
          fit={result}
          talentForm={talent}
          talentSkillMapId={result.talentSkillMapId}
          onNext={() => { window.location.href = "/app"; }}
        />
      )}
    </Shell>
  );
}
