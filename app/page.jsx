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
  Activity,
  Clock,
  BadgeCheck,
  ChevronRight,
} from "lucide-react";
import { AXES } from "@/lib/axes";

// ---------------------------------------------------------------------------
// Design tokens (BeFree_技術構成設計.md / プロトタイプと共通)
// ---------------------------------------------------------------------------
const COLORS = {
  bg: "#0B1220",
  surface: "#131B2E",
  surfaceRaised: "#1A2338",
  border: "#26304A",
  text: "#EDEFF5",
  muted: "#8B93A7",
  faint: "#5B6584",
  teal: "#4FD1C5",
  tealDim: "#2C6E68",
  amber: "#F2B84B",
};
const FONT_DISPLAY = "'Space Grotesk', sans-serif";
const FONT_BODY = "'Inter', sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";
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

// ---------------------------------------------------------------------------
// Shared UI bits
// ---------------------------------------------------------------------------
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; }
      .app-root { font-family: ${FONT_BODY}; background: ${COLORS.bg}; color: ${COLORS.text}; min-height: 100vh; width: 100%; position: relative; overflow-x: hidden; }
      .app-root::before {
        content: ""; position: absolute; inset: 0;
        background: radial-gradient(ellipse 900px 500px at 15% -10%, rgba(79,209,197,0.10), transparent 60%),
                    radial-gradient(ellipse 700px 500px at 100% 10%, rgba(242,184,75,0.06), transparent 60%);
        pointer-events: none;
      }
      .fade-in { animation: fadeIn 0.5s ease both; }
      @keyframes fadeIn { from { opacity:0; transform: translateY(6px);} to {opacity:1; transform:none;} }
      .pulse-dot { animation: pulseDot 1.6s ease-in-out infinite; }
      @keyframes pulseDot { 0%,100%{opacity:.35;} 50%{opacity:1;} }
      .btn-primary { background: ${COLORS.teal}; color: #06231F; font-family: ${FONT_DISPLAY}; font-weight: 600; border: none; border-radius: 8px; padding: 12px 22px; font-size: 14.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: transform 0.15s ease, box-shadow 0.15s ease; }
      .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,209,197,0.25); }
      .btn-primary:disabled { opacity: 0.35; cursor: not-allowed; transform:none; box-shadow:none; }
      .btn-ghost { background: transparent; color: ${COLORS.muted}; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 10px 16px; font-size: 13.5px; cursor: pointer; font-family: ${FONT_BODY}; transition: border-color 0.15s ease, color 0.15s ease; }
      .btn-ghost:hover { border-color: ${COLORS.teal}; color: ${COLORS.teal}; }
      .field-label { font-size: 12px; letter-spacing: 0.04em; color: ${COLORS.muted}; margin-bottom: 7px; display: block; font-family: ${FONT_BODY}; font-weight: 500; }
      .field-input, .field-select { width: 100%; background: ${COLORS.surfaceRaised}; border: 1px solid ${COLORS.border}; color: ${COLORS.text}; border-radius: 8px; padding: 11px 13px; font-size: 14px; font-family: ${FONT_BODY}; outline: none; transition: border-color 0.15s ease; }
      .field-input:focus, .field-select:focus { border-color: ${COLORS.teal}; }
      .field-input::placeholder { color: ${COLORS.faint}; }
      *:focus-visible { outline: 2px solid ${COLORS.teal}; outline-offset: 2px; }
      ::selection { background: rgba(79,209,197,0.3); }
    `}</style>
  );
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
                  color: done ? "#06231F" : active ? COLORS.teal : COLORS.faint,
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

function Shell({ children, step, steps, onLogoClick }) {
  return (
    <div className="app-root">
      <GlobalStyle />
      <div style={{ position: "relative", maxWidth: 880, margin: "0 auto", padding: "48px 24px 80px" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
          <div
            onClick={onLogoClick}
            style={{ width: 30, height: 30, borderRadius: 7, background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealDim})`, display: "flex", alignItems: "center", justifyContent: "center", cursor: onLogoClick ? "pointer" : "default" }}
          >
            <Activity size={16} color="#06231F" />
          </div>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, letterSpacing: "0.01em" }}>BEFREE DIAGNOSIS</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: COLORS.faint, border: `1px solid ${COLORS.border}`, borderRadius: 5, padding: "2px 7px", marginLeft: 4 }}>
            v0.1 (API接続版)
          </span>
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
function ModeSelect({ onSelect }) {
  return (
    <Shell step={0} steps={null}>
      <div className="fade-in" style={{ maxWidth: 640, margin: "40px auto 0" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 600, textAlign: "center", margin: "0 0 10px" }}>
          どちらの立場で利用しますか?
        </h1>
        <p style={{ color: COLORS.muted, fontSize: 14.5, textAlign: "center", margin: "0 0 40px" }}>
          企業の課題診断と実務経験者のスキルマップは、同じ10軸で照合される仕組みです
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <button
            onClick={() => onSelect("company")}
            style={{ textAlign: "left", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 26, cursor: "pointer", color: COLORS.text }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = COLORS.teal)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.border)}
          >
            <Building2 size={22} color={COLORS.teal} />
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16.5, margin: "14px 0 6px" }}>企業として使う</div>
            <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.7 }}>AIとの対話で課題を診断し、根拠付きで実務経験者の提案を受ける</div>
          </button>
          <button
            onClick={() => onSelect("talent")}
            style={{ textAlign: "left", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 26, cursor: "pointer", color: COLORS.text }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = COLORS.amber)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.border)}
          >
            <Users size={22} color={COLORS.amber} />
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16.5, margin: "14px 0 6px" }}>実務経験者として使う</div>
            <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.7 }}>職務経歴からスキルマップを無料で可視化し、伴走機会の提案を受ける</div>
          </button>
        </div>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
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
  const [history, setHistory] = useState([]); // [{q, a}]
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [typing, setTyping] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const scrollRef = useRef(null);
  const startedRef = useRef(false);

  const fetchNextQuestion = async (h) => {
    setTyping(true);
    setErrorMsg(null);
    try {
      const isFirst = h.length === 0;
      const result = isFirst
        ? await postJSON("/api/diagnosis/start", { companyForm })
        : await postJSON("/api/diagnosis/answer", { companyForm, history: h });

      if (result.done) {
        setMessages((m) => [...m, { from: "ai", text: result.summary || "回答内容をもとに、10軸でスキルマップを生成します。" }]);
        setTyping(false);
        setTimeout(() => onNext(result.scores, result.summary), 900);
        return;
      }
      setMessages((m) => [...m, { from: "ai", text: result.question }]);
      setCurrentQuestion({ question: result.question, options: (result.options || []).slice(0, 3) });
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
    const newHistory = [...history, { q: currentQuestion.question, a: opt }];
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
            <div style={{ maxWidth: "78%", background: m.from === "ai" ? COLORS.surfaceRaised : COLORS.teal, color: m.from === "ai" ? COLORS.text : "#06231F", border: m.from === "ai" ? `1px solid ${COLORS.border}` : "none", borderRadius: m.from === "ai" ? "4px 14px 14px 14px" : "14px 4px 14px 14px", padding: "11px 15px", fontSize: 14, lineHeight: 1.6 }}>
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
function StepSkillMap({ scores, summary, onNext }) {
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

  const data = AXES.map((a) => ({ axis: a.label, score: Math.round(scores[a.key] * progress), full: 100 }));
  const bottlenecks = AXES.map((a) => ({ ...a, score: scores[a.key] })).sort((a, b) => a.score - b.score).slice(0, 3);

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
            <Radar dataKey="score" stroke={COLORS.teal} fill={COLORS.teal} fillOpacity={0.28} strokeWidth={2} isAnimationActive={false} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {revealed && (
        <div className="fade-in" style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.04em", marginBottom: 10 }}>特に優先度の高いボトルネック</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {bottlenecks.map((b) => (
              <div key={b.key} style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{b.label}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 20, color: COLORS.amber }}>{b.score}<span style={{ fontSize: 11, color: COLORS.faint }}> /100</span></div>
              </div>
            ))}
          </div>
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
function StepTalentProposal({ companyScores, companyPhase, onRestart }) {
  const [candidates, setCandidates] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

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

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: "0 0 6px" }}>課題に根拠付けされた人材提案</h1>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 28px" }}>
        優先度の高いボトルネックに対して、実務経験に基づいた伴走人材を提案します。月10時間単位で現場に関与します。
      </p>

      {errorMsg && <ErrorNote message={errorMsg} onRetry={load} />}
      {!candidates && !errorMsg && <div style={{ color: COLORS.muted, fontSize: 13 }}>マッチングを計算中…</div>}

      {candidates && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {candidates.map((t) => (
            <div key={t.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, display: "flex", gap: 18, alignItems: "flex-start" }}>
              <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.tealDim}, ${COLORS.surfaceRaised})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, flexShrink: 0, border: `1px solid ${COLORS.border}` }}>
                {t.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15.5 }}>{t.name}</span>
                  <span style={{ fontSize: 11, background: "rgba(242,184,75,0.12)", color: COLORS.amber, border: "1px solid rgba(242,184,75,0.35)", borderRadius: 6, padding: "2px 8px", fontFamily: FONT_MONO }}>適合度 {t.match}%</span>
                </div>
                <div style={{ fontSize: 13, color: COLORS.muted, margin: "3px 0 12px" }}>{t.role}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.7, color: COLORS.text, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 13px", marginBottom: 12 }}>{t.reason}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.muted }}><BadgeCheck size={13} color={COLORS.teal} /> 対応領域: {t.axis}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.muted }}><Clock size={13} color={COLORS.teal} /> 月10時間〜</span>
                </div>
              </div>
              <ChevronRight size={18} color={COLORS.faint} style={{ marginTop: 6, flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30 }}>
        <button className="btn-ghost" onClick={onRestart}>最初からやり直す</button>
        <button className="btn-primary"><Send size={14} />この提案で相談する</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Talent flow — Step 1: career input
// ---------------------------------------------------------------------------
function StepTalentInput({ onNext }) {
  const [form, setForm] = useState({ name: "", title: "元人事責任者 / HRBP", years: "15年以上", summary: "" });
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
          <div>
            <label className="field-label">直近の役職</label>
            <select className="field-select" value={form.title} onChange={set("title")}>
              <option>元人事責任者 / HRBP</option><option>元CFO室 / 管理会計責任者</option><option>元セールスイネーブルメント責任者</option><option>元事業責任者 / PL管掌</option><option>元プロダクトマネージャー</option>
            </select>
          </div>
          <div>
            <label className="field-label">実務経験年数</label>
            <select className="field-select" value={form.years} onChange={set("years")}>
              <option>5〜10年</option><option>10〜15年</option><option>15年以上</option>
            </select>
          </div>
        </div>
        <div>
          <label className="field-label">職務経歴・プロジェクト実績(任意)</label>
          <textarea className="field-input" rows={4} placeholder="例: 大手人材会社にて採用〜組織開発を10年担当。急拡大期の新卒・中途採用基準の設計と定着施策を主導…" style={{ resize: "vertical", fontFamily: FONT_BODY, lineHeight: 1.6 }} value={form.summary} onChange={set("summary")} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <button className="btn-primary" disabled={!valid} onClick={() => onNext(form)}>スキルマップを生成する<ArrowRight size={15} /></button>
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
          <div style={{ background: "rgba(79,209,197,0.06)", border: `1px solid ${COLORS.tealDim}`, borderRadius: 10, padding: "16px 18px", marginBottom: 4 }}>
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
function StepTalentMatches({ talentScores, talentPhases, onRestart }) {
  const [candidates, setCandidates] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

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
                  <span style={{ fontSize: 11, background: "rgba(242,184,75,0.12)", color: COLORS.amber, border: "1px solid rgba(242,184,75,0.35)", borderRadius: 6, padding: "2px 8px", fontFamily: FONT_MONO }}>適合度 {c.match}%</span>
                </div>
                <div style={{ fontSize: 13, color: COLORS.muted, margin: "3px 0 12px" }}>{c.phase}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.7, color: COLORS.text, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 13px", marginBottom: 12 }}>{c.reason}</div>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.muted, width: "fit-content" }}><BadgeCheck size={13} color={COLORS.teal} /> 優先課題: {c.bottleneck}</span>
              </div>
              <ChevronRight size={18} color={COLORS.faint} style={{ marginTop: 6, flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30 }}>
        <button className="btn-ghost" onClick={onRestart}>最初からやり直す</button>
        <button className="btn-primary"><Send size={14} />興味のある企業に関心を伝える</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const COMPANY_STEPS = ["企業情報", "AI課題診断", "スキルマップ", "人材提案"];
const TALENT_STEPS = ["経歴入力", "AI解析", "スキルマップ", "企業マッチング"];

export default function Home() {
  const [mode, setMode] = useState(null);
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState({ name: "" });
  const [companyResult, setCompanyResult] = useState({ scores: null, summary: null });
  const [talent, setTalent] = useState({ name: "" });
  const [talentResult, setTalentResult] = useState({ scores: null, phases: [], bottlenecks: [], summary: null, fallback: false });

  const reset = () => { setMode(null); setStep(1); };

  if (!mode) return <ModeSelect onSelect={(m) => { setMode(m); setStep(1); }} />;

  if (mode === "company") {
    return (
      <Shell step={step} steps={COMPANY_STEPS} onLogoClick={reset}>
        {step === 1 && <StepCompany onNext={(form) => { setCompany(form); setStep(2); }} />}
        {step === 2 && (
          <StepDialog
            companyForm={company}
            onNext={(scores, summary) => { setCompanyResult({ scores, summary }); setStep(3); }}
          />
        )}
        {step === 3 && <StepSkillMap scores={companyResult.scores} summary={companyResult.summary} onNext={() => setStep(4)} />}
        {step === 4 && <StepTalentProposal companyScores={companyResult.scores} companyPhase={company.phase} onRestart={reset} />}
      </Shell>
    );
  }

  return (
    <Shell step={step} steps={TALENT_STEPS} onLogoClick={reset}>
      {step === 1 && <StepTalentInput onNext={(form) => { setTalent(form); setStep(2); }} />}
      {step === 2 && (
        <StepTalentAnalyzing
          talentForm={talent}
          onNext={(result) => { setTalentResult({ ...result, fallback: false }); setStep(3); }}
        />
      )}
      {step === 3 && <StepTalentSkillMap name={talent.name} scores={talentResult.scores} fit={talentResult} onNext={() => setStep(4)} />}
      {step === 4 && <StepTalentMatches talentScores={talentResult.scores} talentPhases={talentResult.phases} onRestart={reset} />}
    </Shell>
  );
}
