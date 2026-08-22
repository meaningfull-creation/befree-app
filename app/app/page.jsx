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
  Settings,
  ClipboardList,
} from "lucide-react";
import { AXES, TALENT_SCORE_RUBRIC } from "@/lib/axes";
import { computeScoreDelta } from "@/lib/scoreDelta";
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
export async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `request failed: ${url}`);
  return data;
}

async function postPatch(url, body) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `request failed: ${url}`);
  return data;
}

export function ProgressRail({ step, steps }) {
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

export function Shell({ children, step, steps, headerRight }) {
  return (
    <div className="app-root">
      <GlobalStyle />
      <div style={{ position: "relative", maxWidth: 880, margin: "0 auto", padding: "48px 24px 80px" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
          <img src="/logo.png" alt="BATTER BOX" style={{ height: 34, width: "auto" }} />
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

export function ErrorNote({ message, onRetry }) {
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
// 企業・人材フォーム共通の選択肢(共有の単一ソース)。「よくある形」に合わせて広めに用意している。
const INDUSTRY_OPTIONS = [
  "IT・インターネット・通信",
  "ソフトウェア・SaaS",
  "フィンテック・金融",
  "ヘルスケア・医療",
  "バイオ・製薬",
  "D2C・EC・小売",
  "製造業・メーカー",
  "建設・不動産",
  "運輸・物流",
  "エネルギー・インフラ",
  "農業・食品",
  "人材・HRテック",
  "教育・EdTech",
  "メディア・エンタメ・広告",
  "コンサルティング・専門サービス",
  "官公庁・自治体・公共",
  "非営利・NPO",
  "旅行・宿泊・飲食",
  "美容・ファッション",
  "スポーツ・フィットネス",
  "その他(自由入力)",
];
const HEADCOUNT_OPTIONS = ["1〜5名", "6〜10名", "11〜30名", "31〜50名", "51〜100名", "101〜300名", "301〜1000名", "1001名以上"];
const PHASE_OPTIONS = ["構想・プレシード", "シード", "プレシリーズA", "シリーズA", "シリーズB", "シリーズC以降", "IPO準備・上場後", "自己資金・ブートストラップ"];
const REVENUE_OPTIONS = ["1000万円未満", "1000万〜1億円", "1〜3億円", "3〜10億円", "10〜30億円", "30億円以上"];
const TALENT_YEARS_OPTIONS = ["3年未満", "3〜5年", "5〜10年", "10〜15年", "15〜20年", "20年以上"];

export function StepCompany({ onNext }) {
  const [form, setForm] = useState({ name: "", industry: INDUSTRY_OPTIONS[1], headcount: "11〜30名", phase: "シリーズA", revenue: "1〜3億円" });
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
              {INDUSTRY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label"><Users size={12} style={{ verticalAlign: -2, marginRight: 5 }} />従業員数</label>
            <select className="field-select" value={form.headcount} onChange={set("headcount")}>
              {HEADCOUNT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="two-col" style={{ display: "grid", gap: 18 }}>
          <div>
            <label className="field-label"><TrendingUp size={12} style={{ verticalAlign: -2, marginRight: 5 }} />事業フェーズ</label>
            <select className="field-select" value={form.phase} onChange={set("phase")}>
              {PHASE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">直近ARR / 売上規模</label>
            <select className="field-select" value={form.revenue} onChange={set("revenue")}>
              {REVENUE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
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
export function StepDialog({ companyForm, onNext }) {
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
        setTimeout(() => onNext(result.scores, result.summary, result.axisNotes, result.topIssueDetails, h), 900);
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
export function StepSkillMap({ scores, summary, axisNotes, topIssueDetails, onNext }) {
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [chartView, setChartView] = useState("radar"); // "radar" | "bar"

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
  const totalScore = Math.round(AXES.reduce((s, a) => s + scores[a.key], 0) / AXES.length);
  const issueByAxis = Object.fromEntries((topIssueDetails || []).map((d) => [d.axisKey, d]));
  const priorityColor = { "非常に高い": COLORS.tealDim, "高い": COLORS.teal, "中程度": COLORS.muted };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: 0 }}>BATTER BOX Growth Map</h1>
        <span style={{ fontSize: 11, color: COLORS.faint, fontFamily: FONT_MONO }}>企業成長診断</span>
      </div>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 20px" }}>
        {summary || "対話結果から算出した、成長を阻む要因のスコアです。スコアが低い軸ほど優先度の高いボトルネックです。"}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 16, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 22px", marginBottom: 16 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 34, color: totalScore < 50 ? COLORS.tealDim : COLORS.text }}>
          {Math.round(totalScore * progress)}<span style={{ fontSize: 16, color: COLORS.faint, fontWeight: 500 }}> / 100</span>
        </div>
        <div>
          <div style={{ fontSize: 12.5, color: COLORS.muted }}>企業成長スコア(総合)</div>
          <div style={{ fontSize: 11, color: COLORS.faint }}>10軸の平均値。スコアが低いほど、優先的に手を打つべき領域が多いことを示します</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button className={chartView === "radar" ? "btn-primary" : "btn-ghost"} onClick={() => setChartView("radar")} style={{ fontSize: 12, padding: "6px 14px" }}>レーダー</button>
        <button className={chartView === "bar" ? "btn-primary" : "btn-ghost"} onClick={() => setChartView("bar")} style={{ fontSize: 12, padding: "6px 14px" }}>棒グラフ</button>
      </div>

      {chartView === "radar" ? (
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
      ) : (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
          {allAxes.slice().sort((a, b) => AXES.findIndex((x) => x.key === a.key) - AXES.findIndex((x) => x.key === b.key)).map((a) => (
            <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 96, fontSize: 12, color: COLORS.muted, flexShrink: 0 }}>{a.label}</div>
              <div style={{ flex: 1, height: 10, background: COLORS.surfaceRaised, borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: `${Math.round(a.score * progress)}%`, height: "100%", background: a.score < 40 ? COLORS.tealDim : COLORS.teal, borderRadius: 5, transition: "width 0.3s ease" }} />
              </div>
              <div style={{ width: 30, textAlign: "right", fontFamily: FONT_MONO, fontSize: 12.5, color: COLORS.text }}>{Math.round(a.score * progress)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 11.5, color: COLORS.muted, marginTop: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS.teal, display: "inline-block" }} /> 現状
        </span>
        {chartView === "radar" && (
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 2, background: COLORS.amber, display: "inline-block" }} /> 目標とする状態(目安)
          </span>
        )}
      </div>
      {revealed && (
        <div className="fade-in" style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.04em", marginBottom: 10 }}>成長を止めている課題TOP3</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bottlenecks.map((b, i) => {
              const detail = issueByAxis[b.key];
              return (
                <div key={b.key} style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: COLORS.faint }}>{i + 1}位</span>
                    <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15 }}>{b.label}</span>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: COLORS.amber }}>{b.score}点</span>
                    {detail && (
                      <span style={{ marginLeft: "auto", fontSize: 11, padding: "2px 9px", borderRadius: 6, border: `1px solid ${priorityColor[detail.priority] || COLORS.border}`, color: priorityColor[detail.priority] || COLORS.muted }}>
                        優先度: {detail.priority}
                      </span>
                    )}
                  </div>
                  {detail ? (
                    <div style={{ fontSize: 12.5, color: COLORS.text, lineHeight: 1.8 }}>
                      <div style={{ marginBottom: 6 }}><span style={{ color: COLORS.muted }}>現状: </span>{detail.currentState}</div>
                      <div style={{ marginBottom: 6 }}><span style={{ color: COLORS.muted }}>放置した場合のリスク: </span>{detail.risk}</div>
                      <div><span style={{ color: COLORS.muted }}>推奨対応開始: </span>{detail.recommendedTiming}</div>
                    </div>
                  ) : (
                    b.note && <div style={{ fontSize: 12.5, color: COLORS.muted, lineHeight: 1.7 }}>{b.note}</div>
                  )}
                </div>
              );
            })}
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
function StepTalentProposal({ companyScores, companyPhase, companyIndustry, onRestart, onOpenThread }) {
  const [candidates, setCandidates] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [connectingId, setConnectingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    setErrorMsg(null);
    setCandidates(null);
    try {
      const result = await postJSON("/api/match/company", { companyScores, companyPhase, companyIndustry });
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
      onOpenThread(result.matchId, result.counterpartName, result.draftMessage);
    } catch (e) {
      setErrorMsg("メッセージの開始に失敗しました。");
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: "0 0 6px" }}>今、御社に必要な経験</h1>
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
                  <button
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    style={{ fontSize: 11, background: "rgba(27,58,99,0.12)", color: COLORS.amber, border: "1px solid rgba(27,58,99,0.35)", borderRadius: 6, padding: "2px 8px", fontFamily: FONT_MONO, cursor: "pointer" }}
                  >
                    MATCH {t.match}% {expandedId === t.id ? "▲" : "▼"}
                  </button>
                </div>
                <div style={{ fontSize: 13, color: COLORS.muted, margin: "3px 0 12px" }}>{t.role}</div>

                {expandedId === t.id && t.breakdown && (
                  <div className="fade-in" style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 13px", marginBottom: 12, display: "flex", flexDirection: "column", gap: 5 }}>
                    {t.breakdown.map((b) => (
                      <div key={b.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                        <div style={{ width: 84, color: COLORS.muted, flexShrink: 0 }}>{b.label}</div>
                        <div style={{ flex: 1, height: 6, background: COLORS.border, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${(b.score / b.max) * 100}%`, height: "100%", background: COLORS.teal, borderRadius: 3 }} />
                        </div>
                        <div style={{ width: 44, textAlign: "right", fontFamily: FONT_MONO, color: COLORS.text }}>{b.score}/{b.max}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: 13.5, lineHeight: 1.7, color: COLORS.text, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 13px", marginBottom: 12 }}>{t.reason}</div>
                {t.bottleneckTags && t.bottleneckTags.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: COLORS.faint, marginBottom: 6 }}>解決できる課題</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {t.bottleneckTags.map((tag) => (
                        <span key={tag} style={{ fontSize: 11, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "2px 8px", color: COLORS.muted }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
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
      "元法務責任者 / CLO",
      "元広報・PR責任者",
      "元データ責任者 / CDO",
      "元購買・調達責任者",
      "元経営者 / CEO",
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
      "元法務・コンプライアンス担当",
      "元広報・PRマネージャー",
      "元データアナリスト / データサイエンティスト",
      "元カスタマーサポートマネージャー",
      "元購買・調達マネージャー",
    ],
  },
  {
    label: "その他",
    options: ["その他(自由入力)"],
  },
];
const TALENT_INDUSTRY_OPTIONS = INDUSTRY_OPTIONS;

export function StepTalentInput({ onNext }) {
  const [form, setForm] = useState({
    name: "",
    title: TALENT_TITLE_GROUPS[0].options[0],
    titleOther: "",
    industry: TALENT_INDUSTRY_OPTIONS[0],
    industryOther: "",
    years: "15〜20年",
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
              {TALENT_YEARS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
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
export function StepTalentAnalyzing({ talentForm, onNext }) {
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
export function StepTalentSkillMap({ name, scores, fit, onNext }) {
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
      onOpenThread(result.matchId, result.counterpartName, result.draftMessage);
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
function MessageThread({ matchId, counterpartName: initialName, initialDraft, onBack }) {
  const [messages, setMessages] = useState(null);
  const [counterpartName, setCounterpartName] = useState(initialName || "");
  const [text, setText] = useState(initialDraft || "");
  const [isDraft, setIsDraft] = useState(!!initialDraft);
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
      setIsDraft(false);
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
        {messages && messages.length === 0 && !isDraft && <div style={{ color: COLORS.muted, fontSize: 13 }}>まだメッセージはありません。最初のメッセージを送ってみましょう。</div>}
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

      {isDraft && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 12, color: COLORS.tealDim }}>
          <Sparkles size={13} />
          AIが企業の課題内容をもとに下書きしました。内容を確認・編集してから送信してください。
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: isDraft ? 8 : 14 }}>
        <input
          className="field-input"
          placeholder="メッセージを入力…"
          value={text}
          onChange={(e) => { setText(e.target.value); setIsDraft(false); }}
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
function MyPageCompany({ profile, onProceed, onRediagnose, onCompare }) {
  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: COLORS.muted }}>
          前回の診断結果({new Date(profile.diagnosedAt).toLocaleDateString("ja-JP")})
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" onClick={onCompare} style={{ fontSize: 12, padding: "6px 12px" }}>過去の診断と比較する</button>
          <button className="btn-ghost" onClick={onRediagnose} style={{ fontSize: 12, padding: "6px 12px" }}>もう一度AI診断を受け直す</button>
        </div>
      </div>
      <StepSkillMap scores={profile.scores} summary={profile.summary} axisNotes={profile.axisNotes} topIssueDetails={profile.topIssueDetails} onNext={onProceed} />
    </div>
  );
}

function ComparisonView({ onBack }) {
  const [history, setHistory] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetch("/api/company/history")
      .then((r) => r.json())
      .then((data) => setHistory(data.history || []))
      .catch(() => setErrorMsg("履歴の取得に失敗しました。"));
  }, []);

  if (errorMsg) return <ErrorNote message={errorMsg} onRetry={() => window.location.reload()} />;
  if (!history) return <div style={{ color: COLORS.muted, fontSize: 13 }}>読み込み中…</div>;

  if (history.length < 2) {
    return (
      <div className="fade-in">
        <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← 戻る</button>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: "0 0 12px" }}>過去の診断との比較</h1>
        <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, fontSize: 13, color: COLORS.muted }}>
          比較するには、2回以上の診断結果が必要です。「もう一度AI診断を受け直す」から再診断すると、ここで前回との変化を確認できるようになります。
        </div>
      </div>
    );
  }

  // history は新しい順。直近(after) と、その1つ前(before) を比較する
  const [after, before] = history;
  const { totalBefore, totalAfter, totalDelta, axisDeltas } = computeScoreDelta(before.axisScores, after.axisScores);
  const deltaColor = (d) => (d > 0 ? COLORS.teal : d < 0 ? COLORS.tealDim : COLORS.faint);
  const deltaSign = (d) => (d > 0 ? "+" : "");

  return (
    <div className="fade-in">
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← 戻る</button>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>過去の診断との比較</h1>
      <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 20px" }}>
        {new Date(before.createdAt).toLocaleDateString("ja-JP")} の診断 → {new Date(after.createdAt).toLocaleDateString("ja-JP")} の診断
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 16, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 20, color: COLORS.faint }}>{totalBefore}</div>
        <ArrowRight size={16} color={COLORS.faint} />
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30 }}>{totalAfter}</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 14, color: deltaColor(totalDelta), marginLeft: 4 }}>
          {deltaSign(totalDelta)}{totalDelta}
        </div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginLeft: "auto" }}>企業成長スコア(総合)</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {axisDeltas.map((d) => (
          <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 12, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ width: 110, fontSize: 12.5, flexShrink: 0 }}>{d.label}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: COLORS.faint, width: 30, textAlign: "right" }}>{d.before}</div>
            <ArrowRight size={12} color={COLORS.faint} />
            <div style={{ fontFamily: FONT_MONO, fontSize: 12.5, width: 30 }}>{d.after}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: deltaColor(d.delta), marginLeft: "auto" }}>
              {deltaSign(d.delta)}{d.delta}
            </div>
          </div>
        ))}
      </div>
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
export const COMPANY_STEPS = ["企業情報", "AI課題診断", "スキルマップ", "人材提案"];
export const TALENT_STEPS = ["経歴入力", "AI解析", "スキルマップ", "企業マッチング"];

function HeaderActions({ onOpenInbox, onOpenSettings, onOpenProjects }) {
  return (
    <>
      <button className="btn-ghost" onClick={onOpenProjects} style={{ padding: "6px 12px" }}>
        <ClipboardList size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
        プロジェクト
      </button>
      <button className="btn-ghost" onClick={onOpenSettings} style={{ padding: "6px 12px" }}>
        <Settings size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
        設定
      </button>
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

// ---------------------------------------------------------------------------
// 設定画面 — AI診断/解析を経由せず、基本情報・パスワードを直接更新する
// ---------------------------------------------------------------------------
function ProfileFieldsCompany({ initial, onSaved }) {
  const [form, setForm] = useState(initial || { name: "", industry: "", headcount: "", phase: "", revenue: "" });
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg(null);
    try {
      await fetch("/api/company/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        .then(async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.error); });
      setStatus("saved");
      onSaved?.(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("idle");
    }
  };

  return (
    <form onSubmit={submit} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, marginBottom: 20 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, marginBottom: 16 }}>企業情報</div>
      <div style={{ marginBottom: 16 }}>
        <label className="field-label">会社名</label>
        <input className="field-input" required value={form.name || ""} onChange={set("name")} />
      </div>
      <div className="two-col" style={{ display: "grid", gap: 14, marginBottom: 16 }}>
        <div>
          <label className="field-label">事業ドメイン</label>
          <select className="field-select" value={form.industry || ""} onChange={set("industry")}>
            {INDUSTRY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">従業員数</label>
          <select className="field-select" value={form.headcount || ""} onChange={set("headcount")}>
            {HEADCOUNT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div className="two-col" style={{ display: "grid", gap: 14 }}>
        <div>
          <label className="field-label">事業フェーズ</label>
          <select className="field-select" value={form.phase || ""} onChange={set("phase")}>
            {PHASE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">直近ARR / 売上規模</label>
          <select className="field-select" value={form.revenue || ""} onChange={set("revenue")}>
            {REVENUE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      {errorMsg && <p style={{ color: COLORS.tealDim, fontSize: 13, margin: "12px 0 0" }}>{errorMsg}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button className="btn-primary" type="submit" disabled={status === "saving"}>
          {status === "saving" ? "保存中…" : status === "saved" ? "保存しました ✓" : "保存する"}
        </button>
      </div>
    </form>
  );
}

function ProfileFieldsTalent({ initial, onSaved }) {
  const [form, setForm] = useState(initial || { name: "", title: "", industry: "", years: "", bio: "" });
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg(null);
    try {
      await fetch("/api/talent/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        .then(async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d.error); });
      setStatus("saved");
      onSaved?.(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("idle");
    }
  };

  return (
    <form onSubmit={submit} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, marginBottom: 20 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, marginBottom: 16 }}>プロフィール</div>
      <div style={{ marginBottom: 16 }}>
        <label className="field-label">お名前</label>
        <input className="field-input" required value={form.name || ""} onChange={set("name")} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label className="field-label">直近の役職</label>
        <input className="field-input" value={form.title || ""} onChange={set("title")} />
      </div>
      <div className="two-col" style={{ display: "grid", gap: 14, marginBottom: 16 }}>
        <div>
          <label className="field-label">主な業種経験</label>
          <input className="field-input" value={form.industry || ""} onChange={set("industry")} />
        </div>
        <div>
          <label className="field-label">実務経験年数</label>
          <select className="field-select" value={form.years || ""} onChange={set("years")}>
            {TALENT_YEARS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="field-label">自己紹介・実績</label>
        <textarea className="field-input" rows={4} style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} value={form.bio || ""} onChange={set("bio")} />
      </div>
      {errorMsg && <p style={{ color: COLORS.tealDim, fontSize: 13, margin: "12px 0 0" }}>{errorMsg}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button className="btn-primary" type="submit" disabled={status === "saving"}>
          {status === "saving" ? "保存中…" : status === "saved" ? "保存しました ✓" : "保存する"}
        </button>
      </div>
    </form>
  );
}

function AccountSettings({ currentEmail }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [email, setEmail] = useState(currentEmail || "");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, email: email !== currentEmail ? email : undefined, newPassword: newPassword || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.requiresRelogin) {
        window.location.href = "/login";
        return;
      }
      setStatus("saved");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("idle");
    }
  };

  return (
    <form onSubmit={submit} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>アカウント</div>
      <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 16px" }}>メールアドレス・パスワードを変更する場合は、現在のパスワードの入力が必要です。</p>
      <div style={{ marginBottom: 16 }}>
        <label className="field-label">メールアドレス</label>
        <input className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label className="field-label">新しいパスワード(変更する場合のみ・8文字以上)</label>
        <input className="field-input" type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="変更しない場合は空欄のまま" />
      </div>
      <div>
        <label className="field-label">現在のパスワード(確認のため必須)</label>
        <input className="field-input" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
      </div>
      {errorMsg && <p style={{ color: COLORS.tealDim, fontSize: 13, margin: "12px 0 0" }}>{errorMsg}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button className="btn-primary" type="submit" disabled={status === "saving"}>
          {status === "saving" ? "保存中…" : status === "saved" ? "保存しました ✓" : "変更する"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// プロジェクト管理 — 契約成立(Engagement)ごとに自動作成される、企業⇄人材の作業スペース
// ---------------------------------------------------------------------------
function ProjectsListView({ onOpenProject, onBack }) {
  const [projects, setProjects] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data.projects || []))
      .catch(() => setErrorMsg("プロジェクト一覧の取得に失敗しました。"));
  }, []);

  return (
    <div className="fade-in">
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← 戻る</button>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: "0 0 20px" }}>プロジェクト</h1>
      <ErrorNote message={errorMsg} onRetry={() => window.location.reload()} />
      {!projects && !errorMsg && <div style={{ color: COLORS.muted, fontSize: 13 }}>読み込み中…</div>}
      {projects && projects.length === 0 && (
        <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, fontSize: 13, color: COLORS.muted }}>
          まだプロジェクトはありません。契約(業務委託)が成立すると、ここに自動的に作成されます。
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {projects && projects.map((p) => (
          <div
            key={p.id}
            style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18, color: COLORS.text }}
          >
            <button
              onClick={() => onOpenProject(p.id)}
              style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5 }}>{p.name}</span>
                <span className="btn-ghost" style={{ fontSize: 11, padding: "3px 10px", pointerEvents: "none" }}>{p.status === "active" ? "進行中" : p.status === "completed" ? "完了" : "一時停止"}</span>
              </div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>
                {p.companyName} × {p.talentName} ・ タスク {p.doneTaskCount}/{p.taskCount}完了
              </div>
            </button>
            <a href={`/app/projects/${p.id}`} style={{ fontSize: 11, color: COLORS.faint, display: "inline-block", marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
              共有可能なURLで開く ↗
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectDetailView({ projectId, onBack }) {
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [newTask, setNewTask] = useState("");
  const [newKpiName, setNewKpiName] = useState("");
  const [newKpiTarget, setNewKpiTarget] = useState("");
  const [newKpiUnit, setNewKpiUnit] = useState("");
  const [workLogDesc, setWorkLogDesc] = useState("");
  const [workLogHours, setWorkLogHours] = useState("");
  const [commentText, setCommentText] = useState("");
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setData(d);
    } catch (e) {
      setErrorMsg("プロジェクトの取得に失敗しました。");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId]);

  const cycleTaskStatus = async (task) => {
    const next = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    await postPatch(`/api/projects/${projectId}/tasks/${task.id}`, { status: next });
    load();
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    await postJSON(`/api/projects/${projectId}/tasks`, { title: newTask.trim() });
    setNewTask("");
    load();
  };

  const addKpi = async (e) => {
    e.preventDefault();
    if (!newKpiName.trim()) return;
    await postJSON(`/api/projects/${projectId}/kpis`, { name: newKpiName.trim(), targetValue: newKpiTarget || null, unit: newKpiUnit || null });
    setNewKpiName(""); setNewKpiTarget(""); setNewKpiUnit("");
    load();
  };

  const updateKpiValue = async (kpiId, value) => {
    await postPatch(`/api/projects/${projectId}/kpis/${kpiId}`, { currentValue: value === "" ? null : value });
    load();
  };

  const addWorkLog = async (e) => {
    e.preventDefault();
    if (!workLogDesc.trim() || !workLogHours) return;
    await postJSON(`/api/projects/${projectId}/worklogs`, { description: workLogDesc.trim(), hours: workLogHours });
    setWorkLogDesc(""); setWorkLogHours("");
    load();
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await postJSON(`/api/projects/${projectId}/comments`, { body: commentText.trim() });
    setCommentText("");
    load();
  };

  const generateReview = async () => {
    setReviewLoading(true);
    setReviewError(null);
    setReview(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/summary`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setReview(d.review);
    } catch (e) {
      setReviewError("AIレビューの生成に失敗しました。");
    } finally {
      setReviewLoading(false);
    }
  };

  const generatePlan = async () => {
    setPlanLoading(true);
    setPlanError(null);
    setPlan(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/plan`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setPlan(d.plan);
    } catch (e) {
      setPlanError("プランの生成に失敗しました。");
    } finally {
      setPlanLoading(false);
    }
  };

  if (errorMsg) return <ErrorNote message={errorMsg} onRetry={load} />;
  if (!data) return <div style={{ color: COLORS.muted, fontSize: 13 }}>読み込み中…</div>;

  const { project, tasks, kpis, workLogs, comments } = data;
  const taskStatusLabel = { todo: "未着手", in_progress: "進行中", done: "完了" };
  const sectionStyle = { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, marginBottom: 16 };
  const sectionTitleStyle = { fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5, marginBottom: 12 };

  return (
    <div className="fade-in">
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← プロジェクト一覧に戻る</button>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{project.name}</h1>
      <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 20 }}>
        対象課題: {project.targetAxisLabel || "未設定"} ・ 月間稼働: {project.monthlyHours ?? "—"}時間
        {project.currentMonthGoal && <> ・ 今月の目標: {project.currentMonthGoal}</>}
      </div>

      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={sectionTitleStyle}>BATTER BOX 90 DAYS PLAN</div>
          <button className="btn-ghost" onClick={generatePlan} disabled={planLoading} style={{ fontSize: 12, padding: "6px 14px" }}>
            {planLoading ? "生成中…" : plan ? "再生成する" : "プランを生成"}
          </button>
        </div>
        <ErrorNote message={planError} onRetry={generatePlan} />
        {plan && (
          <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[{ key: "month1", label: "Month 1｜現状整理・設計" }, { key: "month2", label: "Month 2｜実行" }, { key: "month3", label: "Month 3｜定着・改善" }].map((m) => (
              <div key={m.key} style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{m.label}</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: COLORS.text, lineHeight: 1.8 }}>
                  {(plan[m.key] || []).map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
        {!plan && !planLoading && !planError && (
          <div style={{ fontSize: 12.5, color: COLORS.faint }}>対象課題をもとに、3ヶ月分の実行プランをAIが提案します。</div>
        )}
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>タスク</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {tasks.length === 0 && <div style={{ fontSize: 12.5, color: COLORS.faint }}>まだタスクがありません</div>}
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => cycleTaskStatus(t)}
              style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 10, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "9px 13px", cursor: "pointer", color: COLORS.text, fontSize: 13 }}
            >
              <span style={{ fontSize: 11, fontFamily: FONT_MONO, color: t.status === "done" ? COLORS.teal : COLORS.muted, minWidth: 44 }}>{taskStatusLabel[t.status]}</span>
              <span style={{ textDecoration: t.status === "done" ? "line-through" : "none", color: t.status === "done" ? COLORS.faint : COLORS.text }}>{t.title}</span>
            </button>
          ))}
        </div>
        <form onSubmit={addTask} style={{ display: "flex", gap: 8 }}>
          <input className="field-input" placeholder="新しいタスクを入力…" value={newTask} onChange={(e) => setNewTask(e.target.value)} />
          <button className="btn-ghost" type="submit">追加</button>
        </form>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>KPI</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {kpis.length === 0 && <div style={{ fontSize: 12.5, color: COLORS.faint }}>まだKPIがありません</div>}
          {kpis.map((k) => (
            <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "9px 13px" }}>
              <span style={{ fontSize: 13, flex: 1 }}>{k.name}</span>
              <input
                className="field-input"
                style={{ width: 80, padding: "6px 10px" }}
                type="number"
                defaultValue={k.currentValue ?? ""}
                onBlur={(e) => updateKpiValue(k.id, e.target.value)}
              />
              <span style={{ fontSize: 12, color: COLORS.muted }}>/ {k.targetValue ?? "—"}{k.unit || ""}</span>
            </div>
          ))}
        </div>
        <form onSubmit={addKpi} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="field-input" style={{ flex: 2, minWidth: 140 }} placeholder="KPI名" value={newKpiName} onChange={(e) => setNewKpiName(e.target.value)} />
          <input className="field-input" style={{ width: 90 }} placeholder="目標値" type="number" value={newKpiTarget} onChange={(e) => setNewKpiTarget(e.target.value)} />
          <input className="field-input" style={{ width: 70 }} placeholder="単位" value={newKpiUnit} onChange={(e) => setNewKpiUnit(e.target.value)} />
          <button className="btn-ghost" type="submit">追加</button>
        </form>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>稼働ログ</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12, maxHeight: 200, overflowY: "auto" }}>
          {workLogs.length === 0 && <div style={{ fontSize: 12.5, color: COLORS.faint }}>まだ稼働ログがありません</div>}
          {workLogs.map((w) => (
            <div key={w.id} style={{ display: "flex", gap: 10, fontSize: 12.5, color: COLORS.text }}>
              <span style={{ fontFamily: FONT_MONO, color: COLORS.teal, minWidth: 40 }}>{w.hours}h</span>
              <span style={{ flex: 1 }}>{w.description}</span>
              <span style={{ color: COLORS.faint, fontSize: 11 }}>{new Date(w.loggedAt).toLocaleDateString("ja-JP")}</span>
            </div>
          ))}
        </div>
        <form onSubmit={addWorkLog} style={{ display: "flex", gap: 8 }}>
          <input className="field-input" style={{ flex: 1 }} placeholder="実施内容" value={workLogDesc} onChange={(e) => setWorkLogDesc(e.target.value)} />
          <input className="field-input" style={{ width: 80 }} placeholder="時間" type="number" step="0.5" value={workLogHours} onChange={(e) => setWorkLogHours(e.target.value)} />
          <button className="btn-ghost" type="submit">記録</button>
        </form>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>コメント・議事メモ</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, maxHeight: 240, overflowY: "auto" }}>
          {comments.length === 0 && <div style={{ fontSize: 12.5, color: COLORS.faint }}>まだコメントがありません</div>}
          {comments.map((c) => (
            <div key={c.id} style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "9px 13px" }}>
              <div style={{ fontSize: 11, color: COLORS.faint, marginBottom: 3 }}>{c.authorRole === "company" ? "企業側" : "人材側"} ・ {new Date(c.createdAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              <div style={{ fontSize: 13, color: COLORS.text }}>{c.body}</div>
            </div>
          ))}
        </div>
        <form onSubmit={addComment} style={{ display: "flex", gap: 8 }}>
          <input className="field-input" placeholder="コメントを入力…" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
          <button className="btn-ghost" type="submit">送信</button>
        </form>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={sectionTitleStyle}>AIレビュー</div>
          <button className="btn-primary" onClick={generateReview} disabled={reviewLoading} style={{ fontSize: 12.5, padding: "8px 16px" }}>
            {reviewLoading ? "生成中…" : "AIレビューを生成"}
          </button>
        </div>
        <ErrorNote message={reviewError} onRetry={generateReview} />
        {review && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5, lineHeight: 1.8 }}>
            <div><span style={{ color: COLORS.muted }}>今月実施したこと: </span>{review.achievements}</div>
            <div><span style={{ color: COLORS.muted }}>達成したKPI: </span>{review.kpiAchieved}</div>
            <div><span style={{ color: COLORS.muted }}>未達KPI: </span>{review.kpiMissed}</div>
            <div><span style={{ color: COLORS.muted }}>課題: </span>{review.issues}</div>
            <div><span style={{ color: COLORS.muted }}>来月の優先事項: </span>{review.nextPriorities}</div>
            <div><span style={{ color: COLORS.muted }}>継続すべき施策: </span>{review.continue}</div>
            <div><span style={{ color: COLORS.muted }}>やめるべき施策: </span>{review.stop}</div>
          </div>
        )}
        {!review && !reviewLoading && !reviewError && (
          <div style={{ fontSize: 12.5, color: COLORS.faint }}>「AIレビューを生成」を押すと、現在のタスク・KPI・稼働ログ・コメントから進捗レビューを作成します。</div>
        )}
      </div>
    </div>
  );
}



// ---------------------------------------------------------------------------
// ダッシュボード — 総合スコア・Growth Map・課題TOP3・推奨マッチ・進行中プロジェクト・
// 次回再診断の目安(企業)/ スキルマップ・推奨案件・進行中案件・稼働時間・タスク(人材)を
// 1画面に集約して表示する。
// ---------------------------------------------------------------------------
function DashboardStatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11.5, color: COLORS.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 24, color: accent || COLORS.text }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function DashboardProjectRow({ p, onOpen }) {
  return (
    <button
      onClick={() => onOpen(p.id)}
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textAlign: "left", background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", marginBottom: 8 }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
        <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 2 }}>
          {p.counterpartName}{p.targetAxisLabel ? ` ・ 対象課題: ${p.targetAxisLabel}` : ""}
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: COLORS.muted, flexShrink: 0 }}>
        <span>タスク {p.doneTaskCount}/{p.taskCount}</span>
        <span>KPI {p.kpiOnTrackCount}/{p.kpiCount}</span>
      </div>
    </button>
  );
}

function CompanyDashboard({ onOpenProjects, onOpenProjectDetail, onBack }) {
  const [data, setData] = useState({ loading: true, value: null, error: null });

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData({ loading: false, value: d, error: d.error || null }))
      .catch(() => setData({ loading: false, value: null, error: "取得に失敗しました" }));
  }, []);

  if (data.loading) return <div className="fade-in" style={{ color: COLORS.muted, fontSize: 13 }}>読み込み中…</div>;
  if (data.error || !data.value?.hasData) {
    return (
      <div className="fade-in">
        <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← 戻る</button>
        <div style={{ color: COLORS.muted, fontSize: 13 }}>{data.error || "まだ診断結果がありません。"}</div>
      </div>
    );
  }

  const d = data.value;
  const priorityColor = { "非常に高い": COLORS.tealDim, "高い": COLORS.teal, "中程度": COLORS.muted };

  return (
    <div className="fade-in">
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← 戻る</button>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{d.companyName} ダッシュボード</h1>
      <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 20px" }}>
        前回の診断から{d.daysSinceDiagnosis}日経過
        {d.rediagnosisRecommended && <span style={{ color: COLORS.tealDim }}>(再診断の目安である{d.rediagnosisIntervalDays}日を超えています)</span>}
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <DashboardStatCard label="企業成長スコア" value={`${d.overallScore} / 100`} accent={d.overallScore < 50 ? COLORS.tealDim : COLORS.text} />
        <DashboardStatCard label="進行中プロジェクト" value={d.projects.length} sub="件" />
        <DashboardStatCard label="次回再診断の目安" value={d.rediagnosisRecommended ? "推奨時期です" : `あと${d.rediagnosisIntervalDays - d.daysSinceDiagnosis}日`} accent={d.rediagnosisRecommended ? COLORS.tealDim : COLORS.text} />
      </div>

      <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10 }}>成長を止めている課題TOP3</div>
      {d.topIssues.length === 0 && <div style={{ fontSize: 12.5, color: COLORS.faint, marginBottom: 20 }}>詳細分析がまだありません。</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {d.topIssues.map((i) => (
          <div key={i.axisKey} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{i.axisLabel}</span>
              {i.priority && <span style={{ fontSize: 11, color: priorityColor[i.priority] || COLORS.muted }}>優先度: {i.priority}</span>}
            </div>
            {i.currentState && <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{i.currentState}</div>}
          </div>
        ))}
      </div>

      {d.topMatches.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10 }}>今、御社に必要な経験(推奨人材)</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
            {d.topMatches.map((t) => (
              <div key={t.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px", flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: COLORS.muted, margin: "2px 0 6px" }}>{t.role}</div>
                <span style={{ fontSize: 11, color: COLORS.teal, fontFamily: FONT_MONO }}>MATCH {t.match}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: COLORS.muted }}>進行中プロジェクト</span>
        {d.projects.length > 0 && <button className="btn-ghost" onClick={onOpenProjects} style={{ fontSize: 11.5, padding: "4px 10px" }}>すべて見る</button>}
      </div>
      {d.projects.length === 0 ? (
        <div style={{ fontSize: 12.5, color: COLORS.faint }}>進行中のプロジェクトはありません。</div>
      ) : (
        d.projects.map((p) => <DashboardProjectRow key={p.id} p={p} onOpen={onOpenProjectDetail} />)
      )}
    </div>
  );
}

function TalentDashboard({ onOpenProjects, onOpenProjectDetail, onBack }) {
  const [data, setData] = useState({ loading: true, value: null, error: null });
  const [suggestions, setSuggestions] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData({ loading: false, value: d, error: d.error || null }))
      .catch(() => setData({ loading: false, value: null, error: "取得に失敗しました" }));
  }, []);

  const generateSuggestions = async () => {
    setSuggestLoading(true);
    setSuggestError(null);
    try {
      const res = await fetch("/api/talent/profile-suggestion", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuggestions(d.suggestions);
    } catch (e) {
      setSuggestError("改善案の生成に失敗しました。");
    } finally {
      setSuggestLoading(false);
    }
  };

  if (data.loading) return <div className="fade-in" style={{ color: COLORS.muted, fontSize: 13 }}>読み込み中…</div>;
  if (data.error || !data.value?.hasData) {
    return (
      <div className="fade-in">
        <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← 戻る</button>
        <div style={{ color: COLORS.muted, fontSize: 13 }}>{data.error || "まだスキルマップがありません。"}</div>
      </div>
    );
  }

  const d = data.value;
  const topStrengths = AXES.map((a) => ({ ...a, score: d.scores[a.key] })).sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <div className="fade-in">
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← 戻る</button>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{d.talentName} ダッシュボード</h1>
      {d.status === "pending" && <p style={{ fontSize: 12, color: COLORS.amber, margin: "0 0 20px" }}>現在、運営による審査中です</p>}
      {d.status !== "pending" && <div style={{ marginBottom: 20 }} />}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <DashboardStatCard label="進行中案件" value={d.projects.length} sub="件" />
        <DashboardStatCard label="今月の稼働時間" value={`${d.monthlyHours}h`} />
        <DashboardStatCard label="未完了タスク" value={d.upcomingTasks.length} sub="件" />
        <DashboardStatCard
          label="企業からの評価"
          value={d.avgRating != null ? `★ ${d.avgRating}` : "—"}
          sub={d.avgRating != null ? `${d.ratingCount}件の評価` : "まだ評価はありません"}
          accent={d.avgRating != null ? COLORS.amber : undefined}
        />
      </div>

      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: suggestions || suggestError ? 12 : 0 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>AIによるプロフィール改善案</span>
          <button className="btn-ghost" onClick={generateSuggestions} disabled={suggestLoading} style={{ fontSize: 11.5, padding: "5px 12px" }}>
            {suggestLoading ? "生成中…" : suggestions ? "再生成する" : "改善案を生成"}
          </button>
        </div>
        {suggestError && <div style={{ fontSize: 12, color: COLORS.tealDim }}>{suggestError}</div>}
        {suggestions && (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: COLORS.muted, lineHeight: 1.9 }}>
            {suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        )}
      </div>

      <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10 }}>あなたの強み(スコア上位)</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {topStrengths.map((a) => (
          <div key={a.key} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 16px" }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{a.label}</span>
            <span style={{ fontSize: 12, color: COLORS.teal, fontFamily: FONT_MONO, marginLeft: 8 }}>{a.score}/30</span>
          </div>
        ))}
      </div>

      {d.topMatches.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10 }}>推奨案件</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
            {d.topMatches.map((c) => (
              <div key={c.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px", flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11.5, color: COLORS.muted, margin: "2px 0 6px" }}>{c.phase}</div>
                <span style={{ fontSize: 11, color: COLORS.teal, fontFamily: FONT_MONO }}>MATCH {c.match}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      {d.upcomingTasks.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10 }}>未完了のタスク</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
            {d.upcomingTasks.map((t) => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 12.5 }}>
                <span>{t.title}</span>
                <span style={{ color: COLORS.faint }}>{t.companyName}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: COLORS.muted }}>進行中案件</span>
        {d.projects.length > 0 && <button className="btn-ghost" onClick={onOpenProjects} style={{ fontSize: 11.5, padding: "4px 10px" }}>すべて見る</button>}
      </div>
      {d.projects.length === 0 ? (
        <div style={{ fontSize: 12.5, color: COLORS.faint }}>進行中の案件はありません。</div>
      ) : (
        d.projects.map((p) => <DashboardProjectRow key={p.id} p={p} onOpen={onOpenProjectDetail} />)
      )}
    </div>
  );
}

function SettingsView({ mode, user, profile, onBack, onProfileSaved }) {
  return (
    <div className="fade-in">
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← 戻る</button>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: "0 0 20px" }}>設定</h1>
      {user.companyId || user.talentId ? (
        mode === "company" ? (
          <ProfileFieldsCompany initial={profile.data?.companyForm} onSaved={onProfileSaved} />
        ) : (
          <ProfileFieldsTalent initial={profile.data?.talentForm} onSaved={onProfileSaved} />
        )
      ) : (
        <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, marginBottom: 20, fontSize: 13, color: COLORS.muted }}>
          {mode === "company" ? "AI課題診断を一度完了すると、企業情報をここで編集できるようになります。" : "スキルマップ作成を一度完了すると、プロフィールをここで編集できるようになります。"}
        </div>
      )}
      <AccountSettings currentEmail={user.email} />
    </div>
  );
}

export default function Home() {
  const [authState, setAuthState] = useState({ loading: true, user: null });
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState({ name: "" });
  const [companyResult, setCompanyResult] = useState({ scores: null, summary: null, axisNotes: null, topIssueDetails: null });
  const [talent, setTalent] = useState({ name: "" });
  const [talentResult, setTalentResult] = useState({ scores: null, phases: [], bottlenecks: [], summary: null, fallback: false });
  const [view, setView] = useState("flow"); // "flow" | "mypage" | "dashboard" | "inbox" | "thread" | "settings" | "compare" | "projects" | "projectDetail"
  const [activeThread, setActiveThread] = useState(null); // { matchId, counterpartName, draftMessage }
  const [activeProjectId, setActiveProjectId] = useState(null);
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
      .then((data) => {
        setProfile({ loading: false, data });
        // company/talentのformデータをここで同期しておくと、マイページから
        // 再診断を経由せず直接「次へ」進んだ場合にも業種等の情報が失われない
        if (data?.companyForm) setCompany((c) => (c.name ? c : data.companyForm));
        if (data?.talentForm) setTalent((t) => (t.name ? t : data.talentForm));
      })
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
  const openThread = (matchId, counterpartName, draftMessage) => { setActiveThread({ matchId, counterpartName, draftMessage }); setView("thread"); };
  const openInbox = () => setView("inbox");
  const backToFlow = () => setView("flow");

  const goToMyPage = () => setView("mypage");
  const openDashboard = () => setView("dashboard");
  const openSettings = () => setView("settings");
  const openCompare = () => setView("compare");
  const openProjects = () => setView("projects");
  const openProjectDetail = (id) => { setActiveProjectId(id); setView("projectDetail"); };
  const handleProfileSaved = (form) => {
    setProfile((p) => ({
      ...p,
      data: {
        ...p.data,
        hasData: true,
        ...(authState.user?.role === "company" ? { companyForm: form } : { talentForm: form }),
      },
    }));
  };

  const rediagnoseCompany = () => {
    if (profile.data?.companyForm) setCompany(profile.data.companyForm);
    setStep(1);
    setView("flow");
  };
  const proceedFromMyPageCompany = () => {
    setCompanyResult({ scores: profile.data.scores, summary: profile.data.summary, axisNotes: profile.data.axisNotes, topIssueDetails: profile.data.topIssueDetails });
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
      {profile.data?.hasData && view !== "dashboard" && (
        <button className="btn-ghost" onClick={openDashboard} style={{ padding: "6px 12px" }}>ダッシュボード</button>
      )}
      <HeaderActions onOpenInbox={openInbox} onOpenSettings={openSettings} onOpenProjects={openProjects} />
    </>
  );

  if (view === "dashboard" && profile.data?.hasData) {
    return (
      <Shell step={step} steps={null} headerRight={headerRight}>
        {mode === "company" ? (
          <CompanyDashboard onOpenProjects={openProjects} onOpenProjectDetail={openProjectDetail} onBack={backToFlow} />
        ) : (
          <TalentDashboard onOpenProjects={openProjects} onOpenProjectDetail={openProjectDetail} onBack={backToFlow} />
        )}
      </Shell>
    );
  }

  if (view === "mypage" && profile.data?.hasData) {
    return (
      <Shell step={step} steps={null} headerRight={headerRight}>
        {mode === "company" ? (
          <MyPageCompany profile={profile.data} onProceed={proceedFromMyPageCompany} onRediagnose={rediagnoseCompany} onCompare={openCompare} />
        ) : (
          <MyPageTalent profile={profile.data} onProceed={proceedFromMyPageTalent} onRediagnose={rediagnoseTalent} />
        )}
      </Shell>
    );
  }

  if (view === "settings") {
    return (
      <Shell step={step} steps={null} headerRight={headerRight}>
        <SettingsView mode={mode} user={authState.user} profile={profile} onBack={backToFlow} onProfileSaved={handleProfileSaved} />
      </Shell>
    );
  }

  if (view === "compare") {
    return (
      <Shell step={step} steps={null} headerRight={headerRight}>
        <ComparisonView onBack={backToFlow} />
      </Shell>
    );
  }

  if (view === "projects") {
    return (
      <Shell step={step} steps={null} headerRight={headerRight}>
        <ProjectsListView onOpenProject={openProjectDetail} onBack={backToFlow} />
      </Shell>
    );
  }

  if (view === "projectDetail" && activeProjectId) {
    return (
      <Shell step={step} steps={null} headerRight={headerRight}>
        <ProjectDetailView projectId={activeProjectId} onBack={openProjects} />
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
        <MessageThread matchId={activeThread.matchId} counterpartName={activeThread.counterpartName} initialDraft={activeThread.draftMessage} onBack={backToFlow} />
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
            onNext={(scores, summary, axisNotes, topIssueDetails) => { setCompanyResult({ scores, summary, axisNotes, topIssueDetails }); setStep(3); }}
          />
        )}
        {step === 3 && <StepSkillMap scores={companyResult.scores} summary={companyResult.summary} axisNotes={companyResult.axisNotes} topIssueDetails={companyResult.topIssueDetails} onNext={() => setStep(4)} />}
        {step === 4 && (
          <StepTalentProposal companyScores={companyResult.scores} companyPhase={company.phase} companyIndustry={company.industry} onRestart={reset} onOpenThread={openThread} />
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
