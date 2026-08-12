"use client";

import { useState, useEffect, useRef } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Building2,
  Users,
  TrendingUp,
  ArrowRight,
  Send,
  Sparkles,
  Clock,
  BadgeCheck,
  ChevronRight,
} from "lucide-react";
import { AXES, TALENT_SCORE_RUBRIC } from "@/lib/axes";
import { COLORS, FONT_DISPLAY, FONT_BODY, FONT_MONO, GlobalStyle } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Design tokens (BATTER BOX_技術構成設計.md / プロトタイプと共通)
// ---------------------------------------------------------------------------
const MAX_DIALOG_TURNS = 4;
const ANALYZING_STEPS = [
  "職務経歴書を読み込み中…",
  "プロジェクト実績から成果指標を抽出中…",
  "10軸のスキル軸にマッピング中…",
  "適性のある企業フェーズを算出中…",
];

// ---------------------------------------------------------------------------
// API client — 全てローカルのAPI Routes(/app/api/**)経由。
// ブラウザからAnthropic APIへ直接アクセスすることはない。
// ---------------------------------------------------------------------------
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `request failed: ${url}`);
  return data;
}

function ProgressRail({ step, steps }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, flexWrap: "wrap" }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: active ? 1 : done ? 0.75 : 0.4 }}>
              <div
                style={{
                  width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontFamily: FONT_MONO,
                  background: done ? COLORS.teal : "transparent",
                  border: `1.5px solid ${done || active ? COLORS.teal : COLORS.border}`,
                  color: done ? COLORS.onAccent : active ? COLORS.teal : COLORS.faint,
                  flexShrink: 0,
                }}
              >
                {idx}
              </div>
              <span style={{ fontSize: 12.5, fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: "0.02em", color: active ? COLORS.text : COLORS.muted, whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {idx !== steps.length && <div style={{ width: 24, height: 1, background: COLORS.border }} />}
          </div>
        );
      })}
    </div>
  );
}

function Shell({ children, step, steps, headerRight }) {
  return (
    <div className="app-root">
      <GlobalStyle />
      <div style={{ position: "relative", maxWidth: 880, margin: "0 auto", padding: "48px 24px 80px" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
          <img src="/logo.png" alt="BATTER BOX" style={{ height: 24, width: "auto" }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: COLORS.faint, border: `1px solid ${COLORS.border}`, borderRadius: 5, padding: "2px 7px", marginLeft: 4 }}>
            v1.3
          </span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>{headerRight}</div>
        </header>
        {steps && <ProgressRail step={step} steps={steps} />}
        {children}
      </div>
    </div>
  );
}

function ErrorNote({ message, onRetry }) {
  if (!message) return null;
  return (
    <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 13, color: COLORS.amber }}>{message}</span>
      {onRetry && <button className="btn-ghost" onClick={onRetry}>再試行</button>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mode select
// ---------------------------------------------------------------------------
function AuthGate() {
  return (
    <Shell step={0} steps={null}>
      <div className="fade-in" style={{ maxWidth: 480, margin: "60px auto 0", textAlign: "center" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, margin: "0 0 10px" }}>
          BATTER BOXへようこそ
        </h1>
        <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 32px", lineHeight: 1.7 }}>
          企業として課題診断を受けるか、実務経験者としてスキルマップを作成するには、まずアカウントが必要です。
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <a className="btn-primary" href="/signup">新規登録</a>
          <a className="btn-ghost" href="/login">ログイン</a>
        </div>
      </div>
    </Shell>
  );
}

function LoadingScreen() {
  return (
    <Shell step={0} steps={null}>
      <div className="fade-in" style={{ textAlign: "center", padding: "80px 0", color: COLORS.muted, fontSize: 13.5 }}>
        読み込んでいます…
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Company flow — Step 1: company info
// ---------------------------------------------------------------------------
function StepCompany({ onNext }) {
  const [form, setForm] = useState({ name: "", industry: "SaaS / 業務効率化", headcount: "11〜30名", phase: "シリーズA", revenue: "1〜3億円" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.name.trim().length > 0;

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 27, fontWeight: 600, margin: "0 0 8px" }}>まず、貴社の基本情報を教えてください</h1>
      <p style={{ color: COLORS.muted, fontSize: 14.5, lineHeight: 1.7, margin: "0 0 32px" }}>
        入力いただいた情報をもとに、AIが想定される課題の仮説を立て、対話を通じて本質的なボトルネックを特定します。
      </p>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 28 }}>
        <div style={{ marginBottom: 20 }}>
          <label className="field-label"><Building2 size={12} style={{ verticalAlign: -2, marginRight: 5 }} />会社名</label>
          <input className="field-input" placeholder="例: 株式会社ノーステック" value={form.name} onChange={set("name")} />
        </div>
        <div className="two-col" style={{ display: "grid", gap: 18, marginBottom: 20 }}>
          <div>
            <label className="field-label">事業ドメイン</label>
            <select className="field-select" value={form.industry} onChange={set("industry")}>
              <option>SaaS / 業務効率化</option><option>フィンテック</option><option>ヘルスケア</option><option>D2C / EC</option><option>人材 / HRテック</option>
            </select>
          </div>
          <div>
            <label className="field-label"><Users size={12} style={{ verticalAlign: -2, marginRight: 5 }} />従業員数</label>
            <select className="field-select" value={form.headcount} onChange={set("headcount")}>
              <option>〜10名</option><option>11〜30名</option><option>31〜50名</option><option>51〜100名</option><option>101名〜</option>
            </select>
          </div>
        </div>
        <div className="two-col" style={{ display: "grid", gap: 18 }}>
          <div>
            <label className="field-label"><TrendingUp size={12} style={{ verticalAlign: -2, marginRight: 5 }} />事業フェーズ</label>
            <select className="field-select" value={form.phase} onChange={set("phase")}>
              <option>シード</option><option>プレシリーズA</option><option>シリーズA</option><option>シリーズB以降</option>
            </select>
          </div>
          <div>
            <label className="field-label">直近ARR / 売上規模</label>
            <select className="field-select" value={form.revenue} onChange={set("revenue")}>
              <option>〜1億円</option><option>1〜3億円</option><option>3〜10億円</option><option>10億円〜</option>
            </select>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <button className="btn-primary" disabled={!valid} onClick={() => onNext(form)}>
          AI課題診断を始める<ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div style={{ display: "inline-flex", gap: 4, alignItems: "center", background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: "4px 14px 14px 14px", padding: "12px 16px" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="pulse-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: COLORS.teal, animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company flow — Step 2: AI dialogue (real API calls to /api/diagnosis/*)
// ---------------------------------------------------------------------------
function StepDialog({ companyForm, onNext }) {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]); // [{q, a, axis}]
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [typing, setTyping] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const scrollRef = useRef(null);
  const startedRef = useRef(false);
  const companyIdRef = useRef(null);
  const sessionIdRef = useRef(null);
  const turnIdRef = useRef(null);

  const fetchNextQuestion = async (h) => {
    setTyping(true);
    setErrorMsg(null);
    try {
      const isFirst = h.length === 0;
      const result = isFirst
        ? await postJSON("/api/diagnosis/start", { companyForm })
        : await postJSON("/api/diagnosis/answer", {
            companyForm,
            history: h,
            companyId: companyIdRef.current,
            sessionId: sessionIdRef.current,
            turnId: turnIdRef.current,
          });

      if (isFirst) {
        if (result.companyId) companyIdRef.current = result.companyId;
        if (result.sessionId) sessionIdRef.current = result.sessionId;
      }
      if (result.turnId) turnIdRef.current = result.turnId;

      if (result.done) {
        setMessages((m) => [...m, { from: "ai", text: result.summary || "回答内容をもとに、10軸でスキルマップを生成します。" }]);
        setTyping(false);
        setTimeout(() => onNext(result.scores, result.summary, result.axisNotes), 900);
        return;
      }
      setMessages((m) => [...m, { from: "ai", text: result.question }]);
      setCurrentQuestion({ question: result.question, options: (result.options || []).slice(0, 3), axis: result.axis || null });
    } catch (e) {
      setErrorMsg("AIとの通信に失敗しました。もう一度お試しください。");
    } finally {
      setTyping(false);
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    fetchNextQuestion([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const answer = (opt) => {
    setMessages((m) => [...m, { from: "user", text: opt }]);
    const newHistory = [...history, { q: currentQuestion.question, a: opt, axis: currentQuestion.axis }];
    setHistory(newHistory);
    setCurrentQuestion(null);
    fetchNextQuestion(newHistory);
  };

  const showOptions = !typing && currentQuestion && !errorMsg;

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: "0 0 6px" }}>
        {companyForm.name || "貴社"} の課題をAIが対話形式で特定しています
      </h1>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 24px" }}>
        質問 {Math.min(history.length + 1, MAX_DIALOG_TURNS)} / {MAX_DIALOG_TURNS}
      </p>
      <div ref={scrollRef} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 24, height: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m, i) => (
          <div key={i} className="fade-in" style={{ display: "flex", justifyContent: m.from === "ai" ? "flex-start" : "flex-end" }}>
            {m.from === "ai" && (
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: COLORS.tealDim, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0 }}>
                <Sparkles size={12} color={COLORS.teal} />
              </div>
            )}
            <div style={{ maxWidth: "78%", background: m.from === "ai" ? COLORS.surfaceRaised : COLORS.teal, color: m.from === "ai" ? COLORS.text : COLORS.onAccent, border: m.from === "ai" ? `1px solid ${COLORS.border}` : "none", borderRadius: m.from === "ai" ? "4px 14px 14px 14px" : "14px 4px 14px 14px", padding: "11px 15px", fontSize: 14, lineHeight: 1.6 }}>
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: COLORS.tealDim, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0 }}>
              <Sparkles size={12} color={COLORS.teal} />
            </div>
            <TypingBubble />
          </div>
        )}
      </div>
      <ErrorNote message={errorMsg} onRetry={() => fetchNextQuestion(history)} />
      <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 10 }}>
        {showOptions && currentQuestion.options.map((opt) => (
          <button key={opt} className="btn-ghost" onClick={() => answer(opt)}>{opt}</button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company flow — Step 3: skill map result
// ---------------------------------------------------------------------------
function StepSkillMap({ scores, summary, axisNotes, onNext }) {
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const duration = 1400;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setRevealed(true), 200);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const IDEAL_SCORE = 75; // 「大きな課題ではない」目安ラインとしての参考値
  const data = AXES.map((a) => ({ axis: a.label, score: Math.round(scores[a.key] * progress), ideal: IDEAL_SCORE * progress }));
  const allAxes = AXES.map((a) => ({ ...a, score: scores[a.key], note: axisNotes?.[a.key] || "" })).sort((a, b) => a.score - b.score);
  const bottlenecks = allAxes.slice(0, 3);

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: "0 0 6px" }}>10軸スキルマップ</h1>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 28px" }}>
        {summary || "対話結果から算出した、成長を阻む要因のスコアです。スコアが低い軸ほど優先度の高いボトルネックです。"}
      </p>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 8px", height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke={COLORS.border} />
            <PolarAngleAxis dataKey="axis" tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: FONT_BODY }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickCount={5} />
            <Radar dataKey="ideal" stroke={COLORS.amber} fill="none" strokeWidth={1.5} strokeDasharray="4 3" isAnimationActive={false} />
            <Radar dataKey="score" stroke={COLORS.teal} fill={COLORS.teal} fillOpacity={0.28} strokeWidth={2} isAnimationActive={false} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 11.5, color: COLORS.muted, marginTop: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS.teal, display: "inline-block" }} /> 現状
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 2, background: COLORS.amber, display: "inline-block" }} /> 目標とする状態(目安)
        </span>
      </div>
      {revealed && (
        <div className="fade-in" style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.04em", marginBottom: 10 }}>特に優先度の高いボトルネック</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {bottlenecks.map((b) => (
              <div key={b.key} style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{b.label}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 20, color: COLORS.amber, marginBottom: b.note ? 8 : 0 }}>
                  {b.score}<span style={{ fontSize: 11, color: COLORS.faint }}> /100</span>
                </div>
                {b.note && <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.6 }}>{b.note}</div>}
              </div>
            ))}
          </div>

          <button
            className="btn-ghost"
            onClick={() => setShowAll((v) => !v)}
            style={{ marginTop: 16, fontSize: 12.5 }}
          >
            {showAll ? "詳細分析を閉じる" : "10軸すべての詳細分析を見る"}
          </button>

          {showAll && (
            <div className="fade-in" style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {allAxes.map((a) => (
                <div key={a.key} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 16, color: a.score < 40 ? COLORS.amber : COLORS.text, minWidth: 42 }}>{a.score}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{a.label}</div>
                    <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.6 }}>{a.note || "(分析コメントなし)"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28 }}>
            <button className="btn-primary" onClick={onNext}>最適な人材を見る<ArrowRight size={15} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company flow — Step 4: talent proposal (fetches /api/match/company)
// ---------------------------------------------------------------------------
function StepTalentProposal({ companyScores, companyPhase, onRestart, onOpenThread }) {
  const [candidates, setCandidates] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [connectingId, setConnectingId] = useState(null);

  const load = async () => {
    setErrorMsg(null);
    setCandidates(null);
    try {
      const result = await postJSON("/api/match/company", { companyScores, companyPhase });
      setCandidates(result.candidates);
    } catch (e) {
      setErrorMsg("マッチング結果の取得に失敗しました。");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const connect = async (t) => {
    setConnectingId(t.id);
    try {
      const result = await postJSON("/api/matches/connect", { talentSkillMapId: t.talentSkillMapId });
      onOpenThread(result.matchId, result.counterpartName);
    } catch (e) {
      setErrorMsg("メッセージの開始に失敗しました。");
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: "0 0 6px" }}>課題に根拠付けされた人材提案</h1>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 28px" }}>
        優先度の高いボトルネックに対して、実務経験に基づいた伴走人材を提案します。月10時間単位で現場に関与します。
      </p>

      {errorMsg && <ErrorNote message={errorMsg} onRetry={load} />}
      {!candidates && !errorMsg && <div style={{ color: COLORS.muted, fontSize: 13 }}>マッチングを計算中…</div>}
      {candidates && candidates.length === 0 && (
        <div style={{ color: COLORS.muted, fontSize: 13 }}>現在提案できる候補がいません(稼働上限に達している、または登録人材がまだいません)。</div>
      )}

      {candidates && candidates.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {candidates.map((t) => (
            <div key={t.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, display: "flex", gap: 18, alignItems: "flex-start" }}>
              <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.tealDim}, ${COLORS.surfaceRaised})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, flexShrink: 0, border: `1px solid ${COLORS.border}` }}>
                {t.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15.5 }}>{t.name}</span>
                  <span style={{ fontSize: 11, background: "rgba(27,58,99,0.12)", color: COLORS.amber, border: "1px solid rgba(27,58,99,0.35)", borderRadius: 6, padding: "2px 8px", fontFamily: FONT_MONO }}>適合度 {t.match}%</span>
                </div>
                <div style={{ fontSize: 13, color: COLORS.muted, margin: "3px 0 12px" }}>{t.role}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.7, color: COLORS.text, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 13px", marginBottom: 12 }}>{t.reason}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.muted }}><BadgeCheck size={13} color={COLORS.teal} /> 対応領域: {t.axis}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.muted }}><Clock size={13} color={COLORS.teal} /> 月10時間〜</span>
                </div>
                <button className="btn-ghost" disabled={connectingId === t.id} onClick={() => connect(t)}>
                  <Send size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
                  {connectingId === t.id ? "接続中…" : "メッセージを送る"}
                </button>
              </div>
              <ChevronRight size={18} color={COLORS.faint} style={{ marginTop: 6, flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 30 }}>
        <button className="btn-ghost" onClick={onRestart}>最初からやり直す</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Talent flow — Step 1: career input
// ---------------------------------------------------------------------------
const TALENT_TITLE_GROUPS = [
  {
    label: "責任者・エグゼクティブクラス",
    options: [
      "元プロダクト責任者 / VPoP",
      "元セールス責任者 / VPoS",
      "元マーケティング責任者 / CMO",
      "元人事責任者 / CHRO・HRBP",
      "元CFO / 資金調達責任者",
      "元経営企画責任者 / 管理会計責任者",
      "元カスタマーサクセス責任者",
      "元オペレーション責任者 / COO",
      "元CTO / VPoE",
      "元事業責任者 / PL管掌",
    ],
  },
  {
    label: "マネージャー・リードクラス",
    options: [
      "元プロダクトマネージャー",
      "元セールスマネージャー / フィールドセールス",
      "元マーケティングマネージャー / グロース担当",
      "元人事マネージャー / 採用担当",
      "元経理・財務マネージャー",
      "元カスタマーサクセスマネージャー",
      "元業務改善マネージャー / PMO",
      "元テックリード / シニアエンジニア",
      "元デザインリード / UXデザイナー",
      "元インサイドセールス / SDRマネージャー",
    ],
  },
  {
    label: "その他",
    options: ["その他(自由入力)"],
  },
];
const TALENT_INDUSTRY_OPTIONS = [
  "SaaS / 業務効率化",
  "フィンテック",
  "ヘルスケア",
  "D2C / EC",
  "人材 / HRテック",
  "不動産 / 建設",
  "製造 / メーカー",
  "小売 / 流通",
  "教育",
  "メディア / エンタメ",
  "コンサルティング / 専門サービス",
  "その他(自由入力)",
];

function StepTalentInput({ onNext }) {
  const [form, setForm] = useState({
    name: "",
    title: TALENT_TITLE_GROUPS[0].options[3],
    titleOther: "",
    industry: TALENT_INDUSTRY_OPTIONS[0],
    industryOther: "",
    years: "15年以上",
    summary: "",
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.name.trim().length > 0;

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 27, fontWeight: 600, margin: "0 0 8px" }}>まず、これまでのご経歴を教えてください</h1>
      <p style={{ color: COLORS.muted, fontSize: 14.5, lineHeight: 1.7, margin: "0 0 32px" }}>
        職務経歴書やプロジェクト実績をもとに、AIがあなた専用の10軸スキルマップを無料で生成します。
      </p>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 28 }}>
        <div style={{ marginBottom: 20 }}>
          <label className="field-label">お名前</label>
          <input className="field-input" placeholder="例: 山田 太郎" value={form.name} onChange={set("name")} />
        </div>
        <div className="two-col" style={{ display: "grid", gap: 18, marginBottom: 20 }}>
          <div>
            <label className="field-label">直近の役職</label>
            <select className="field-select" value={form.title} onChange={set("title")}>
              {TALENT_TITLE_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map((o) => <option key={o}>{o}</option>)}
                </optgroup>
              ))}
            </select>
            {form.title === "その他(自由入力)" && (
              <input
                className="field-input"
                style={{ marginTop: 8 }}
                placeholder="役職を入力してください"
                value={form.titleOther}
                onChange={set("titleOther")}
              />
            )}
          </div>
          <div>
            <label className="field-label">実務経験年数</label>
            <select className="field-select" value={form.years} onChange={set("years")}>
              <option>5〜10年</option><option>10〜15年</option><option>15年以上</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="field-label">主な業種・事業ドメインの経験</label>
          <select className="field-select" value={form.industry} onChange={set("industry")}>
            {TALENT_INDUSTRY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
          {form.industry === "その他(自由入力)" && (
            <input
              className="field-input"
              style={{ marginTop: 8 }}
              placeholder="業種を入力してください"
              value={form.industryOther}
              onChange={set("industryOther")}
            />
          )}
        </div>
        <div>
          <label className="field-label">職務経歴・プロジェクト実績(任意)</label>
          <textarea className="field-input" rows={4} placeholder="例: 大手人材会社にて採用〜組織開発を10年担当。急拡大期の新卒・中途採用基準の設計と定着施策を主導…" style={{ resize: "vertical", fontFamily: FONT_BODY, lineHeight: 1.6 }} value={form.summary} onChange={set("summary")} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <button
          className="btn-primary"
          disabled={!valid}
          onClick={() =>
            onNext({
              name: form.name,
              title: form.title === "その他(自由入力)" ? form.titleOther || "その他" : form.title,
              industry: form.industry === "その他(自由入力)" ? form.industryOther || "その他" : form.industry,
              years: form.years,
              summary: form.summary,
            })
          }
        >
          スキルマップを生成する<ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Talent flow — Step 2: analyzing (real API call to /api/talent/analyze)
// ---------------------------------------------------------------------------
function StepTalentAnalyzing({ talentForm, onNext }) {
  const [idx, setIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    if (errorMsg) return;
    const t = setTimeout(() => setIdx((i) => Math.min(i + 1, ANALYZING_STEPS.length)), 650);
    return () => clearTimeout(t);
  }, [idx, errorMsg]);

  const run = () => {
    const runId = ++runIdRef.current;
    setErrorMsg(null);
    setIdx(0);
    const minDelay = new Promise((res) => setTimeout(res, ANALYZING_STEPS.length * 650 + 400));
    const call = postJSON("/api/talent/analyze", { talentForm });

    Promise.all([call, minDelay])
      .then(([result]) => {
        if (runIdRef.current === runId) onNext(result);
      })
      .catch(() => {
        if (runIdRef.current === runId) setErrorMsg("AIとの通信に失敗しました。もう一度お試しください。");
      });
  };

  useEffect(() => { run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="fade-in" style={{ maxWidth: 460, margin: "60px auto 0", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 28px", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}` }}>
        <Sparkles size={24} color={COLORS.teal} className="pulse-dot" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {ANALYZING_STEPS.map((s, i) => (
          <div key={s} style={{ fontSize: 13.5, fontFamily: FONT_MONO, color: i < idx ? COLORS.teal : i === idx ? COLORS.text : COLORS.faint, opacity: i <= idx ? 1 : 0.4, transition: "opacity 0.3s ease, color 0.3s ease" }}>
            {i < idx ? "✓ " : i === idx ? "› " : "  "}{s}
          </div>
        ))}
      </div>
      {errorMsg && (
        <div style={{ marginTop: 20 }}>
          <ErrorNote message={errorMsg} onRetry={run} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Talent flow — Step 3: skill map result
// ---------------------------------------------------------------------------
function StepTalentSkillMap({ name, scores, fit, onNext }) {
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const duration = 1400;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setRevealed(true), 200);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const data = AXES.map((a) => ({ axis: a.label, score: Math.round(scores[a.key] * progress), full: 30 }));
  const strengths = AXES.map((a) => ({ ...a, score: scores[a.key] })).sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: "0 0 6px" }}>{name || "あなた"}のスキルマップ</h1>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 28px" }}>
        10軸・各30点満点でスコア化しています。スコアが高い軸ほど、実績として強く裏付けられた強みです。
        {fit.fallback && <span style={{ color: COLORS.amber, display: "block", marginTop: 6, fontSize: 12.5 }}>※ AIとの通信に失敗したため、参考値で表示しています</span>}
      </p>

      {fit.talentStatus === "pending" && (
        <div style={{ background: "rgba(27,58,99,0.08)", border: `1px solid ${COLORS.amber}`, borderRadius: 10, padding: "12px 16px", fontSize: 12.5, color: COLORS.text, marginBottom: 20 }}>
          現在、運営による審査中です。承認されるまでは企業への提案候補には表示されません。
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {TALENT_SCORE_RUBRIC.map((r) => (
          <span
            key={r.range}
            style={{
              fontSize: 11.5,
              color: COLORS.muted,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: "5px 10px",
            }}
          >
            <span style={{ fontFamily: FONT_MONO, color: COLORS.teal }}>{r.range}点</span> — {r.label}
          </span>
        ))}
      </div>

      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 8px", height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke={COLORS.border} />
            <PolarAngleAxis dataKey="axis" tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: FONT_BODY }} />
            <PolarRadiusAxis domain={[0, 30]} tick={false} axisLine={false} tickCount={4} />
            <Radar dataKey="score" stroke={COLORS.amber} fill={COLORS.amber} fillOpacity={0.28} strokeWidth={2} isAnimationActive={false} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {revealed && (
        <div className="fade-in" style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.04em", marginBottom: 10 }}>強みとして特に高いスコアの軸</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            {strengths.map((s) => (
              <div key={s.key} style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 20, color: COLORS.teal }}>{s.score}<span style={{ fontSize: 11, color: COLORS.faint }}> /30</span></div>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(244,105,25,0.06)", border: `1px solid ${COLORS.tealDim}`, borderRadius: 10, padding: "16px 18px", marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: COLORS.teal, marginBottom: 6, letterSpacing: "0.03em" }}>適性のある企業フェーズ / 課題</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {[...(fit.phases || []), ...(fit.bottlenecks || [])].map((tag) => (
                <span key={tag} style={{ fontSize: 11.5, fontFamily: FONT_MONO, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 9px", color: COLORS.muted }}>{tag}</span>
              ))}
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: 0, color: COLORS.text }}>{fit.summary}</p>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <button className="btn-primary" onClick={onNext}>マッチする企業を見る<ArrowRight size={15} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Talent flow — Step 4: matched companies (fetches /api/match/talent)
// ---------------------------------------------------------------------------
function StepTalentMatches({ talentScores, talentPhases, onRestart, onOpenThread }) {
  const [candidates, setCandidates] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [connectingId, setConnectingId] = useState(null);

  const load = async () => {
    setErrorMsg(null);
    setCandidates(null);
    try {
      const result = await postJSON("/api/match/talent", { talentScores, talentPhases });
      setCandidates(result.candidates);
    } catch (e) {
      setErrorMsg("マッチング結果の取得に失敗しました。");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const connect = async (c) => {
    setConnectingId(c.id);
    try {
      const result = await postJSON("/api/matches/connect", { companySkillMapId: c.companySkillMapId });
      onOpenThread(result.matchId, result.counterpartName);
    } catch (e) {
      setErrorMsg("メッセージの開始に失敗しました。");
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: "0 0 6px" }}>スキルマップに基づく企業マッチング</h1>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 28px" }}>あなたのスキルマップと各社の課題スキルマップを照合し、適合度の高い企業を提示しています。</p>

      {errorMsg && <ErrorNote message={errorMsg} onRetry={load} />}
      {!candidates && !errorMsg && <div style={{ color: COLORS.muted, fontSize: 13 }}>マッチングを計算中…</div>}

      {candidates && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {candidates.map((c) => (
            <div key={c.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, display: "flex", gap: 18, alignItems: "flex-start" }}>
              <div style={{ width: 46, height: 46, borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.tealDim}, ${COLORS.surfaceRaised})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, flexShrink: 0, border: `1px solid ${COLORS.border}` }}>
                {c.name[3]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15.5 }}>{c.name}</span>
                  <span style={{ fontSize: 11, background: "rgba(27,58,99,0.12)", color: COLORS.amber, border: "1px solid rgba(27,58,99,0.35)", borderRadius: 6, padding: "2px 8px", fontFamily: FONT_MONO }}>適合度 {c.match}%</span>
                </div>
                <div style={{ fontSize: 13, color: COLORS.muted, margin: "3px 0 12px" }}>{c.phase}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.7, color: COLORS.text, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 13px", marginBottom: 12 }}>{c.reason}</div>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.muted, width: "fit-content", marginBottom: 12 }}><BadgeCheck size={13} color={COLORS.teal} /> 優先課題: {c.bottleneck}</span>
                <div>
                  <button className="btn-ghost" disabled={connectingId === c.id} onClick={() => connect(c)}>
                    <Send size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
                    {connectingId === c.id ? "接続中…" : "メッセージを送る"}
                  </button>
                </div>
              </div>
              <ChevronRight size={18} color={COLORS.faint} style={{ marginTop: 6, flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 30 }}>
        <button className="btn-ghost" onClick={onRestart}>最初からやり直す</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Messaging — DM between company users and talent users, scoped to a Match
// ---------------------------------------------------------------------------
function MessageThread({ matchId, counterpartName: initialName, onBack }) {
  const [messages, setMessages] = useState(null);
  const [counterpartName, setCounterpartName] = useState(initialName || "");
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const pollRef = useRef(null);

  const load = async (silent) => {
    if (!silent) setErrorMsg(null);
    try {
      const res = await fetch(`/api/messages?matchId=${matchId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "取得に失敗しました");
      setMessages(data.messages);
      if (data.counterpartName) setCounterpartName(data.counterpartName);
    } catch (e) {
      if (!silent) setErrorMsg("メッセージの取得に失敗しました。");
    }
  };

  useEffect(() => {
    load(false);
    pollRef.current = setInterval(() => load(true), 5000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    setErrorMsg(null);
    try {
      await postJSON("/api/messages", { matchId, body: text.trim() });
      setText("");
      await load(true);
    } catch (e) {
      setErrorMsg("送信に失敗しました。");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fade-in">
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← 戻る</button>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, margin: "0 0 20px" }}>{counterpartName}とのメッセージ</h1>

      <div
        ref={scrollRef}
        style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, height: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}
      >
        {messages === null && <div style={{ color: COLORS.muted, fontSize: 13 }}>読み込み中…</div>}
        {messages && messages.length === 0 && <div style={{ color: COLORS.muted, fontSize: 13 }}>まだメッセージはありません。最初のメッセージを送ってみましょう。</div>}
        {messages && messages.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.mine ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "75%", background: m.mine ? COLORS.teal : COLORS.surfaceRaised, color: m.mine ? COLORS.onAccent : COLORS.text, border: m.mine ? "none" : `1px solid ${COLORS.border}`, borderRadius: m.mine ? "14px 4px 14px 14px" : "4px 14px 14px 14px", padding: "10px 14px", fontSize: 13.5, lineHeight: 1.6 }}>
              {m.body}
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, fontFamily: FONT_MONO }}>
                {new Date(m.createdAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <ErrorNote message={errorMsg} onRetry={() => load(false)} />

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <input
          className="field-input"
          placeholder="メッセージを入力…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button className="btn-primary" disabled={sending || !text.trim()} onClick={send}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

function Inbox({ onOpenThread, onBack }) {
  const [threads, setThreads] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const load = async () => {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/messages/threads");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setThreads(data.threads);
    } catch (e) {
      setErrorMsg("スレッド一覧の取得に失敗しました。");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="fade-in">
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← 戻る</button>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, margin: "0 0 20px" }}>メッセージ</h1>

      <ErrorNote message={errorMsg} onRetry={load} />
      {threads === null && !errorMsg && <div style={{ color: COLORS.muted, fontSize: 13 }}>読み込み中…</div>}
      {threads && threads.length === 0 && <div style={{ color: COLORS.muted, fontSize: 13 }}>まだ会話がありません。候補一覧から「メッセージを送る」で始められます。</div>}

      {threads && threads.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {threads.map((t) => (
            <button
              key={t.matchId}
              onClick={() => onOpenThread(t.matchId, t.counterpartName)}
              style={{ textAlign: "left", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16, cursor: "pointer", color: COLORS.text }}
            >
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 14.5, marginBottom: 4 }}>{t.counterpartName}</div>
              {t.lastMessage && <div style={{ fontSize: 12.5, color: COLORS.muted }}>{t.lastMessage.body}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// マイページ — 既に診断/解析済みのアカウントが再ログインした際に表示する。
// 以前は再ログインのたびに入力フォームへ戻ってしまっていたため新設した。
// ---------------------------------------------------------------------------
function MyPageCompany({ profile, onProceed, onRediagnose }) {
  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: COLORS.muted }}>
          前回の診断結果({new Date(profile.diagnosedAt).toLocaleDateString("ja-JP")})
        </span>
        <button className="btn-ghost" onClick={onRediagnose} style={{ fontSize: 12, padding: "6px 12px" }}>もう一度AI診断を受け直す</button>
      </div>
      <StepSkillMap scores={profile.scores} summary={profile.summary} axisNotes={profile.axisNotes} onNext={onProceed} />
    </div>
  );
}

function MyPageTalent({ profile, onProceed, onRediagnose }) {
  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: COLORS.muted }}>
          前回の解析結果({new Date(profile.diagnosedAt).toLocaleDateString("ja-JP")})
          {profile.status === "pending" && <span style={{ color: COLORS.amber, marginLeft: 8 }}>審査中</span>}
        </span>
        <button className="btn-ghost" onClick={onRediagnose} style={{ fontSize: 12, padding: "6px 12px" }}>スキルマップを更新する</button>
      </div>
      <StepTalentSkillMap
        name={profile.talentForm?.name}
        scores={profile.scores}
        fit={{ phases: profile.phases, bottlenecks: profile.bottlenecks, summary: profile.summary }}
        onNext={onProceed}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const COMPANY_STEPS = ["企業情報", "AI課題診断", "スキルマップ", "人材提案"];
const TALENT_STEPS = ["経歴入力", "AI解析", "スキルマップ", "企業マッチング"];

function HeaderActions({ onOpenInbox }) {
  return (
    <>
      <button className="btn-ghost" onClick={onOpenInbox} style={{ padding: "6px 12px" }}>
        <Send size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
        メッセージ
      </button>
      <form action="/api/auth/logout" method="POST" onSubmit={async (e) => { e.preventDefault(); await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}>
        <button type="submit" className="btn-ghost" style={{ padding: "6px 12px" }}>ログアウト</button>
      </form>
    </>
  );
}

export default function Home() {
  const [authState, setAuthState] = useState({ loading: true, user: null });
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState({ name: "" });
  const [companyResult, setCompanyResult] = useState({ scores: null, summary: null, axisNotes: null });
  const [talent, setTalent] = useState({ name: "" });
  const [talentResult, setTalentResult] = useState({ scores: null, phases: [], bottlenecks: [], summary: null, fallback: false });
  const [view, setView] = useState("flow"); // "flow" | "mypage" | "inbox" | "thread"
  const [activeThread, setActiveThread] = useState(null); // { matchId, counterpartName }
  const [profile, setProfile] = useState({ loading: true, data: null });
  const initializedViewRef = useRef(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setAuthState({ loading: false, user: data.user }))
      .catch(() => setAuthState({ loading: false, user: null }));
  }, []);

  useEffect(() => {
    if (!authState.user || authState.user.role === "admin") return;
    fetch("/api/me/profile")
      .then((r) => r.json())
      .then((data) => setProfile({ loading: false, data }))
      .catch(() => setProfile({ loading: false, data: null }));
  }, [authState.user]);

  // 既存のスキルマップがあるアカウントは、初回表示時だけ自動的にマイページを開く
  // (以降、ユーザー自身が「もう一度診断する」等で明示的に画面遷移した場合は上書きしない)
  useEffect(() => {
    if (initializedViewRef.current) return;
    if (profile.loading) return;
    if (profile.data?.hasData) {
      setView("mypage");
    }
    initializedViewRef.current = true;
  }, [profile]);

  const reset = () => { setStep(1); setView("flow"); };
  const openThread = (matchId, counterpartName) => { setActiveThread({ matchId, counterpartName }); setView("thread"); };
  const openInbox = () => setView("inbox");
  const backToFlow = () => setView("flow");

  const goToMyPage = () => setView("mypage");

  const rediagnoseCompany = () => {
    if (profile.data?.companyForm) setCompany(profile.data.companyForm);
    setStep(1);
    setView("flow");
  };
  const proceedFromMyPageCompany = () => {
    setCompanyResult({ scores: profile.data.scores, summary: profile.data.summary, axisNotes: profile.data.axisNotes });
    setStep(4);
    setView("flow");
  };
  const rediagnoseTalent = () => {
    if (profile.data?.talentForm) setTalent(profile.data.talentForm);
    setStep(1);
    setView("flow");
  };
  const proceedFromMyPageTalent = () => {
    setTalentResult({ scores: profile.data.scores, phases: profile.data.phases, bottlenecks: profile.data.bottlenecks, summary: profile.data.summary, fallback: false });
    setStep(4);
    setView("flow");
  };

  if (authState.loading) return <LoadingScreen />;
  if (!authState.user) return <AuthGate />;
  if (authState.user.role === "admin") {
    if (typeof window !== "undefined") window.location.href = "/admin";
    return <LoadingScreen />;
  }
  if (profile.loading) return <LoadingScreen />;

  const mode = authState.user.role; // "company" | "talent"
  const steps = mode === "company" ? COMPANY_STEPS : TALENT_STEPS;
  const headerRight = (
    <>
      {profile.data?.hasData && view !== "mypage" && (
        <button className="btn-ghost" onClick={goToMyPage} style={{ padding: "6px 12px" }}>マイページ</button>
      )}
      <HeaderActions onOpenInbox={openInbox} />
    </>
  );

  if (view === "mypage" && profile.data?.hasData) {
    return (
      <Shell step={step} steps={null} headerRight={headerRight}>
        {mode === "company" ? (
          <MyPageCompany profile={profile.data} onProceed={proceedFromMyPageCompany} onRediagnose={rediagnoseCompany} />
        ) : (
          <MyPageTalent profile={profile.data} onProceed={proceedFromMyPageTalent} onRediagnose={rediagnoseTalent} />
        )}
      </Shell>
    );
  }

  if (view === "inbox") {
    return (
      <Shell step={step} steps={steps} headerRight={headerRight}>
        <Inbox onOpenThread={openThread} onBack={backToFlow} />
      </Shell>
    );
  }
  if (view === "thread" && activeThread) {
    return (
      <Shell step={step} steps={steps} headerRight={headerRight}>
        <MessageThread matchId={activeThread.matchId} counterpartName={activeThread.counterpartName} onBack={backToFlow} />
      </Shell>
    );
  }

  if (mode === "company") {
    return (
      <Shell step={step} steps={COMPANY_STEPS} headerRight={headerRight}>
        {step === 1 && <StepCompany onNext={(form) => { setCompany(form); setStep(2); }} />}
        {step === 2 && (
          <StepDialog
            companyForm={company}
            onNext={(scores, summary, axisNotes) => { setCompanyResult({ scores, summary, axisNotes }); setStep(3); }}
          />
        )}
        {step === 3 && <StepSkillMap scores={companyResult.scores} summary={companyResult.summary} axisNotes={companyResult.axisNotes} onNext={() => setStep(4)} />}
        {step === 4 && (
          <StepTalentProposal companyScores={companyResult.scores} companyPhase={company.phase} onRestart={reset} onOpenThread={openThread} />
        )}
      </Shell>
    );
  }

  return (
    <Shell step={step} steps={TALENT_STEPS} headerRight={headerRight}>
      {step === 1 && <StepTalentInput onNext={(form) => { setTalent(form); setStep(2); }} />}
      {step === 2 && (
        <StepTalentAnalyzing
          talentForm={talent}
          onNext={(result) => { setTalentResult({ ...result, fallback: false }); setStep(3); }}
        />
      )}
      {step === 3 && <StepTalentSkillMap name={talent.name} scores={talentResult.scores} fit={talentResult} onNext={() => setStep(4)} />}
      {step === 4 && (
        <StepTalentMatches talentScores={talentResult.scores} talentPhases={talentResult.phases} onRestart={reset} onOpenThread={openThread} />
      )}
    </Shell>
  );
}
