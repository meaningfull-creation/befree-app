"use client";

import { useState, useEffect, useRef, Fragment } from "react";
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
  ChevronDown,
  Wallet,
  Settings,
  ClipboardList,
  UserRound,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { AXES, TALENT_SCORE_RUBRIC, FUNCTION_SUBAREA_OPTIONS, WORK_STYLE_OPTIONS, VALUE_OPTIONS } from "@/lib/axes";
import { INDUSTRY_OPTIONS } from "@/lib/industries";
import { computeScoreDelta } from "@/lib/scoreDelta";
import { DEFAULT_SCHEDULE } from "@/lib/paymentSchedule";
import { COLORS, FONT_DISPLAY, FONT_BODY, FONT_MONO, GlobalStyle, TASK_STATUS_META, TASK_STATUS_ORDER } from "@/lib/theme";
import { PROJECT_FLOW_STEPS, projectFlowStepIndex, projectStatusMeta, completionActionFor } from "@/lib/projectFlow";

// ---------------------------------------------------------------------------
// Design tokens (BATTER BOX_技術構成設計.md / プロトタイプと共通)
// ---------------------------------------------------------------------------
// 初回の対話は企業側・人材側ともに5問。登録までに離脱されないよう最小限にとどめ、
// 詳細はスキルマップ表示後の「項目ごとの深掘り」で軸ごとに詰めていく方針(v5.5)。
// サーバー側の lib/dialoguePrompts.js / lib/talentDialoguePrompts.js と値を揃えること。
const MAX_DIALOG_TURNS = 5;
const TALENT_DIALOG_TURNS = 5;
const AI_PERSONA_NAME = "タクト";
const AXIS_LABEL_BY_KEY = Object.fromEntries(AXES.map((a) => [a.key, a.label]));
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

export function ProgressRail({ step, steps, onStepClick }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, flexWrap: "wrap" }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        const clickable = done && !!onStepClick;
        const content = (
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
        );
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {clickable ? (
              <button
                onClick={() => onStepClick(idx)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", margin: 0 }}
                aria-label={`${label}に戻る`}
              >
                {content}
              </button>
            ) : content}
            {idx !== steps.length && <div style={{ width: 24, height: 1, background: COLORS.border }} />}
          </div>
        );
      })}
    </div>
  );
}

// 複数選択をプルダウン(アコーディオン)形式で行うコンポーネント。
// 選択肢が多くタグを常時展開すると画面が縦に伸びるため、普段は「選択中の件数」だけを見せ、
// クリックで開いて選ぶ方式にしている。開いた中身はチェックボックス付きの行。
export function MultiSelectDropdown({ label, hint, options, selected, onChange, accent }) {
  const [open, setOpen] = useState(false);
  const values = selected || [];
  const color = accent || COLORS.teal;
  const labelOf = (o) => (typeof o === "string" ? o : o.label);
  const valueOf = (o) => (typeof o === "string" ? o : o.value);
  const toggle = (v) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  const summary = values.length === 0
    ? "選択してください"
    : options.filter((o) => values.includes(valueOf(o))).map(labelOf).join("、");

  return (
    <div style={{ marginBottom: 16 }}>
      <label className="field-label">{label}{hint ? <span style={{ color: COLORS.faint, fontWeight: 400 }}>({hint})</span> : null}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left",
          background: COLORS.surfaceRaised, border: `1.5px solid ${open ? color : COLORS.border}`,
          borderRadius: open ? "14px 14px 0 0" : 14, padding: "12px 14px", cursor: "pointer",
          fontFamily: FONT_BODY, fontSize: 14, color: values.length ? COLORS.text : COLORS.faint,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</span>
        {values.length > 0 && (
          <span style={{ flexShrink: 0, background: color, color: COLORS.onAccent, borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 8px", fontFamily: FONT_DISPLAY }}>
            {values.length}
          </span>
        )}
        <ChevronDown size={16} style={{ flexShrink: 0, color: COLORS.muted, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
      </button>
      {open && (
        <div className="fade-in" style={{ border: `1.5px solid ${color}`, borderTop: "none", borderRadius: "0 0 14px 14px", background: COLORS.surface, maxHeight: 300, overflowY: "auto" }}>
          {options.map((o, i) => {
            const v = valueOf(o);
            const active = values.includes(v);
            // group が指定されている場合は、切り替わり目に見出し行を挟む(選択肢が多いときの迷子防止)
            const group = typeof o === "object" ? o.group : null;
            const prevGroup = i > 0 && typeof options[i - 1] === "object" ? options[i - 1].group : null;
            return (
              <Fragment key={v}>
                {group && group !== prevGroup && (
                  <div style={{ position: "sticky", top: 0, background: COLORS.surfaceRaised, borderBottom: `1px solid ${COLORS.border}`, padding: "7px 14px", fontSize: 11, fontWeight: 700, color: COLORS.muted, fontFamily: FONT_DISPLAY, letterSpacing: "0.03em" }}>
                    {group}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => toggle(v)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                    background: active ? "rgba(244,105,25,0.07)" : "transparent", border: "none",
                    borderBottom: `1px solid ${COLORS.border}`, padding: "11px 14px", cursor: "pointer",
                    fontFamily: FONT_BODY, fontSize: 13.5, color: active ? COLORS.text : COLORS.muted,
                  }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    border: `1.5px solid ${active ? color : COLORS.border}`, background: active ? color : COLORS.surface,
                    color: COLORS.onAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                  }}>
                    {active ? "✓" : ""}
                  </span>
                  <span style={{ flex: 1 }}>{labelOf(o)}</span>
                </button>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 顔写真の登録・差し替え・削除。画像はDBに保存する(/api/talent/photo)。
export function TalentPhotoField({ talentId, name, photoUpdatedAt, onChange }) {
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const fileRef = useRef(null);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/talent/photo", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "アップロードに失敗しました");
      onChange(d.photoUpdatedAt);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async () => {
    if (!window.confirm("顔写真を削除しますか?")) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/talent/photo", { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "削除に失敗しました");
      onChange(null);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <label className="field-label">顔写真</label>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <TalentAvatar talentId={talentId} name={name} photoUpdatedAt={photoUpdatedAt} size={76} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label className="btn-ghost" style={{ fontSize: 12.5, padding: "8px 16px", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1 }}>
              {busy ? "処理中…" : photoUpdatedAt ? "写真を変更" : "写真を登録"}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                style={{ display: "none" }}
                onChange={(e) => upload(e.target.files?.[0])}
              />
            </label>
            {photoUpdatedAt && (
              <button type="button" className="btn-ghost" onClick={remove} disabled={busy} style={{ fontSize: 12.5, padding: "8px 16px" }}>削除</button>
            )}
          </div>
          <div style={{ fontSize: 11, color: COLORS.faint, lineHeight: 1.6 }}>
            JPEG・PNG・WebP / 3MBまで。<br />企業のマッチング候補一覧と詳細画面に表示されます(ログイン中の企業のみ閲覧可)。
          </div>
        </div>
      </div>
      <ErrorNote message={errorMsg} />
    </div>
  );
}

// 人材のアバター。顔写真が登録されていれば /api/talents/[id]/photo を表示し、
// なければ従来どおり頭文字のプレースホルダーを出す。
// photoUpdatedAt をクエリに付けて、差し替え直後に古い画像がキャッシュから出るのを防ぐ。
export function TalentAvatar({ talentId, name, photoUpdatedAt, size = 46 }) {
  const [failed, setFailed] = useState(false);
  // 写真を差し替えたら、前回の読み込み失敗状態は破棄して再挑戦する
  useEffect(() => { setFailed(false); }, [talentId, photoUpdatedAt]);
  const base = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    border: `1px solid ${COLORS.border}`, overflow: "hidden",
  };
  if (talentId && photoUpdatedAt && !failed) {
    return (
      <img
        src={`/api/talents/${talentId}/photo?v=${encodeURIComponent(photoUpdatedAt)}`}
        alt={name ? `${name}さんの顔写真` : "顔写真"}
        onError={() => setFailed(true)}
        style={{ ...base, objectFit: "cover", display: "block", background: COLORS.surfaceRaised }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        ...base,
        background: `linear-gradient(135deg, ${COLORS.tealDim}, ${COLORS.surfaceRaised})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: Math.round(size * 0.33), color: COLORS.onAccent,
      }}
    >
      {(name || "?")[0]}
    </div>
  );
}

// wide: ダッシュボードや一覧など、横幅があるほど情報が並べやすい画面で本文の最大幅を広げる。
// 対話や読み物の画面は、1行が長くなりすぎないよう従来どおり880pxに保つ。
export function Shell({ children, step, steps, headerRight, onStepClick, nav, wide }) {
  return (
    <div className="app-root">
      <GlobalStyle />
      <header className="app-topbar">
        <div className="app-topbar-inner" style={wide ? { maxWidth: 1180 } : undefined}>
          <img className="app-topbar-logo" src="/logo.png" alt="BATTER BOX" />
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>{headerRight}</div>
        </div>
      </header>
      <div className="shell-container" style={{ position: "relative", maxWidth: wide ? 1180 : 880, margin: "0 auto", padding: "28px 24px 80px" }}>
        {steps && <ProgressRail step={step} steps={steps} onStepClick={onStepClick} />}
        {children}
      </div>
      {nav && nav.length > 0 && (
        <nav className="bottom-nav" aria-label="メインメニュー">
          {nav.map(({ key, label, Icon, onClick, active, badge }) => (
            <button key={key} className={active ? "active" : ""} onClick={onClick} aria-current={active ? "page" : undefined}>
              <span style={{ position: "relative", display: "inline-flex", overflow: "visible" }}>
                <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
                {badge > 0 && <span className="nav-badge nav-badge-float">{badge > 9 ? "9+" : badge}</span>}
              </span>
              <span className="bn-label">{label}</span>
            </button>
          ))}
        </nav>
      )}
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
const HEADCOUNT_OPTIONS = ["1〜5名", "6〜10名", "11〜30名", "31〜50名", "51〜100名", "101〜300名", "301〜1000名", "1001名以上"];
// 外部資本(VC・エンジェル投資等)の有無で、成長段階の語彙を分けている。
// 創業者100%・自己資金の企業にとって「シリーズA」等のVC用語はイメージしづらいため。
const FUNDING_TYPE_OPTIONS = [
  { value: "independent", label: "外部資本は入れていない(自己資金・創業者主体)" },
  { value: "vc", label: "外部資本を入れている(VC・エンジェル投資等)" },
];
const PHASE_OPTIONS_VC = ["シード", "プレシリーズA", "シリーズA", "シリーズB", "シリーズC以降", "IPO準備・上場後"];
const PHASE_OPTIONS_INDEPENDENT = ["創業〜3年目(基盤づくり期)", "4〜10年目(拡大・多店舗化期)", "11〜20年目(安定・第二創業期)", "21年目以上(成熟・事業承継期)"];
const REVENUE_OPTIONS = ["1000万円未満", "1000万〜1億円", "1〜3億円", "3〜10億円", "10〜30億円", "30億円以上"];
const TALENT_YEARS_OPTIONS = ["3年未満", "3〜5年", "5〜10年", "10〜15年", "15〜20年", "20年以上"];

export function StepCompany({ onNext, initialForm }) {
  const [form, setForm] = useState(
    initialForm?.name
      ? initialForm
      : { name: "", industry: INDUSTRY_OPTIONS[1], headcount: "11〜30名", fundingType: "independent", phase: PHASE_OPTIONS_INDEPENDENT[1], revenue: "1〜3億円" }
  );
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setFundingType = (e) => {
    const fundingType = e.target.value;
    const phase = fundingType === "vc" ? PHASE_OPTIONS_VC[2] : PHASE_OPTIONS_INDEPENDENT[1];
    setForm({ ...form, fundingType, phase });
  };
  const valid = form.name.trim().length > 0;
  const phaseOptions = form.fundingType === "vc" ? PHASE_OPTIONS_VC : PHASE_OPTIONS_INDEPENDENT;

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
            <label className="field-label">業種・業界</label>
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
        <div style={{ marginBottom: 20 }}>
          <label className="field-label">外部資本の有無</label>
          <select className="field-select" value={form.fundingType} onChange={setFundingType}>
            {FUNDING_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="two-col" style={{ display: "grid", gap: 18 }}>
          <div>
            <label className="field-label"><TrendingUp size={12} style={{ verticalAlign: -2, marginRight: 5 }} />{form.fundingType === "vc" ? "資金調達フェーズ" : "会社の成長段階"}</label>
            <select className="field-select" value={form.phase} onChange={set("phase")}>
              {phaseOptions.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">年商</label>
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
        setTimeout(() => onNext(result.scores, result.summary, result.axisNotes, result.topIssueDetails, h, result.companySkillMapId), 900);
        return;
      }
      setMessages((m) => {
        const next = [...m];
        if (result.reflection) next.push({ from: "ai", text: result.reflection, reflection: true });
        next.push({ from: "ai", text: result.question });
        return next;
      });
      setCurrentQuestion({ question: result.question, options: (result.options || []).slice(0, 4), axis: result.axis || null });
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
        {companyForm.name || "貴社"} の課題を{AI_PERSONA_NAME}が対話形式で特定しています
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
            <div
              style={
                m.reflection
                  ? { maxWidth: "78%", background: "transparent", color: COLORS.muted, padding: "4px 15px 0", fontSize: 13, lineHeight: 1.6, fontStyle: "italic" }
                  : { maxWidth: "78%" }
              }
            >
              {m.from === "ai" && !m.reflection && (
                <div style={{ fontSize: 10.5, color: COLORS.faint, marginBottom: 3, fontFamily: FONT_MONO }}>{AI_PERSONA_NAME}</div>
              )}
              <div
                style={
                  m.reflection
                    ? {}
                    : { background: m.from === "ai" ? COLORS.surfaceRaised : COLORS.teal, color: m.from === "ai" ? COLORS.text : COLORS.onAccent, border: m.from === "ai" ? `1px solid ${COLORS.border}` : "none", borderRadius: m.from === "ai" ? "4px 14px 14px 14px" : "14px 4px 14px 14px", padding: "11px 15px", fontSize: 14, lineHeight: 1.6 }
                }
              >
                {m.text}
              </div>
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
// 診断結果画面から、特定の1軸だけをさらに深掘りするミニ対話。
// 3問までの短いラリーの後、その軸のスコア・分析コメントを更新してonCompleteを呼ぶ。
function AxisDeepDive({ companyForm, axisKey, axisLabel, currentScore, currentNote, companySkillMapId, onComplete, onCancel }) {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]); // [{q, a}]
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [typing, setTyping] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const startedRef = useRef(false);

  const fetchNext = async (h) => {
    setTyping(true);
    setErrorMsg(null);
    try {
      const result = await postJSON("/api/diagnosis/axis-deep-dive", {
        companyForm, axisKey, currentScore, currentNote, history: h, companySkillMapId,
      });
      if (result.done) {
        onComplete(axisKey, result.score, result.note);
        return;
      }
      setMessages((m) => {
        const next = [...m];
        if (result.reflection) next.push({ from: "ai", text: result.reflection, reflection: true });
        next.push({ from: "ai", text: result.question });
        return next;
      });
      setCurrentQuestion({ question: result.question, options: (result.options || []).slice(0, 4) });
    } catch (e) {
      setErrorMsg("AIとの通信に失敗しました。もう一度お試しください。");
    } finally {
      setTyping(false);
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    fetchNext([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answer = (opt) => {
    setMessages((m) => [...m, { from: "user", text: opt }]);
    const newHistory = [...history, { q: currentQuestion.question, a: opt }];
    setHistory(newHistory);
    setCurrentQuestion(null);
    fetchNext(newHistory);
  };

  return (
    <div className="fade-in" style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16, marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: COLORS.muted }}>{axisLabel}を深掘り中({Math.min(history.length + 1, 3)}/3)</span>
        <button className="btn-ghost" onClick={onCancel} style={{ fontSize: 11, padding: "3px 10px" }}>閉じる</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.from === "ai" ? "flex-start" : "flex-end" }}>
            <div style={m.reflection
              ? { maxWidth: "85%", color: COLORS.muted, fontSize: 12, fontStyle: "italic" }
              : { maxWidth: "85%", background: m.from === "ai" ? COLORS.surface : COLORS.teal, color: m.from === "ai" ? COLORS.text : COLORS.onAccent, border: m.from === "ai" ? `1px solid ${COLORS.border}` : "none", borderRadius: m.from === "ai" ? "4px 12px 12px 12px" : "12px 4px 12px 12px", padding: "9px 13px", fontSize: 12.5 }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && <div style={{ fontSize: 12, color: COLORS.faint }}>{AI_PERSONA_NAME}が考えています…</div>}
      </div>
      {errorMsg && <ErrorNote message={errorMsg} onRetry={() => fetchNext(history)} />}
      {!typing && currentQuestion && !errorMsg && (
        <div style={{ display: "grid", gap: 6 }}>
          {currentQuestion.options.map((opt) => (
            <button key={opt} className="btn-ghost" onClick={() => answer(opt)} style={{ textAlign: "left", fontSize: 12.5, padding: "8px 12px" }}>{opt}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StepSkillMap({ scores, summary, axisNotes, topIssueDetails, companyForm, companySkillMapId, onNext }) {
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [chartView, setChartView] = useState("radar"); // "radar" | "bar"
  const [localScores, setLocalScores] = useState(scores);
  const [localAxisNotes, setLocalAxisNotes] = useState(axisNotes || {});
  const [deepDiveAxis, setDeepDiveAxis] = useState(null);

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

  const handleDeepDiveComplete = (axisKey, newScore, newNote) => {
    setLocalScores((s) => ({ ...s, [axisKey]: newScore }));
    setLocalAxisNotes((n) => ({ ...n, [axisKey]: newNote }));
    setDeepDiveAxis(null);
  };

  const IDEAL_SCORE = 75; // 「大きな課題ではない」目安ラインとしての参考値
  const data = AXES.map((a) => ({ axis: a.label, score: Math.round(localScores[a.key] * progress), ideal: IDEAL_SCORE * progress }));
  const allAxes = AXES.map((a) => ({ ...a, score: localScores[a.key], note: localAxisNotes?.[a.key] || "" })).sort((a, b) => a.score - b.score);
  const bottlenecks = allAxes.slice(0, 3);
  const totalScore = Math.round(AXES.reduce((s, a) => s + localScores[a.key], 0) / AXES.length);
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
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 4px", height: 420 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="64%" margin={{ top: 24, right: 40, bottom: 24, left: 40 }}>
              <PolarGrid stroke={COLORS.border} />
              <PolarAngleAxis dataKey="axis" tick={{ fill: COLORS.text, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: COLORS.faint, fontSize: 9, fontFamily: FONT_MONO }} axisLine={false} tickCount={5} />
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

          {/* 初回対話は5問で全体像を掴むところまで。ここから軸ごとに深掘りして精度を上げる導線を主役にする */}
          <div style={{ background: "rgba(244,105,25,0.06)", border: `1.5px solid ${COLORS.teal}`, borderRadius: 12, padding: "18px 20px", marginTop: 20 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5, marginBottom: 6 }}>気になる項目を深掘りして、精度を上げましょう</div>
            <p style={{ fontSize: 12.5, color: COLORS.muted, lineHeight: 1.8, margin: "0 0 14px" }}>
              最初の5問では全体像を掴むところまでです。直接お聞きしていない項目は、業種と成長段階からの推定値が入っています。
              項目ごとに数問やり取りすると、その項目のスコアと分析コメントがその場で更新されます。
            </p>
            <button
              className={showAll ? "btn-ghost" : "btn-primary"}
              onClick={() => setShowAll((v) => !v)}
              style={{ fontSize: 13, padding: showAll ? "9px 18px" : "11px 22px" }}
            >
              {showAll ? "項目一覧を閉じる" : "10軸すべてを見る・項目ごとに深掘りする"}
            </button>
          </div>

          {showAll && (
            <div className="fade-in" style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {allAxes.map((a) => (
                <div key={a.key} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 16, color: a.score < 40 ? COLORS.amber : COLORS.text, minWidth: 42 }}>{a.score}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{a.label}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.6 }}>{a.note || "(分析コメントなし)"}</div>
                    </div>
                    {companyForm && deepDiveAxis !== a.key && (
                      <button
                        className="btn-ghost"
                        onClick={() => setDeepDiveAxis(a.key)}
                        style={{ fontSize: 11, padding: "5px 10px", flexShrink: 0 }}
                      >
                        この項目を深掘り
                      </button>
                    )}
                  </div>
                  {deepDiveAxis === a.key && (
                    <AxisDeepDive
                      companyForm={companyForm}
                      axisKey={a.key}
                      axisLabel={a.label}
                      currentScore={a.score}
                      currentNote={a.note}
                      companySkillMapId={companySkillMapId}
                      onComplete={handleDeepDiveComplete}
                      onCancel={() => setDeepDiveAxis(null)}
                    />
                  )}
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
  const [lowMatch, setLowMatch] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [connectingId, setConnectingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    setErrorMsg(null);
    setCandidates(null);
    try {
      const result = await postJSON("/api/match/company", { companyScores, companyPhase, companyIndustry });
      setLowMatch(!!result.lowMatchFallback);
      setCandidates(result.candidates);
    } catch (e) {
      setErrorMsg("マッチング結果の取得に失敗しました。");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const connect = async (t) => {
    setConnectingId(t.id);
    try {
      const result = await postJSON("/api/matches/connect", { talentSkillMapId: t.talentSkillMapId, deferDraft: true });
      onOpenThread(result.matchId, result.counterpartName, result.draftMessage, result.draftPending);
    } catch (e) {
      setErrorMsg("メッセージの開始に失敗しました。");
    } finally {
      setConnectingId(null);
    }
  };

  const selected = candidates?.find((c) => c.id === selectedId) || null;

  if (selected) {
    return (
      <div className="fade-in">
        <button className="btn-ghost" onClick={() => setSelectedId(null)} style={{ marginBottom: 20 }}>← 候補一覧に戻る</button>

        <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 24 }}>
          <TalentAvatar talentId={selected.id} name={selected.name} photoUpdatedAt={selected.photoUpdatedAt} size={72} />
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 19 }}>{selected.name}</div>
            <div style={{ fontSize: 13.5, color: COLORS.muted, marginTop: 2 }}>{selected.role}</div>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 13, background: "rgba(27,58,99,0.12)", color: COLORS.amber, border: "1px solid rgba(27,58,99,0.35)", borderRadius: 6, padding: "4px 10px", fontFamily: FONT_MONO }}>
            MATCH {selected.match}%
          </span>
        </div>

        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>経歴</div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, color: COLORS.muted, marginBottom: 12 }}>
            <span>直近の役職: <span style={{ color: COLORS.text }}>{selected.role || "—"}</span></span>
            <span>主な業種経験: <span style={{ color: COLORS.text }}>{selected.industry || "—"}</span></span>
            <span>実務経験年数: <span style={{ color: COLORS.text }}>{selected.years || "—"}</span></span>
          </div>
          {selected.experiencedFunctions?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: COLORS.faint, marginBottom: 6 }}>経験してきた機能領域</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {selected.experiencedFunctions.map((k) => (
                  <span key={k} style={{ fontSize: 11.5, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 9px", color: COLORS.muted }}>
                    {AXES.find((a) => a.key === k)?.label || k}
                  </span>
                ))}
              </div>
            </div>
          )}
          {selected.workStyleTags?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: COLORS.faint, marginBottom: 6 }}>得意な働き方</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {selected.workStyleTags.map((tag) => (
                  <span key={tag} style={{ fontSize: 11.5, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 9px", color: COLORS.muted }}>{tag}</span>
                ))}
              </div>
            </div>
          )}
          {selected.reason && (
            <p style={{ fontSize: 13.5, lineHeight: 1.8, color: COLORS.text, margin: 0 }}>{selected.reason}</p>
          )}
        </div>

        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>なぜおすすめされているか</div>
          <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 14px" }}>貴社の診断結果と、この方のスキルマップを照合した根拠です。</p>
          {selected.bottleneckTags && selected.bottleneckTags.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: COLORS.faint, marginBottom: 6 }}>解決できる可能性が高い課題</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {selected.bottleneckTags.map((tag) => (
                  <span key={tag} style={{ fontSize: 11.5, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 9px", color: COLORS.muted }}>{tag}</span>
                ))}
              </div>
            </div>
          )}
          {selected.breakdown && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {selected.breakdown.map((b) => (
                <div key={b.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <div style={{ width: 90, color: COLORS.muted, flexShrink: 0 }}>{b.label}</div>
                  <div style={{ flex: 1, height: 6, background: COLORS.border, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${(b.score / b.max) * 100}%`, height: "100%", background: COLORS.teal, borderRadius: 3 }} />
                  </div>
                  <div style={{ width: 48, textAlign: "right", fontFamily: FONT_MONO, color: COLORS.text }}>{b.score}/{b.max}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: COLORS.muted }}><BadgeCheck size={13} color={COLORS.teal} /> 対応領域: {selected.axis}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: COLORS.muted }}><Clock size={13} color={COLORS.teal} /> 月10時間〜</span>
        </div>

        {errorMsg && <ErrorNote message={errorMsg} />}
        <button className="btn-primary" disabled={connectingId === selected.id} onClick={() => connect(selected)}>
          <Send size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
          {connectingId === selected.id ? "準備中…" : "この人材にメッセージを送る"}
        </button>
      </div>
    );
  }

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
      {lowMatch && candidates && candidates.length > 0 && (
        <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: COLORS.muted, lineHeight: 1.7 }}>
          適合度30%以上の人材はまだ登録されていません。現在登録されている人材の中から、近い順に<strong>参考として</strong>表示しています。各カードのMATCH%と注意点を確認のうえご判断ください。
        </div>
      )}

      {candidates && candidates.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {candidates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              style={{ textAlign: "left", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, display: "flex", gap: 18, alignItems: "center", cursor: "pointer", width: "100%" }}
            >
              <TalentAvatar talentId={t.id} name={t.name} photoUpdatedAt={t.photoUpdatedAt} size={56} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15.5, color: COLORS.text }}>{t.name}</span>
                  <span style={{ fontSize: 11, background: "rgba(27,58,99,0.12)", color: COLORS.amber, border: "1px solid rgba(27,58,99,0.35)", borderRadius: 6, padding: "2px 8px", fontFamily: FONT_MONO }}>
                    MATCH {t.match}%
                  </span>
                </div>
                <div style={{ fontSize: 13, color: COLORS.muted, margin: "3px 0 6px" }}>{t.role || "—"}</div>
                {/* 経験(業種・年数)を一覧の時点で分かるようにする */}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11.5, color: COLORS.muted, marginBottom: 10 }}>
                  {t.years && <span>実務経験 <span style={{ color: COLORS.text, fontWeight: 600 }}>{t.years}</span></span>}
                  {t.industry && <span>業種 <span style={{ color: COLORS.text, fontWeight: 600 }}>{t.industry}</span></span>}
                </div>
                {t.bottleneckTags && t.bottleneckTags.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {t.bottleneckTags.slice(0, 3).map((tag) => (
                      <span key={tag} style={{ fontSize: 11, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "2px 8px", color: COLORS.muted }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: COLORS.teal, fontWeight: 500, flexShrink: 0 }}>
                詳しく見る <ChevronRight size={16} />
              </span>
            </button>
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


export function StepTalentInput({ onNext, initialForm }) {
  const [form, setForm] = useState(
    initialForm?.name
      ? { titleOther: "", industryOther: "", summary: "", experiencedFunctions: [], experiencedSubAreas: [], workStyleTags: [], valueTags: [], values: "", ...initialForm }
      : {
          name: "",
          title: TALENT_TITLE_GROUPS[0].options[0],
          titleOther: "",
          industry: TALENT_INDUSTRY_OPTIONS[0],
          industryOther: "",
          years: "15〜20年",
          summary: "",
          experiencedFunctions: [],
          experiencedSubAreas: [],
          workStyleTags: [],
          valueTags: [],
          values: "",
        }
  );
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.name.trim().length > 0;

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 27, fontWeight: 600, margin: "0 0 8px" }}>まず、これまでのご経歴を教えてください</h1>
      <p style={{ color: COLORS.muted, fontSize: 14.5, lineHeight: 1.7, margin: "0 0 32px" }}>
        職務経歴書やプロジェクト実績をもとに、AIがあなた専用の10軸スキルマップを無料で生成します。得意なことだけでなく、これから伸ばしていきたい領域も分析します。
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
        <p style={{ fontSize: 11.5, color: COLORS.faint, margin: "0 0 10px" }}>経験してきた機能領域は、スキルスコアの精度を上げるために使われます。経験していない領域は選ばないでください。</p>
        <MultiSelectDropdown
          label="これまで経験してきた機能領域"
          hint="複数選択可"
          options={AXES.map((a) => ({ value: a.key, label: a.label }))}
          selected={form.experiencedFunctions || []}
          onChange={(v) => setForm({ ...form, experiencedFunctions: v })}
        />
        <MultiSelectDropdown
          label="具体的に経験した業務"
          hint="複数選択可・スコアの精度が上がります"
          options={FUNCTION_SUBAREA_OPTIONS}
          selected={form.experiencedSubAreas || []}
          onChange={(v) => setForm({ ...form, experiencedSubAreas: v })}
        />
        <MultiSelectDropdown
          label="得意な働き方"
          hint="複数選択可"
          options={WORK_STYLE_OPTIONS}
          selected={form.workStyleTags || []}
          onChange={(v) => setForm({ ...form, workStyleTags: v })}
          accent={COLORS.amber}
        />
        <div style={{ marginBottom: 20 }}>
          <label className="field-label">職務経歴・プロジェクト実績(任意)</label>
          <textarea className="field-input" rows={4} placeholder="例: 大手人材会社にて採用〜組織開発を10年担当。急拡大期の新卒・中途採用基準の設計と定着施策を主導…" style={{ resize: "vertical", fontFamily: FONT_BODY, lineHeight: 1.6 }} value={form.summary} onChange={set("summary")} />
        </div>
        <MultiSelectDropdown
          label="大切にしている価値観"
          hint="複数選択可"
          options={VALUE_OPTIONS}
          selected={form.valueTags || []}
          onChange={(v) => setForm({ ...form, valueTags: v })}
        />
        <div>
          <label className="field-label">その他、大切にしていること(任意・自由記述)</label>
          <textarea className="field-input" rows={2} placeholder="例: スピードよりも、まず現場の話を聞いて型を作ることを大事にしている" style={{ resize: "vertical", fontFamily: FONT_BODY, lineHeight: 1.6 }} value={form.values} onChange={set("values")} />
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
              experiencedFunctions: form.experiencedFunctions || [],
              experiencedSubAreas: form.experiencedSubAreas || [],
              workStyleTags: form.workStyleTags || [],
              valueTags: form.valueTags || [],
              values: form.values,
            })
          }
        >
          {AI_PERSONA_NAME}との対話で自己分析を始める<ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Talent flow — Step 2: analyzing (real API call to /api/talent/analyze)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Talent flow — Step 2(新): AI自己分析対話(実際の性格に近いUIをStepDialogから踏襲)
// ---------------------------------------------------------------------------
export function StepTalentDialogue({ talentForm, onNext }) {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]); // [{q, a, axis}]
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
        ? await postJSON("/api/talent/dialogue/start", { talentForm })
        : await postJSON("/api/talent/dialogue/answer", { talentForm, history: h });

      if (result.done) {
        setMessages((m) => [...m, { from: "ai", text: result.summary || "回答内容をもとに、10軸でスキルマップを生成します。" }]);
        setTyping(false);
        setTimeout(() => onNext(result), 900);
        return;
      }
      setMessages((m) => {
        const next = [...m];
        if (result.reflection) next.push({ from: "ai", text: result.reflection, reflection: true });
        next.push({ from: "ai", text: result.question });
        return next;
      });
      setCurrentQuestion({ question: result.question, options: (result.options || []).slice(0, 4), axis: result.axis || null });
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
        {talentForm.name || "あなた"}の自己分析を{AI_PERSONA_NAME}が対話形式で深めています
      </h1>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 24px" }}>
        質問 {Math.min(history.length + 1, TALENT_DIALOG_TURNS)} / {TALENT_DIALOG_TURNS}
      </p>
      <div ref={scrollRef} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 24, height: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m, i) => (
          <div key={i} className="fade-in" style={{ display: "flex", justifyContent: m.from === "ai" ? "flex-start" : "flex-end" }}>
            {m.from === "ai" && (
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: COLORS.tealDim, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0 }}>
                <Sparkles size={12} color={COLORS.teal} />
              </div>
            )}
            <div
              style={
                m.reflection
                  ? { maxWidth: "78%", background: "transparent", color: COLORS.muted, padding: "4px 15px 0", fontSize: 13, lineHeight: 1.6, fontStyle: "italic" }
                  : { maxWidth: "78%" }
              }
            >
              {m.from === "ai" && !m.reflection && (
                <div style={{ fontSize: 10.5, color: COLORS.faint, marginBottom: 3, fontFamily: FONT_MONO }}>{AI_PERSONA_NAME}</div>
              )}
              <div
                style={
                  m.reflection
                    ? {}
                    : { background: m.from === "ai" ? COLORS.surfaceRaised : COLORS.teal, color: m.from === "ai" ? COLORS.text : COLORS.onAccent, border: m.from === "ai" ? `1px solid ${COLORS.border}` : "none", borderRadius: m.from === "ai" ? "4px 14px 14px 14px" : "14px 4px 14px 14px", padding: "11px 15px", fontSize: 14, lineHeight: 1.6 }
                }
              >
                {m.text}
              </div>
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
      {showOptions && (
        <div className="fade-in" style={{ display: "grid", gap: 8, marginTop: 16 }}>
          {currentQuestion.options.map((opt) => (
            <button key={opt} className="btn-ghost" onClick={() => answer(opt)} style={{ textAlign: "left", padding: "12px 16px" }}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
// 人材のスキルマップ結果画面から、特定の1軸だけをさらに深掘りするミニ対話。
function TalentAxisDeepDive({ talentForm, axisKey, axisLabel, currentScore, currentNote, talentSkillMapId, onComplete, onCancel }) {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [typing, setTyping] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const startedRef = useRef(false);

  const fetchNext = async (h) => {
    setTyping(true);
    setErrorMsg(null);
    try {
      const result = await postJSON("/api/talent/axis-deep-dive", {
        talentForm, axisKey, currentScore, currentNote, history: h, talentSkillMapId,
      });
      if (result.done) {
        onComplete(axisKey, result.score, result.note);
        return;
      }
      setMessages((m) => {
        const next = [...m];
        if (result.reflection) next.push({ from: "ai", text: result.reflection, reflection: true });
        next.push({ from: "ai", text: result.question });
        return next;
      });
      setCurrentQuestion({ question: result.question, options: (result.options || []).slice(0, 4) });
    } catch (e) {
      setErrorMsg("AIとの通信に失敗しました。もう一度お試しください。");
    } finally {
      setTyping(false);
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    fetchNext([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answer = (opt) => {
    setMessages((m) => [...m, { from: "user", text: opt }]);
    const newHistory = [...history, { q: currentQuestion.question, a: opt }];
    setHistory(newHistory);
    setCurrentQuestion(null);
    fetchNext(newHistory);
  };

  return (
    <div className="fade-in" style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16, marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: COLORS.muted }}>{axisLabel}を深掘り中({Math.min(history.length + 1, 5)}/5)</span>
        <button className="btn-ghost" onClick={onCancel} style={{ fontSize: 11, padding: "3px 10px" }}>閉じる</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.from === "ai" ? "flex-start" : "flex-end" }}>
            <div style={m.reflection
              ? { maxWidth: "85%", color: COLORS.muted, fontSize: 12, fontStyle: "italic" }
              : { maxWidth: "85%", background: m.from === "ai" ? COLORS.surface : COLORS.teal, color: m.from === "ai" ? COLORS.text : COLORS.onAccent, border: m.from === "ai" ? `1px solid ${COLORS.border}` : "none", borderRadius: m.from === "ai" ? "4px 12px 12px 12px" : "12px 4px 12px 12px", padding: "9px 13px", fontSize: 12.5 }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && <div style={{ fontSize: 12, color: COLORS.faint }}>{AI_PERSONA_NAME}が考えています…</div>}
      </div>
      {errorMsg && <ErrorNote message={errorMsg} onRetry={() => fetchNext(history)} />}
      {!typing && currentQuestion && !errorMsg && (
        <div style={{ display: "grid", gap: 6 }}>
          {currentQuestion.options.map((opt) => (
            <button key={opt} className="btn-ghost" onClick={() => answer(opt)} style={{ textAlign: "left", fontSize: 12.5, padding: "8px 12px" }}>{opt}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StepTalentSkillMap({ name, scores, fit, talentForm, talentSkillMapId, onNext }) {
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showAll, setShowAll] = useState(true);
  const [localScores, setLocalScores] = useState(scores);
  const [deepDiveAxis, setDeepDiveAxis] = useState(null);
  const [talentChartView, setTalentChartView] = useState("radar"); // "radar" | "bar"

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

  const handleDeepDiveComplete = (axisKey, newScore) => {
    setLocalScores((s) => ({ ...s, [axisKey]: newScore }));
    setDeepDiveAxis(null);
  };

  const data = AXES.map((a) => ({ axis: a.label, score: Math.round(localScores[a.key] * progress), full: 30 }));
  const strengths = AXES.map((a) => ({ ...a, score: localScores[a.key] })).sort((a, b) => b.score - a.score).slice(0, 3);
  const allAxes = AXES.map((a) => ({ ...a, score: localScores[a.key] })).sort((a, b) => b.score - a.score);

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: "0 0 14px" }}>{name || "あなた"}のスキルマップ</h1>

      {fit.fallback && (
        <p style={{ color: COLORS.amber, fontSize: 12.5, margin: "0 0 12px" }}>※ AIとの通信に失敗したため、参考値で表示しています</p>
      )}

      {fit.talentStatus === "pending" && (
        <div style={{ background: "rgba(27,58,99,0.08)", border: `1px solid ${COLORS.amber}`, borderRadius: 10, padding: "12px 16px", fontSize: 12.5, color: COLORS.text, marginBottom: 20 }}>
          現在、運営による審査中です。承認されるまでは企業への提案候補には表示されません。
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button className={talentChartView === "radar" ? "btn-primary" : "btn-ghost"} onClick={() => setTalentChartView("radar")} style={{ fontSize: 12, padding: "6px 14px" }}>レーダー</button>
        <button className={talentChartView === "bar" ? "btn-primary" : "btn-ghost"} onClick={() => setTalentChartView("bar")} style={{ fontSize: 12, padding: "6px 14px" }}>棒グラフ</button>
      </div>

      {talentChartView === "radar" ? (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 4px", height: 420 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="64%" margin={{ top: 24, right: 40, bottom: 24, left: 40 }}>
              <PolarGrid stroke={COLORS.border} />
              <PolarAngleAxis dataKey="axis" tick={{ fill: COLORS.text, fontSize: 12, fontFamily: FONT_BODY, fontWeight: 500 }} />
              <PolarRadiusAxis domain={[0, 30]} tick={{ fill: COLORS.faint, fontSize: 9, fontFamily: FONT_MONO }} axisLine={false} tickCount={4} />
              <Radar dataKey="score" stroke={COLORS.amber} fill={COLORS.amber} fillOpacity={0.28} strokeWidth={2} isAnimationActive={false} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
          {AXES.map((a) => {
            const score = Math.round((localScores[a.key] || 0) * progress);
            return (
              <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 96, fontSize: 12, color: COLORS.muted, flexShrink: 0 }}>{a.label}</div>
                <div style={{ flex: 1, height: 10, background: COLORS.surfaceRaised, borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round((score / 30) * 100)}%`, height: "100%", background: COLORS.amber, borderRadius: 5, transition: "width 0.3s ease" }} />
                </div>
                <div style={{ width: 44, textAlign: "right", fontFamily: FONT_MONO, fontSize: 12.5, color: COLORS.text }}>{score}<span style={{ fontSize: 10, color: COLORS.faint }}>/30</span></div>
              </div>
            );
          })}
        </div>
      )}
      {/* スコアの見方は、点数を見たあとに確認するものなのでチャートの下に置く */}
      <div style={{ marginTop: 14, marginBottom: 4 }}>
        <div style={{ fontSize: 11.5, color: COLORS.faint, marginBottom: 8 }}>スコアの見方(10軸・各30点満点)</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TALENT_SCORE_RUBRIC.map((r) => (
            <span
              key={r.range}
              style={{ fontSize: 11.5, color: COLORS.muted, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "5px 10px" }}
            >
              <span style={{ fontFamily: FONT_MONO, color: COLORS.teal }}>{r.range}点</span> — {r.label}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: COLORS.faint, margin: "10px 0 0", lineHeight: 1.7 }}>
          今回の解析で直接お聞きしたのは一部の軸のみです。気になる項目は、下部の「項目ごとに深掘り」からいつでも詳しく確認・更新できます。
        </p>
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

          {fit.growthAreas && fit.growthAreas.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.04em", marginBottom: 10 }}>これから伸ばしていきたい領域</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
                {fit.growthAreas.map((g) => (
                  <div key={g.axisKey} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{AXIS_LABEL_BY_KEY[g.axisKey] || g.axisKey}</div>
                    <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.6 }}>{g.note}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {fit.industryFit && fit.industryFit.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.04em", marginBottom: 4 }}>経験を活かせる可能性がある業界</div>
              <p style={{ fontSize: 11.5, color: COLORS.faint, margin: "0 0 10px", lineHeight: 1.7 }}>
                これまでの経験がある業界だけでなく、培ったスキルが横展開できそうな隣接業界もAIが候補として挙げています。確度の高い順です。
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {fit.industryFit.map((f) => (
                  <div key={f.industry} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderLeft: `4px solid ${COLORS.teal}`, borderRadius: 10, padding: "12px 16px" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, fontFamily: FONT_DISPLAY, marginBottom: f.reason ? 4 : 0 }}>{f.industry}</div>
                    {f.reason && <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.7 }}>{f.reason}</div>}
                  </div>
                ))}
              </div>
            </>
          )}

          {fit.axisEvidence && Object.keys(fit.axisEvidence).length > 0 && (
            <>
              <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.04em", marginBottom: 4 }}>このスコアの根拠</div>
              <p style={{ fontSize: 11.5, color: COLORS.faint, margin: "0 0 10px", lineHeight: 1.7 }}>
                入力内容のどこを根拠に点数をつけたかです。実態と違う場合は、職歴の記述を具体的にしてスキルマップを更新すると精度が上がります。
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
                {Object.entries(fit.axisEvidence).map(([axisKey, note]) => (
                  <div key={axisKey} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, minWidth: 96, flexShrink: 0 }}>{AXIS_LABEL_BY_KEY[axisKey] || axisKey}</span>
                    <span style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.7, flex: 1 }}>{note}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ background: "rgba(244,105,25,0.06)", border: `1px solid ${COLORS.tealDim}`, borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.teal, marginBottom: 6, letterSpacing: "0.03em" }}>適性のある企業フェーズ / 課題</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {[...(fit.phases || []), ...(fit.bottlenecks || [])].map((tag) => (
                <span key={tag} style={{ fontSize: 11.5, fontFamily: FONT_MONO, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 9px", color: COLORS.muted }}>{tag}</span>
              ))}
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: 0, color: COLORS.text }}>{fit.summary}</p>
          </div>

          {talentForm && (
            <>
              <button className="btn-ghost" onClick={() => setShowAll((v) => !v)} style={{ fontSize: 12.5, marginBottom: 14 }}>
                {showAll ? "詳細分析を閉じる" : "10軸すべての詳細を見る・項目ごとに深掘りする"}
              </button>
              {showAll && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {allAxes.map((a) => (
                    <div key={a.key} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        <div style={{ fontFamily: FONT_MONO, fontSize: 16, color: COLORS.text, minWidth: 34 }}>{a.score}</div>
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{a.label}</div>
                        {deepDiveAxis !== a.key && (
                          <button className="btn-ghost" onClick={() => setDeepDiveAxis(a.key)} style={{ fontSize: 11, padding: "5px 10px", flexShrink: 0 }}>
                            この項目を深掘り
                          </button>
                        )}
                      </div>
                      {deepDiveAxis === a.key && (
                        <TalentAxisDeepDive
                          talentForm={talentForm}
                          axisKey={a.key}
                          axisLabel={a.label}
                          currentScore={a.score}
                          currentNote=""
                          talentSkillMapId={talentSkillMapId}
                          onComplete={handleDeepDiveComplete}
                          onCancel={() => setDeepDiveAxis(null)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
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
  const [lowMatch, setLowMatch] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [connectingId, setConnectingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null); // 詳細確認中の企業(メッセージ前のワンクッション)

  const load = async () => {
    setErrorMsg(null);
    setCandidates(null);
    try {
      const result = await postJSON("/api/match/talent", { talentScores, talentPhases });
      setLowMatch(!!result.lowMatchFallback);
      setCandidates(result.candidates);
    } catch (e) {
      setErrorMsg("マッチング結果の取得に失敗しました。");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const connect = async (c) => {
    setConnectingId(c.id);
    try {
      const result = await postJSON("/api/matches/connect", { companySkillMapId: c.companySkillMapId, deferDraft: true });
      onOpenThread(result.matchId, result.counterpartName, result.draftMessage, result.draftPending);
    } catch (e) {
      setErrorMsg("メッセージの開始に失敗しました。");
    } finally {
      setConnectingId(null);
    }
  };

  const selected = candidates?.find((c) => c.id === selectedId) || null;

  // 企業の詳細確認画面(いきなりメッセージを送らず、事業規模・課題を確認してから判断する)
  if (selected) {
    return (
      <div className="fade-in">
        <button className="btn-ghost" onClick={() => setSelectedId(null)} style={{ marginBottom: 20 }}>← 候補一覧に戻る</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: 0 }}>{selected.name}</h1>
          <span style={{ fontSize: 12, background: "rgba(27,58,99,0.12)", color: COLORS.amber, border: "1px solid rgba(27,58,99,0.35)", borderRadius: 6, padding: "3px 10px", fontFamily: FONT_MONO }}>適合度 {selected.match}%</span>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: COLORS.muted, marginBottom: 18 }}>
          {selected.phase && <span>成長段階: <span style={{ color: COLORS.text }}>{selected.phase}</span></span>}
          {selected.industry && <span>業種: <span style={{ color: COLORS.text }}>{selected.industry}</span></span>}
          {selected.headcount && <span>従業員数: <span style={{ color: COLORS.text }}>{selected.headcount}</span></span>}
          {selected.revenue && <span>年商: <span style={{ color: COLORS.text }}>{selected.revenue}</span></span>}
        </div>
        {selected.reason && (
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 18px", fontSize: 13.5, lineHeight: 1.8, color: COLORS.text, marginBottom: 18 }}>
            {selected.reason}
          </div>
        )}
        {selected.topIssues?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>この企業の課題TOP3(AI診断より) — あなたの経験が活きる領域か確認してください</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selected.topIssues.map((issue, i) => (
                <div key={i} style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT_DISPLAY }}>{issue.axisLabel}</span>
                    {issue.priority && <span style={{ fontSize: 10.5, color: COLORS.tealDim }}>優先度: {issue.priority}</span>}
                  </div>
                  {issue.currentState && <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 4, lineHeight: 1.7 }}>{issue.currentState}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        {selected.bottleneck && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: COLORS.muted, width: "fit-content", marginBottom: 20 }}>
            <BadgeCheck size={14} color={COLORS.teal} /> 最優先課題: {selected.bottleneck}
          </span>
        )}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn-primary" disabled={connectingId === selected.id} onClick={() => connect(selected)}>
            <Send size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            {connectingId === selected.id ? "接続中…" : "この企業にメッセージを送る"}
          </button>
          <span style={{ fontSize: 11.5, color: COLORS.faint }}>AIが挨拶文の下書きを用意します。送信前に内容を確認できます。</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, margin: "0 0 6px" }}>スキルマップに基づく企業マッチング</h1>
      <p style={{ color: COLORS.muted, fontSize: 14, margin: "0 0 28px" }}>あなたのスキルマップと各社の課題スキルマップを照合し、適合度の高い企業を提示しています。</p>

      {errorMsg && <ErrorNote message={errorMsg} onRetry={load} />}
      {!candidates && !errorMsg && <div style={{ color: COLORS.muted, fontSize: 13 }}>マッチングを計算中…</div>}
      {candidates && candidates.length === 0 && (
        <div style={{ color: COLORS.muted, fontSize: 13 }}>現在マッチする企業がいません(登録企業がまだ少ない可能性があります)。</div>
      )}
      {lowMatch && candidates && candidates.length > 0 && (
        <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: COLORS.muted, lineHeight: 1.7 }}>
          適合度30%以上の企業はまだ登録されていません。現在登録されている企業の中から、近い順に<strong>参考として</strong>表示しています。
        </div>
      )}

      {candidates && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              style={{ textAlign: "left", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, display: "flex", gap: 18, alignItems: "flex-start", cursor: "pointer", width: "100%", color: COLORS.text }}
            >
              <div style={{ width: 46, height: 46, borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.tealDim}, ${COLORS.surfaceRaised})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, flexShrink: 0, border: `1px solid ${COLORS.border}` }}>
                {c.name[3]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15.5 }}>{c.name}</span>
                  <span style={{ fontSize: 11, background: "rgba(27,58,99,0.12)", color: COLORS.amber, border: "1px solid rgba(27,58,99,0.35)", borderRadius: 6, padding: "2px 8px", fontFamily: FONT_MONO }}>適合度 {c.match}%</span>
                </div>
                <div style={{ fontSize: 13, color: COLORS.muted, margin: "3px 0 10px" }}>{c.phase}{c.industry ? ` ・ ${c.industry}` : ""}</div>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.muted, width: "fit-content", marginBottom: 10 }}><BadgeCheck size={13} color={COLORS.teal} /> 優先課題: {c.bottleneck}</span>
                <span style={{ fontSize: 12.5, color: COLORS.tealDim, fontWeight: 600 }}>詳しく見る →</span>
              </div>
              <ChevronRight size={18} color={COLORS.faint} style={{ marginTop: 6, flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 30 }}>
        <button className="btn-ghost" onClick={onRestart}>最初からやり直す</button>
      </div>
    </div>
  );
}

// 画面切り替え時に前回取得したデータを即座に表示し、裏で最新版に更新する簡易キャッシュ。
// ダッシュボード・メッセージ一覧・プロジェクトなどの「表示されるまでが遅い」対策。
// セッション(タブ)内のメモリにのみ保持され、リロードで消える。
const viewCache = {};

// プロジェクト一覧・ダッシュボードで使う状態バッジ(配色の判定は lib/projectFlow.js)。
function ProjectStatusBadge({ project }) {
  const m = projectStatusMeta(project);
  return (
    <span style={{ background: m.bg, color: m.fg, border: `1.5px solid ${m.border}`, borderRadius: 999, fontSize: 11, fontFamily: FONT_DISPLAY, fontWeight: 700, padding: "4px 11px", whiteSpace: "nowrap", flexShrink: 0 }}>
      {m.label}
    </span>
  );
}

// 契約(プロジェクト)の進行フローを可視化するステッパー。
// 契約成立 → 実行中 → 完了報告 → 企業が確認 → 契約完了 の5段階のうち、今どこにいるかを示す
// (段階の定義と判定は lib/projectFlow.js)。
function ProjectFlowStepper({ project }) {
  const current = projectFlowStepIndex(project);
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5, marginBottom: 14 }}>契約の進行状況</div>
      <div className="flow-steps">
        {PROJECT_FLOW_STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const color = done ? COLORS.success : active ? COLORS.teal : COLORS.faint;
          return (
            <div key={step.key} className="flow-step" title={step.hint}>
              <div className="flow-step-line" style={{ background: i === 0 ? "transparent" : i <= current ? COLORS.success : COLORS.border }} />
              <div
                style={{
                  // position:relative がないと、絶対配置のライン(.flow-step-line)が
                  // 丸の上に描画されてしまう(z-indexは配置済み要素にしか効かないため)
                  position: "relative",
                  width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                  background: done || active ? color : COLORS.surface,
                  border: `2px solid ${done || active ? color : COLORS.border}`,
                  color: done || active ? COLORS.onAccent : COLORS.faint,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, fontFamily: FONT_DISPLAY, zIndex: 1,
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: 11.5, marginTop: 6, color: active ? COLORS.text : COLORS.muted, fontWeight: active ? 700 : 400, textAlign: "center", lineHeight: 1.4 }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 12, lineHeight: 1.7 }}>
        {PROJECT_FLOW_STEPS[current].hint}
      </div>
    </div>
  );
}

// 完了フローの操作パネル。人材には「完了を報告する」、企業には確認待ちの承認/差し戻しを出す。
function ProjectCompletionPanel({ project, myRole, tasks, onAction }) {
  const [note, setNote] = useState("");
  const [mode, setMode] = useState(null); // "request" | "reject" — 入力欄を開いている操作
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const run = async (action) => {
    setBusy(true);
    setErrorMsg(null);
    try {
      await onAction(action, note);
      setNote("");
      setMode(null);
    } catch (e) {
      setErrorMsg(e.message || "処理に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const box = { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, marginBottom: 16 };
  const openTaskCount = tasks.filter((t) => t.status !== "done").length;
  const available = completionActionFor(project, myRole); // 表示するUIの分岐(判定は lib/projectFlow.js)

  // 完了済み
  if (available === "none" && (project.completedAt || project.status === "completed")) {
    const pay = project.payment || {};
    const isTalent = myRole === "talent";
    const dueDate = isTalent ? pay.talentPayoutDate : pay.companyDueDate;
    const amount = isTalent ? pay.talentAmount : pay.companyAmount;
    return (
      <div style={{ ...box, borderColor: COLORS.success, background: COLORS.successBg }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5, color: COLORS.successDim, marginBottom: 6 }}>✓ 契約完了</div>
        <div style={{ fontSize: 12.5, color: COLORS.text, lineHeight: 1.8 }}>
          {project.completedAt ? `${new Date(project.completedAt).toLocaleDateString("ja-JP")}に企業が完了を承認しました。` : "このプロジェクトは完了しています。"}
          {myRole === "company" && " お相手への評価がまだの場合は、下の「実務経験者の評価」からご記入ください。"}
        </div>
        {dueDate && (
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.success}`, borderRadius: 10, padding: "14px 16px", marginTop: 12 }}>
            <div style={{ fontSize: 11.5, color: COLORS.muted, marginBottom: 4 }}>{isTalent ? "入金予定日" : "お支払い期日"}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, color: COLORS.successDim }}>
              {new Date(dueDate).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
            </div>
            {amount != null && (
              <div style={{ fontSize: 13, color: COLORS.text, marginTop: 4 }}>
                {isTalent ? "受取額" : "お支払い額"} <span style={{ fontFamily: FONT_MONO, fontWeight: 600 }}>{amount.toLocaleString()}円</span>
                <span style={{ color: COLORS.faint, fontSize: 11.5 }}>(月額)</span>
              </div>
            )}
            <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 6, lineHeight: 1.7 }}>
              {pay.closingDate ? `${new Date(pay.closingDate).toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}締め。` : ""}
              {isTalent
                ? "企業からのご入金を確認のうえ、BATTER BOXよりお振り込みします。"
                : "BATTER BOXより請求書をお送りします。"}
              土日に当たる場合は前営業日となります(祝日は考慮していません)。
            </div>
          </div>
        )}
      </div>
    );
  }

  // 企業側: 完了報告が届いている
  if (available === "confirm") {
    return (
      <div style={{ ...box, borderColor: COLORS.teal, borderWidth: 2 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5, color: COLORS.tealDim, marginBottom: 6 }}>完了報告が届いています</div>
        <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 10 }}>
          {new Date(project.completionRequestedAt).toLocaleString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} に報告されました。
        </div>
        {project.completionNote && (
          <div style={{ background: COLORS.surfaceRaised, borderLeft: `3px solid ${COLORS.teal}`, borderRadius: "0 8px 8px 0", padding: "12px 14px", fontSize: 12.5, lineHeight: 1.8, whiteSpace: "pre-wrap", marginBottom: 12 }}>
            {project.completionNote}
          </div>
        )}
        <p style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.8, margin: "0 0 12px" }}>
          成果物・稼働ログをご確認のうえ、問題なければ承認してください。<strong style={{ color: COLORS.text }}>承認すると契約が完了</strong>し、以降この契約での稼働は発生しません。まだ続きがある場合は差し戻してください。
        </p>
        <ErrorNote message={errorMsg} />
        {mode === "reject" ? (
          <div className="fade-in">
            <textarea className="field-input" rows={3} placeholder="差し戻す理由・残っている対応を入力してください" value={note} onChange={(e) => setNote(e.target.value)} style={{ resize: "vertical", lineHeight: 1.6, marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => run("reject")} disabled={busy || !note.trim()} style={{ fontSize: 12.5, padding: "9px 20px" }}>
                {busy ? "送信中…" : "差し戻す"}
              </button>
              <button className="btn-ghost" onClick={() => { setMode(null); setNote(""); }} disabled={busy} style={{ fontSize: 12.5, padding: "9px 20px" }}>キャンセル</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => { if (window.confirm("完了を承認します。この契約は完了となり、元に戻せません。よろしいですか?")) run("approve"); }}
              disabled={busy}
              style={{ background: COLORS.success, color: COLORS.onAccent, border: "none", borderRadius: 999, padding: "11px 24px", fontSize: 13.5, fontFamily: FONT_DISPLAY, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", boxShadow: `0 3px 0 ${COLORS.successDim}`, opacity: busy ? 0.5 : 1 }}
            >
              {busy ? "処理中…" : "✓ 完了を承認する"}
            </button>
            <button className="btn-ghost" onClick={() => setMode("reject")} disabled={busy} style={{ fontSize: 12.5, padding: "11px 20px" }}>まだ完了ではない(差し戻す)</button>
          </div>
        )}
      </div>
    );
  }

  // 人材側: 完了報告済み(企業の確認待ち)
  if (available === "await_confirmation") {
    return (
      <div style={{ ...box, borderColor: COLORS.teal }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5, color: COLORS.tealDim, marginBottom: 6 }}>企業の確認待ちです</div>
        <div style={{ fontSize: 12.5, color: COLORS.muted, lineHeight: 1.8 }}>
          {new Date(project.completionRequestedAt).toLocaleString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} に完了を報告しました。
          企業が承認すると契約完了となります。差し戻された場合は、このページの「要望・フィードバック」に理由が届きます。
        </div>
      </div>
    );
  }

  // 人材側: 完了を報告する
  if (available === "request") {
    return (
      <div style={box}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5, marginBottom: 6 }}>作業の完了報告</div>
        {project.completionRejectedAt && (
          <div style={{ fontSize: 12, color: COLORS.tealDim, background: "#FFF3EA", border: `1px solid ${COLORS.teal}`, borderRadius: 8, padding: "9px 12px", marginBottom: 10, lineHeight: 1.7 }}>
            前回の完了報告は企業から差し戻されています。理由は「要望・フィードバック」欄をご確認ください。
          </div>
        )}
        <p style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.8, margin: "0 0 12px" }}>
          すべての対応が終わったら、成果のサマリーを添えて企業に完了を報告してください。企業が承認すると契約完了となります。
          {openTaskCount > 0 && <span style={{ color: COLORS.tealDim }}>(未完了のタスクが{openTaskCount}件あります)</span>}
        </p>
        <ErrorNote message={errorMsg} />
        {mode === "request" ? (
          <div className="fade-in">
            <textarea className="field-input" rows={4} placeholder="実施したこと・到達した成果を簡潔にまとめてください(企業の確認画面とメールに表示されます)" value={note} onChange={(e) => setNote(e.target.value)} style={{ resize: "vertical", lineHeight: 1.6, marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => run("request")} disabled={busy || !note.trim()} style={{ fontSize: 12.5, padding: "9px 20px" }}>
                {busy ? "送信中…" : "企業に完了を報告する"}
              </button>
              <button className="btn-ghost" onClick={() => { setMode(null); setNote(""); }} disabled={busy} style={{ fontSize: 12.5, padding: "9px 20px" }}>キャンセル</button>
            </div>
          </div>
        ) : (
          <button className="btn-primary" onClick={() => setMode("request")} style={{ fontSize: 13, padding: "10px 22px" }}>完了を報告する</button>
        )}
      </div>
    );
  }

  // 企業側(報告待ち)・管理者
  return (
    <div style={box}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5, marginBottom: 6 }}>完了の確認</div>
      <div style={{ fontSize: 12.5, color: COLORS.muted, lineHeight: 1.8 }}>
        実務経験者がすべての対応を終えて「完了を報告する」を押すと、ここに確認ボタンが表示されます。
        承認した時点で契約完了となります。
      </div>
    </div>
  );
}

// タスクのステータスバッジ。未着手(白抜きグレー・○)/ 進行中(オレンジのベタ塗り・▶)/
// 完了(緑のベタ塗り・✓)で、色・塗り・記号の3点が変わるようにして見分けやすくしている。
function TaskStatusBadge({ status, onClick, size = "md" }) {
  const meta = TASK_STATUS_META[status] || TASK_STATUS_META.todo;
  const style = {
    display: "inline-flex", alignItems: "center", gap: 4,
    background: meta.bg, color: meta.fg, border: `1.5px solid ${meta.border}`,
    borderRadius: 999, fontFamily: FONT_DISPLAY, fontWeight: 700,
    fontSize: size === "sm" ? 10 : 11, lineHeight: 1,
    padding: size === "sm" ? "4px 8px" : "5px 11px",
    whiteSpace: "nowrap", flexShrink: 0,
    cursor: onClick ? "pointer" : "default",
  };
  const content = (<><span style={{ fontSize: size === "sm" ? 9 : 10 }}>{meta.icon}</span>{meta.label}</>);
  if (!onClick) return <span style={style}>{content}</span>;
  return (
    <button type="button" onClick={onClick} aria-label={`ステータス: ${meta.label}(タップで次へ進める)`} style={style}>
      {content}
    </button>
  );
}

// タスクの進捗バー。未着手/進行中/完了の内訳を1本の帯で見せる。
function TaskProgressBar({ tasks }) {
  const total = tasks.length;
  if (!total) return null;
  const counts = {
    done: tasks.filter((t) => t.status === "done").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
  };
  counts.todo = total - counts.done - counts.in_progress;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}` }}>
        {TASK_STATUS_ORDER.slice().reverse().map((k) =>
          counts[k] > 0 ? <div key={k} style={{ width: `${(counts[k] / total) * 100}%`, background: TASK_STATUS_META[k].bar }} /> : null
        )}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11, color: COLORS.muted, flexWrap: "wrap" }}>
        {TASK_STATUS_ORDER.map((k) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: TASK_STATUS_META[k].bar, border: k === "todo" ? `1px solid ${COLORS.border}` : "none", display: "inline-block" }} />
            {TASK_STATUS_META[k].label} {counts[k]}
          </span>
        ))}
      </div>
    </div>
  );
}

// タスク行。タップでステータスを進める(従来どおり)ほか、スマホでは指スライドに対応:
// 右スワイプ = 次のステータスへ(未着手→進行中→完了)、左スワイプ = 1つ戻す。
// 行の左端にステータス色のバーを出し、進行中はうっすらオレンジの背景にして
// バッジを見なくても状態が分かるようにしている。
function SwipeTaskRow({ task, onSetStatus, onEditTitle, onDelete }) {
  const [dx, setDx] = useState(0);
  const startX = useRef(null);
  const meta = TASK_STATUS_META[task.status] || TASK_STATUS_META.todo;
  const advance = () => onSetStatus(task, TASK_STATUS_ORDER[Math.min(2, TASK_STATUS_ORDER.indexOf(task.status) + 1)]);
  const revert = () => onSetStatus(task, TASK_STATUS_ORDER[Math.max(0, TASK_STATUS_ORDER.indexOf(task.status) - 1)]);
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 8 }}>
      {dx !== 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: dx > 0 ? "flex-start" : "flex-end", padding: "0 14px", fontSize: 11, fontWeight: 700, color: COLORS.onAccent, background: dx > 0 ? COLORS.success : COLORS.faint, borderRadius: 8 }}>
          {dx > 0 ? "進める →" : "← 戻す"}
        </div>
      )}
      <div
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
        onTouchMove={(e) => { if (startX.current != null) setDx(Math.max(-90, Math.min(90, e.touches[0].clientX - startX.current))); }}
        onTouchEnd={() => {
          if (dx > 55) advance();
          else if (dx < -55) revert();
          setDx(0);
          startX.current = null;
        }}
        style={{ display: "flex", alignItems: "center", gap: 10, background: meta.rowBg, border: `1px solid ${COLORS.border}`, borderLeft: `4px solid ${meta.bar}`, borderRadius: 8, padding: "10px 13px", color: COLORS.text, fontSize: 13, transform: `translateX(${dx}px)`, transition: dx === 0 ? "transform 0.18s ease" : "none", touchAction: "pan-y" }}
      >
        <TaskStatusBadge status={task.status} onClick={advance} />
        <span style={{ flex: 1, textDecoration: task.status === "done" ? "line-through" : "none", color: task.status === "done" ? COLORS.muted : COLORS.text, fontWeight: task.status === "in_progress" ? 600 : 400, minWidth: 0, overflowWrap: "anywhere" }}>{task.title}</span>
        <button onClick={() => onEditTitle(task)} aria-label="タスク名を編集" style={{ background: "none", border: "none", color: COLORS.faint, cursor: "pointer", padding: 4, flexShrink: 0 }}>✎</button>
        <button onClick={() => onDelete(task)} aria-label="タスクを削除" style={{ background: "none", border: "none", color: COLORS.faint, cursor: "pointer", padding: 4, flexShrink: 0 }}>×</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Messaging — DM between company users and talent users, scoped to a Match
// ---------------------------------------------------------------------------
function MessageThread({ matchId, counterpartName: initialName, initialDraft, draftPending, onBack, backLabel }) {
  const [messages, setMessages] = useState(null);
  const [counterpartName, setCounterpartName] = useState(initialName || "");
  const [text, setText] = useState(initialDraft || "");
  // "draft" … AIの下書きを確認中(送信か編集かをまず選ばせる) / "editing" … 自由入力中 / null … 通常
  const [reviewMode, setReviewMode] = useState(initialDraft ? "draft" : null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [sending, setSending] = useState(false);
  const [context, setContext] = useState(null);
  const [showContext, setShowContext] = useState(true);
  const [contractStatus, setContractStatus] = useState(null);
  const [showProposeForm, setShowProposeForm] = useState(false);
  const [proposeForm, setProposeForm] = useState({ monthlyHours: "10", companyAmount: "" });
  const [proposing, setProposing] = useState(false);
  const [responding, setResponding] = useState(false);
  const [suggestedPatterns, setSuggestedPatterns] = useState(null);
  const [suggesting, setSuggesting] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [draftLoading, setDraftLoading] = useState(!!draftPending);
  const scrollRef = useRef(null);
  const pollRef = useRef(null);
  const textRef = useRef(text);
  useEffect(() => { textRef.current = text; }, [text]);

  // 「メッセージを送る」の画面遷移をブロックしないよう、AI下書きはこの画面に来てから
  // 非同期で取得する(deferDraft方式)。ユーザーが既に入力を始めていたら上書きしない。
  useEffect(() => {
    if (!draftPending) return;
    let alive = true;
    fetch(`/api/matches/${matchId}/draft-message`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setDraftLoading(false);
        if (d.draftMessage && !textRef.current.trim()) {
          setText(d.draftMessage);
          setReviewMode("draft");
        }
      })
      .catch(() => { if (alive) setDraftLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, draftPending]);

  const loadContractStatus = async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}/contract`);
      const d = await res.json();
      if (!d.error) setContractStatus(d);
    } catch (e) { /* ステータス取得の失敗は致命的ではないので無視 */ }
  };

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
    loadContractStatus();
    fetch(`/api/matches/${matchId}/context`).then((r) => r.json()).then((d) => { if (!d.error) setContext(d); }).catch(() => {});
    pollRef.current = setInterval(() => { load(true); loadContractStatus(); }, 5000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // 提案フォームを開いたら、AIによる3パターンを自動で生成する(初回のみ)
  useEffect(() => {
    if (showProposeForm && !suggestedPatterns && !suggesting) suggestPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showProposeForm]);

  const suggestPatterns = async () => {
    setSuggesting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/suggest-contract-terms`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuggestedPatterns(d.patterns);
    } catch (e) {
      setErrorMsg(e.message || "AIによる提案の生成に失敗しました。");
    } finally {
      setSuggesting(false);
    }
  };

  const applyPattern = (p) => {
    setSelectedPattern(p.label);
    setProposeForm({ monthlyHours: String(p.monthlyHours), companyAmount: String(p.companyAmount) });
  };

  const proposeContract = async () => {
    setProposing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/propose-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyHours: proposeForm.monthlyHours, companyAmount: proposeForm.companyAmount }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setShowProposeForm(false);
      await loadContractStatus();
    } catch (e) {
      setErrorMsg(e.message || "契約提案の送信に失敗しました。");
    } finally {
      setProposing(false);
    }
  };

  const respondContract = async (accept) => {
    setResponding(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/respond-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      await loadContractStatus();
    } catch (e) {
      setErrorMsg(e.message || "回答の送信に失敗しました。");
    } finally {
      setResponding(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (body) => {
    const toSend = (body ?? text).trim();
    if (!toSend) return;
    setSending(true);
    setErrorMsg(null);
    try {
      await postJSON("/api/messages", { matchId, body: toSend });
      setText("");
      setReviewMode(null);
      await load(true);
    } catch (e) {
      setErrorMsg("送信に失敗しました。");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fade-in">
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>{backLabel || "← 戻る"}</button>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, margin: "0 0 16px" }}>{counterpartName}とのメッセージ</h1>

      {contractStatus && (() => {
        const eng = contractStatus.engagement;
        // 契約成立済み
        if (eng?.status === "active" || eng?.status === "completed") {
          return (
            <div style={{ background: "rgba(27,58,99,0.08)", border: `1px solid ${COLORS.teal}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontSize: 12.5, color: COLORS.text }}>
                契約が成立しています(月{eng.monthlyHours}時間 / 月額{contractStatus.myRole === "talent" ? "報酬" : ""}¥{(contractStatus.myRole === "talent" ? eng.talentAmount : eng.companyAmount)?.toLocaleString()})。プロジェクト画面で進捗を共有できます。
              </span>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <a href={`/app/contracts/${eng.id}`} className="btn-ghost" style={{ fontSize: 12, padding: "6px 14px" }}>契約内容確認書</a>
                {contractStatus.projectId && (
                  <a href={`/app/projects/${contractStatus.projectId}`} className="btn-ghost" style={{ fontSize: 12, padding: "6px 14px" }}>プロジェクトを見る →</a>
                )}
              </div>
            </div>
          );
        }
        // 提案中(人材の回答待ち)
        if (eng?.status === "proposed") {
          if (contractStatus.myRole === "talent") {
            return (
              <div style={{ background: "rgba(27,58,99,0.08)", border: `1px solid ${COLORS.teal}`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 12.5, color: COLORS.text, marginBottom: 10 }}>
                  {counterpartName}さんから契約条件が届いています。月間稼働 <b>{eng.monthlyHours}時間</b> / 月額報酬(あなたの受取額) <b>¥{eng.talentAmount?.toLocaleString()}</b>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" onClick={() => respondContract(true)} disabled={responding} style={{ fontSize: 12.5, padding: "8px 16px" }}>
                    {responding ? "送信中…" : "承諾する"}
                  </button>
                  <button className="btn-ghost" onClick={() => respondContract(false)} disabled={responding} style={{ fontSize: 12.5, padding: "8px 16px" }}>辞退する</button>
                </div>
              </div>
            );
          }
          return (
            <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
              <span style={{ fontSize: 12.5, color: COLORS.muted }}>
                契約条件を提案済みです(月間稼働 {eng.monthlyHours}時間 / 月額 ¥{eng.companyAmount?.toLocaleString()})。{counterpartName}さんの回答をお待ちください。
              </span>
            </div>
          );
        }
        // まだ契約提案がない
        if (contractStatus.myRole === "company") {
          return (
            <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
              {!showProposeForm ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <span style={{ fontSize: 12.5, color: COLORS.muted }}>ある程度お話しが進んだら、契約条件を提案できます。</span>
                  <button className="btn-ghost" onClick={() => setShowProposeForm(true)} style={{ fontSize: 12, padding: "6px 14px" }}>契約条件を提案する</button>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 12.5, color: COLORS.text, fontWeight: 500 }}>契約条件を提案する</div>
                    <button className="btn-ghost" onClick={suggestPatterns} disabled={suggesting} style={{ fontSize: 11.5, padding: "5px 12px" }}>
                      <Sparkles size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
                      {suggesting ? "生成中…" : "別のパターンを出す"}
                    </button>
                  </div>
                  {suggesting && !suggestedPatterns && (
                    <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: COLORS.muted, marginBottom: 14 }}>
                      <Sparkles size={13} className="pulse-dot" />
                      AIが発注額と稼働時間の3パターンを作成しています…
                    </div>
                  )}
                  {suggestedPatterns && (
                    <div className="fade-in" style={{ marginBottom: 14 }}>
                      <p style={{ fontSize: 10.5, color: COLORS.faint, margin: "0 0 8px" }}>
                        ※ AIによる一般的な相場感に基づく「たたき台」です。パターンを選んだ後も、下の入力欄で数値を自由に調整できます。
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                        {suggestedPatterns.map((p) => (
                          <button
                            key={p.label}
                            onClick={() => applyPattern(p)}
                            style={{ textAlign: "left", background: selectedPattern === p.label ? "rgba(244,105,25,0.08)" : COLORS.surface, border: `1.5px solid ${selectedPattern === p.label ? COLORS.teal : COLORS.border}`, borderRadius: 8, padding: "10px 12px", cursor: "pointer" }}
                          >
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.teal, marginBottom: 4 }}>{p.label}</div>
                            <div style={{ fontSize: 12, fontFamily: FONT_MONO, marginBottom: 4 }}>{p.monthlyHours}h ・ ¥{p.companyAmount.toLocaleString()}</div>
                            <div style={{ fontSize: 10.5, color: COLORS.muted, lineHeight: 1.5 }}>{p.rationale}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                    <label style={{ fontSize: 12, color: COLORS.muted }}>
                      月間稼働時間(h)
                      <input className="field-input" type="number" min="1" value={proposeForm.monthlyHours} onChange={(e) => setProposeForm({ ...proposeForm, monthlyHours: e.target.value })} style={{ width: 90, marginLeft: 8, display: "inline-block" }} />
                    </label>
                    <label style={{ fontSize: 12, color: COLORS.muted }}>
                      月額・企業支払額(円)
                      <input className="field-input" type="number" min="1" placeholder="例: 300000" value={proposeForm.companyAmount} onChange={(e) => setProposeForm({ ...proposeForm, companyAmount: e.target.value })} style={{ width: 140, marginLeft: 8, display: "inline-block" }} />
                    </label>
                  </div>
                  <p style={{ fontSize: 11, color: COLORS.faint, margin: "0 0 10px" }}>人材への支払額は、標準料率(企業支払額の60%)を目安に自動計算されます。契約種別は業務委託(準委任)です。</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-primary" onClick={proposeContract} disabled={proposing || !proposeForm.companyAmount} style={{ fontSize: 12.5, padding: "8px 16px" }}>
                      {proposing ? "送信中…" : "この内容で提案する"}
                    </button>
                    <button className="btn-ghost" onClick={() => setShowProposeForm(false)} style={{ fontSize: 12.5, padding: "8px 16px" }}>キャンセル</button>
                  </div>
                </div>
              )}
            </div>
          );
        }
        return (
          <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
            <span style={{ fontSize: 12.5, color: COLORS.muted }}>話が進むと、{counterpartName}さんから契約条件が提示されます。</span>
          </div>
        );
      })()}

      {context && (
        <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
          <button
            onClick={() => setShowContext((v) => !v)}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", fontSize: 12.5, color: COLORS.muted, fontWeight: 500 }}
          >
            {context.role === "company" ? "相手企業の詳細(業種・課題)" : "相手人材の詳細(経歴・強み)"}
            <ChevronRight size={14} style={{ transform: showContext ? "rotate(90deg)" : "none", transition: "transform 0.15s ease" }} />
          </button>
          {showContext && (
            <div className="fade-in" style={{ marginTop: 12 }}>
              {context.role === "company" ? (
                <>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: COLORS.muted, marginBottom: 10 }}>
                    <span>業種: <span style={{ color: COLORS.text }}>{context.industry || "—"}</span></span>
                    <span>従業員数: <span style={{ color: COLORS.text }}>{context.headcount || "—"}</span></span>
                    <span>成長段階: <span style={{ color: COLORS.text }}>{context.phase || "—"}</span></span>
                    <span>年商: <span style={{ color: COLORS.text }}>{context.revenue || "—"}</span></span>
                  </div>
                  {context.summary && <p style={{ fontSize: 12.5, color: COLORS.text, lineHeight: 1.7, margin: "0 0 10px" }}>{context.summary}</p>}
                  {context.topIssues && context.topIssues.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: COLORS.faint, marginBottom: 6 }}>成長を止めている課題TOP3</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {context.topIssues.map((issue) => (
                          <div key={issue.axisKey} style={{ fontSize: 12, color: COLORS.text }}>
                            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600 }}>{issue.axisLabel}</span>
                            {issue.currentState && <span style={{ color: COLORS.muted }}> — {issue.currentState}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: COLORS.muted, marginBottom: 10 }}>
                    <span>直近の役職: <span style={{ color: COLORS.text }}>{context.title || "—"}</span></span>
                    <span>主な業種経験: <span style={{ color: COLORS.text }}>{context.industry || "—"}</span></span>
                    <span>実務経験年数: <span style={{ color: COLORS.text }}>{context.years || "—"}</span></span>
                  </div>
                  {context.bio && <p style={{ fontSize: 12.5, color: COLORS.text, lineHeight: 1.7, margin: "0 0 10px" }}>{context.bio}</p>}
                  {context.careerHistory && (
                    <div style={{ margin: "0 0 10px" }}>
                      <div style={{ fontSize: 11, color: COLORS.faint, marginBottom: 4 }}>職歴</div>
                      <p style={{ fontSize: 12.5, color: COLORS.text, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{context.careerHistory}</p>
                    </div>
                  )}
                  {context.bottlenecks && context.bottlenecks.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {context.bottlenecks.map((tag) => (
                        <span key={tag} style={{ fontSize: 11, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "2px 8px", color: COLORS.muted }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, height: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}
      >
        {messages === null && <div style={{ color: COLORS.muted, fontSize: 13 }}>読み込み中…</div>}
        {messages && messages.length === 0 && reviewMode !== "draft" && <div style={{ color: COLORS.muted, fontSize: 13 }}>まだメッセージはありません。最初のメッセージを送ってみましょう。</div>}
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

      {draftLoading && (
        <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12, color: COLORS.tealDim }}>
          <Sparkles size={13} className="pulse-dot" />
          AIが最初のメッセージの下書きを作成しています…(待たずに自分で入力してもOKです)
        </div>
      )}

      {reviewMode === "draft" ? (
        <div className="fade-in" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 12, color: COLORS.tealDim }}>
            <Sparkles size={13} />
            AIが企業の課題内容をもとに下書きしました。内容を確認してください。
          </div>
          <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", fontSize: 13.5, lineHeight: 1.7, color: COLORS.text, marginBottom: 12, whiteSpace: "pre-wrap" }}>
            {text}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-primary" disabled={sending} onClick={() => send(text)}>
              {sending ? "送信中…" : "この内容で送信"}
            </button>
            <button className="btn-ghost" disabled={sending} onClick={() => setReviewMode("editing")}>
              編集してから送信する
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <input
            className="field-input"
            placeholder="メッセージを入力…"
            value={text}
            autoFocus={reviewMode === "editing"}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button className="btn-primary" disabled={sending || !text.trim()} onClick={() => send()}>
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Inbox({ onOpenThread, onBack }) {
  const [threads, setThreads] = useState(viewCache.threads || null);
  const [errorMsg, setErrorMsg] = useState(null);

  const load = async () => {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/messages/threads");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      viewCache.threads = data.threads;
      setThreads(data.threads);
    } catch (e) {
      if (!viewCache.threads) setErrorMsg("スレッド一覧の取得に失敗しました。");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="fade-in">
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
              style={{ textAlign: "left", background: COLORS.surface, border: `1.5px solid ${t.unreadCount > 0 ? COLORS.teal : COLORS.border}`, borderRadius: 12, padding: 16, cursor: "pointer", color: COLORS.text }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 14.5 }}>{t.counterpartName}</span>
                {t.unreadCount > 0 && <span className="nav-badge">{t.unreadCount > 9 ? "9+" : t.unreadCount}件の新着</span>}
              </div>
              {t.lastMessage && (
                <div style={{ fontSize: 12.5, color: t.unreadCount > 0 ? COLORS.text : COLORS.muted, fontWeight: t.unreadCount > 0 ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.lastMessage.body}
                </div>
              )}
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
      <StepSkillMap scores={profile.scores} summary={profile.summary} axisNotes={profile.axisNotes} topIssueDetails={profile.topIssueDetails} companyForm={profile.companyForm} companySkillMapId={profile.companySkillMapId} onNext={onProceed} />
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
        fit={{ phases: profile.phases, bottlenecks: profile.bottlenecks, growthAreas: profile.growthAreas, industryFit: profile.industryFit, axisEvidence: profile.axisEvidence, summary: profile.summary }}
        talentForm={profile.talentForm}
        talentSkillMapId={profile.talentSkillMapId}
        onNext={onProceed}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
export const COMPANY_STEPS = ["企業情報", "AI課題診断", "Growth Map", "人材提案"];
export const TALENT_STEPS = ["経歴入力", "AI自己分析", "スキルマップ", "企業マッチング"];



// ---------------------------------------------------------------------------
// 設定画面 — AI診断/解析を経由せず、基本情報・パスワードを直接更新する
// ---------------------------------------------------------------------------
function ProfileFieldsCompany({ initial, onSaved }) {
  const [form, setForm] = useState(initial || { name: "", industry: "", headcount: "", fundingType: "independent", phase: "", revenue: "" });
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setFundingType = (e) => {
    const fundingType = e.target.value;
    const phaseOptions = fundingType === "vc" ? PHASE_OPTIONS_VC : PHASE_OPTIONS_INDEPENDENT;
    const phase = phaseOptions.includes(form.phase) ? form.phase : phaseOptions[0];
    setForm({ ...form, fundingType, phase });
  };
  const phaseOptions = form.fundingType === "vc" ? PHASE_OPTIONS_VC : PHASE_OPTIONS_INDEPENDENT;

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
          <label className="field-label">業種・業界</label>
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
      <div style={{ marginBottom: 16 }}>
        <label className="field-label">外部資本の有無</label>
        <select className="field-select" value={form.fundingType || "independent"} onChange={setFundingType}>
          {FUNDING_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="two-col" style={{ display: "grid", gap: 14 }}>
        <div>
          <label className="field-label">{form.fundingType === "vc" ? "資金調達フェーズ" : "会社の成長段階"}</label>
          <select className="field-select" value={form.phase || ""} onChange={set("phase")}>
            {phaseOptions.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">年商</label>
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
  const [form, setForm] = useState(initial || { name: "", title: "", industry: "", years: "", careerHistory: "", experiencedFunctions: [], experiencedSubAreas: [], workStyleTags: [], valueTags: [], values: "" });
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
      // サーバー側では bio にも careerHistory と同じ内容が書かれる。画面側の summary(=bio)も
      // 揃えておかないと、この後スキルマップを更新したときに古い職歴がAIに渡ってしまう。
      onSaved?.({ ...form, summary: form.careerHistory });
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
      <div style={{ marginBottom: 16 }}>
        <label className="field-label">職歴・実績(会社名・役職・期間・担当内容・成果など)</label>
        <textarea
          className="field-input"
          rows={7}
          placeholder={"例:\n2018-2023 株式会社〇〇 営業マネージャー — 新規開拓チーム立ち上げ、年間売上2億円達成\n2015-2018 △△株式会社 法人営業 — SaaSのフィールドセールス"}
          value={form.careerHistory || ""}
          onChange={set("careerHistory")}
          style={{ resize: "vertical", lineHeight: 1.7 }}
        />
        <p style={{ fontSize: 11, color: COLORS.faint, margin: "6px 0 0", lineHeight: 1.7 }}>
          企業側の候補一覧・詳細画面と、スキルマップのAI解析の両方で使われます。具体的な数字や役割を書くほど、スコアの精度が上がります。
        </p>
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
      <MultiSelectDropdown
        label="これまで経験してきた機能領域"
        hint="複数選択可"
        options={AXES.map((a) => ({ value: a.key, label: a.label }))}
        selected={form.experiencedFunctions || []}
        onChange={(v) => setForm({ ...form, experiencedFunctions: v })}
      />
      <MultiSelectDropdown
        label="具体的に経験した業務"
        hint="複数選択可・スコアの精度が上がります"
        options={FUNCTION_SUBAREA_OPTIONS}
        selected={form.experiencedSubAreas || []}
        onChange={(v) => setForm({ ...form, experiencedSubAreas: v })}
      />
      <MultiSelectDropdown
        label="得意な働き方"
        hint="複数選択可"
        options={WORK_STYLE_OPTIONS}
        selected={form.workStyleTags || []}
        onChange={(v) => setForm({ ...form, workStyleTags: v })}
        accent={COLORS.amber}
      />
      <MultiSelectDropdown
        label="大切にしている価値観"
        hint="複数選択可"
        options={VALUE_OPTIONS}
        selected={form.valueTags || []}
        onChange={(v) => setForm({ ...form, valueTags: v })}
      />
      <div>
        <label className="field-label">その他、大切にしていること(任意・自由記述)</label>
        <textarea className="field-input" rows={2} style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} value={form.values || ""} onChange={set("values")} />
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
  const [projects, setProjects] = useState(viewCache.projects || null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        viewCache.projects = data.projects || [];
        setProjects(data.projects || []);
      })
      .catch(() => { if (!viewCache.projects) setErrorMsg("プロジェクト一覧の取得に失敗しました。"); });
  }, []);

  return (
    <div className="fade-in">
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
                <ProjectStatusBadge project={p} />
              </div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>
                {p.companyName} × {p.talentName} ・ タスク {p.doneTaskCount}/{p.taskCount}完了
                {p.inProgressTaskCount > 0 && <span style={{ color: COLORS.tealDim }}>(進行中 {p.inProgressTaskCount})</span>}
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
  const [data, setData] = useState(viewCache[`project:${projectId}`] || null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [newTask, setNewTask] = useState("");
  const [editingTask, setEditingTask] = useState(null); // { id, title } — タスク名のその場編集
  const [planEdit, setPlanEdit] = useState(null); // 編集中のプラン(保存前のドラフト)
  const [planSaving, setPlanSaving] = useState(false);
  const [workLogFiles, setWorkLogFiles] = useState([]);
  const [workLogSending, setWorkLogSending] = useState(false);
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
  const [rating, setRating] = useState(null); // { rating, comment } — 企業→人材の評価(1プロジェクト1件)
  const [ratingDraft, setRatingDraft] = useState({ rating: 0, comment: "" });
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingError, setRatingError] = useState(null);
  const [ratingSaved, setRatingSaved] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      viewCache[`project:${projectId}`] = d;
      setData(d);
    } catch (e) {
      setErrorMsg(`プロジェクトの取得に失敗しました。${e.message ? `(${e.message})` : ""}`);
    }
  };

  const loadRating = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/rating`);
      const d = await res.json();
      if (!res.ok) return;
      setRating(d.rating || null);
      if (d.rating) setRatingDraft({ rating: d.rating.rating, comment: d.rating.comment || "" });
    } catch (e) { /* 評価の取得失敗は画面全体を止めるほどではないので無視する */ }
  };

  const saveRating = async () => {
    setRatingSaving(true);
    setRatingError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: ratingDraft.rating, comment: ratingDraft.comment }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "保存に失敗しました");
      setRating(d.rating);
      setRatingSaved(true);
      setTimeout(() => setRatingSaved(false), 2500);
    } catch (e) {
      setRatingError(e.message || "評価の保存に失敗しました。");
    } finally {
      setRatingSaving(false);
    }
  };

  useEffect(() => { load(); loadRating(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId]);

  const setTaskStatus = async (task, status) => {
    if (task.status === status) return;
    // 楽観的更新: サーバー応答を待たずに画面へ反映して、スワイプの手応えを軽くする
    setData((d) => d ? { ...d, tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, status } : t)) } : d);
    try { await postPatch(`/api/projects/${projectId}/tasks/${task.id}`, { status }); } catch (e) { /* 失敗時はloadで復元 */ }
    load();
  };

  const saveTaskTitle = async () => {
    if (!editingTask?.title?.trim()) { setEditingTask(null); return; }
    await postPatch(`/api/projects/${projectId}/tasks/${editingTask.id}`, { title: editingTask.title.trim() });
    setEditingTask(null);
    load();
  };

  const deleteTask = async (task) => {
    await fetch(`/api/projects/${projectId}/tasks/${task.id}`, { method: "DELETE" });
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
    if (!workLogDesc.trim() || !workLogHours || workLogSending) return;
    setWorkLogSending(true);
    try {
      if (workLogFiles.length > 0) {
        const fd = new FormData();
        fd.append("description", workLogDesc.trim());
        fd.append("hours", workLogHours);
        for (const f of workLogFiles) fd.append("files", f);
        const res = await fetch(`/api/projects/${projectId}/worklogs`, { method: "POST", body: fd });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
      } else {
        await postJSON(`/api/projects/${projectId}/worklogs`, { description: workLogDesc.trim(), hours: workLogHours });
      }
      setWorkLogDesc(""); setWorkLogHours(""); setWorkLogFiles([]);
      await load();
    } catch (err) {
      setErrorMsg(err.message || "稼働ログの記録に失敗しました。");
    } finally {
      setWorkLogSending(false);
    }
  };

  // --- 90日プランのその場編集 ---
  const startPlanEdit = () => {
    const base = plan || data?.project?.plan;
    if (!base) return;
    setPlanEdit(JSON.parse(JSON.stringify(base)));
  };
  const setPlanItem = (mi, ii, field, value) => {
    setPlanEdit((pe) => {
      const next = JSON.parse(JSON.stringify(pe));
      next.months[mi].items[ii][field] = field === "hours" ? (value === "" ? null : Number(value)) : value;
      return next;
    });
  };
  const addPlanItem = (mi) => {
    setPlanEdit((pe) => {
      const next = JSON.parse(JSON.stringify(pe));
      next.months[mi].items.push({ action: "", hours: null });
      return next;
    });
  };
  const removePlanItem = (mi, ii) => {
    setPlanEdit((pe) => {
      const next = JSON.parse(JSON.stringify(pe));
      next.months[mi].items.splice(ii, 1);
      return next;
    });
  };
  const savePlanEdit = async () => {
    setPlanSaving(true);
    try {
      const cleaned = { ...planEdit, months: planEdit.months.map((m) => ({ ...m, items: m.items.filter((it) => it.action?.trim()) })) };
      const res = await fetch(`/api/projects/${projectId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: cleaned }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setPlan(d.plan);
      setPlanEdit(null);
      await load();
    } catch (err) {
      setPlanError(err.message || "プランの保存に失敗しました。");
    } finally {
      setPlanSaving(false);
    }
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
    try {
      const res = await fetch(`/api/projects/${projectId}/plan`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setPlan(d.plan);
      await load(); // 自動登録されたタスク・KPIを一覧に反映する
    } catch (e) {
      setPlanError("プランの生成に失敗しました。");
    } finally {
      setPlanLoading(false);
    }
  };

  // 完了フロー(人材の完了報告 / 企業の承認・差し戻し)。成功したらプロジェクト全体を読み直す。
  const runCompletionAction = async (action, note) => {
    const res = await fetch(`/api/projects/${projectId}/completion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "処理に失敗しました");
    await load();
  };

  if (errorMsg) return <ErrorNote message={errorMsg} onRetry={load} />;
  if (!data) return <div style={{ color: COLORS.muted, fontSize: 13 }}>読み込み中…</div>;

  const { project, tasks, kpis, workLogs, comments, companyInfo } = data;
  // プランはDBに保存されるようになった。手元で生成した直後はplan、それ以外は保存済みのものを表示する。
  const shownPlan = plan || project.plan;
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

      <ProjectFlowStepper project={project} />
      <ProjectCompletionPanel project={project} myRole={data.myRole} tasks={tasks} onAction={runCompletionAction} />

      {data.myRole === "talent" && companyInfo && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>クライアント企業について</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: COLORS.muted, marginBottom: 10 }}>
            <span>企業名: <span style={{ color: COLORS.text, fontWeight: 600 }}>{companyInfo.name}</span></span>
            {companyInfo.industry && <span>業種: <span style={{ color: COLORS.text }}>{companyInfo.industry}</span></span>}
            {companyInfo.headcount && <span>従業員数: <span style={{ color: COLORS.text }}>{companyInfo.headcount}</span></span>}
            {companyInfo.revenue && <span>年商: <span style={{ color: COLORS.text }}>{companyInfo.revenue}</span></span>}
            {companyInfo.phase && <span>成長段階: <span style={{ color: COLORS.text }}>{companyInfo.phase}</span></span>}
          </div>
          {companyInfo.summary && <p style={{ fontSize: 12.5, color: COLORS.text, lineHeight: 1.7, margin: "0 0 10px" }}>{companyInfo.summary}</p>}
          {companyInfo.topIssues?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: COLORS.faint, marginBottom: 6 }}>この企業の課題TOP3(診断結果より)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {companyInfo.topIssues.map((issue, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: COLORS.text, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px" }}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600 }}>{issue.axisLabel}</span>
                    {issue.priority && <span style={{ fontSize: 10.5, color: COLORS.tealDim, marginLeft: 8 }}>優先度: {issue.priority}</span>}
                    {issue.currentState && <div style={{ color: COLORS.muted, marginTop: 2, fontSize: 12 }}>{issue.currentState}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={sectionTitleStyle}>BATTER BOX 90 DAYS PLAN</div>
          <div style={{ display: "flex", gap: 8 }}>
            {shownPlan && !planEdit && (
              <button className="btn-ghost" onClick={startPlanEdit} style={{ fontSize: 12, padding: "6px 14px" }}>編集する</button>
            )}
            <button className="btn-ghost" onClick={generatePlan} disabled={planLoading || !!planEdit} style={{ fontSize: 12, padding: "6px 14px" }}>
              {planLoading ? "生成中…" : shownPlan ? "再生成する" : "プランを生成"}
            </button>
          </div>
        </div>
        <ErrorNote message={planError} onRetry={generatePlan} />
        {planEdit && (
          <div className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {planEdit.months.map((m, mi) => (
                <div key={mi} style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{m.month}｜{m.title}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {m.items.map((it, ii) => (
                      <div key={ii} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                        <textarea className="field-input" rows={2} value={it.action} onChange={(e) => setPlanItem(mi, ii, "action", e.target.value)} style={{ flex: 1, fontSize: 12, padding: "8px 10px", resize: "vertical", lineHeight: 1.5 }} placeholder="実施内容" />
                        <input className="field-input" type="number" step="0.5" min="0.5" value={it.hours ?? ""} onChange={(e) => setPlanItem(mi, ii, "hours", e.target.value)} style={{ width: 58, fontSize: 12, padding: "8px 6px" }} placeholder="h" />
                        <button onClick={() => removePlanItem(mi, ii)} aria-label="項目を削除" style={{ background: "none", border: "none", color: COLORS.faint, cursor: "pointer", padding: "8px 2px" }}>×</button>
                      </div>
                    ))}
                  </div>
                  <button className="btn-ghost" onClick={() => addPlanItem(mi)} style={{ fontSize: 11.5, padding: "5px 12px", marginTop: 8 }}>＋ 項目を追加</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn-primary" onClick={savePlanEdit} disabled={planSaving} style={{ fontSize: 12.5, padding: "8px 18px" }}>
                {planSaving ? "保存中…" : "この内容で保存"}
              </button>
              <button className="btn-ghost" onClick={() => setPlanEdit(null)} disabled={planSaving} style={{ fontSize: 12.5, padding: "8px 18px" }}>キャンセル</button>
            </div>
          </div>
        )}
        {!planEdit && shownPlan && (
          <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {(shownPlan.months || []).map((m) => (
              <div key={m.month} style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{m.month}｜{m.title}</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: COLORS.text, lineHeight: 1.8 }}>
                  {(m.items || []).map((it, i) => (
                    <li key={i}>
                      {it.action}
                      {it.hours ? <span style={{ color: COLORS.faint }}>(目安 {it.hours}h)</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {!planEdit && shownPlan && project.monthlyHours && (
          <p style={{ fontSize: 11, color: COLORS.faint, margin: "10px 0 0" }}>
            ※ 契約上の月間稼働{project.monthlyHours}時間に収まるよう設計されています。Month 1の項目はタスクに、KPIはKPI欄に自動登録されます(既に入力がある場合は上書きしません)。
          </p>
        )}
        {!shownPlan && !planLoading && !planError && (
          <div style={{ fontSize: 12.5, color: COLORS.faint }}>契約した月間稼働時間に収まる3ヶ月分の実行プランと、進捗を測るKPIをAIが設計します。</div>
        )}
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>タスク</div>
        <TaskProgressBar tasks={tasks} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {tasks.length === 0 && <div style={{ fontSize: 12.5, color: COLORS.faint }}>まだタスクがありません</div>}
          {tasks.map((t) =>
            editingTask?.id === t.id ? (
              <div key={t.id} style={{ display: "flex", gap: 8 }}>
                <input
                  className="field-input"
                  autoFocus
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") saveTaskTitle(); if (e.key === "Escape") setEditingTask(null); }}
                  style={{ flex: 1, fontSize: 13 }}
                />
                <button className="btn-primary" onClick={saveTaskTitle} style={{ fontSize: 12, padding: "6px 14px" }}>保存</button>
                <button className="btn-ghost" onClick={() => setEditingTask(null)} style={{ fontSize: 12, padding: "6px 14px" }}>取消</button>
              </div>
            ) : (
              <SwipeTaskRow
                key={t.id}
                task={t}
                onSetStatus={setTaskStatus}
                onEditTitle={(task) => setEditingTask({ id: task.id, title: task.title })}
                onDelete={deleteTask}
              />
            )
          )}
          {tasks.length > 0 && (
            <div style={{ fontSize: 10.5, color: COLORS.faint }}>ステータスのバッジをタップ、またはスマホでは行を左右にスワイプして「未着手 → 進行中 → 完了」を切り替えられます。✎でタスク名を編集できます。</div>
          )}
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
            <div key={w.id} style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 13px" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 3 }}>
                <span style={{ fontFamily: FONT_MONO, color: COLORS.teal, fontSize: 12.5, fontWeight: 600 }}>{w.hours}h</span>
                <span style={{ color: COLORS.faint, fontSize: 11, marginLeft: "auto" }}>{new Date(w.loggedAt).toLocaleDateString("ja-JP")}</span>
              </div>
              <div style={{ fontSize: 12.5, color: COLORS.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{w.description}</div>
              {w.attachments?.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  {w.attachments.map((a) => (
                    <a key={a.id} href={`/api/attachments/${a.id}`} style={{ fontSize: 11.5, color: COLORS.tealDim, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 9px", textDecoration: "none" }}>
                      📎 {a.filename}<span style={{ color: COLORS.faint }}>({Math.max(1, Math.round(a.size / 1024))}KB)</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={addWorkLog} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea className="field-input" rows={2} placeholder="実施内容(何をどこまで進めたか、詳しく書けます)" value={workLogDesc} onChange={(e) => setWorkLogDesc(e.target.value)} style={{ resize: "vertical", lineHeight: 1.6 }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input className="field-input" style={{ width: 90 }} placeholder="時間" type="number" step="0.5" value={workLogHours} onChange={(e) => setWorkLogHours(e.target.value)} />
            <label className="btn-ghost" style={{ fontSize: 12, padding: "8px 14px", cursor: "pointer" }}>
              📎 成果物を添付
              <input type="file" multiple style={{ display: "none" }} onChange={(e) => setWorkLogFiles(Array.from(e.target.files || []).slice(0, 3))} />
            </label>
            <button className="btn-primary" type="submit" disabled={workLogSending} style={{ fontSize: 12.5, padding: "8px 18px", marginLeft: "auto" }}>
              {workLogSending ? "記録中…" : "記録する"}
            </button>
          </div>
          {workLogFiles.length > 0 && (
            <div style={{ fontSize: 11.5, color: COLORS.muted }}>
              添付: {workLogFiles.map((f) => f.name).join("、")}(3ファイルまで・各5MBまで)
            </div>
          )}
        </form>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>要望・フィードバック</div>
        <p style={{ fontSize: 11.5, color: COLORS.faint, margin: "-6px 0 12px" }}>企業⇄人材で要望・依頼・フィードバックをやり取りできます。投稿すると相手にメールで通知されます。</p>
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
          <input className="field-input" placeholder="要望・フィードバックを入力…" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
          <button className="btn-ghost" type="submit">送信</button>
        </form>
      </div>

      {data.myRole !== "admin" && (
        <div style={{ ...sectionStyle, ...(project.completedAt && data.myRole === "company" && !rating ? { borderColor: COLORS.success, borderWidth: 2 } : null) }}>
          <div style={sectionTitleStyle}>実務経験者の評価</div>
          {data.myRole === "company" ? (
            <>
              <p style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.8, margin: "-4px 0 12px" }}>
                {project.completedAt
                  ? "契約が完了しました。伴走いただいた実務経験者を評価してください。評価はマッチング精度の改善にも使われます。"
                  : "契約完了後に記録いただく項目です。進行中でも記録・変更できます(相手には点数のみが平均値として反映されます)。"}
              </p>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRatingDraft({ ...ratingDraft, rating: n })}
                    aria-label={`${n}点`}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 26, lineHeight: 1, padding: 0, color: n <= ratingDraft.rating ? COLORS.teal : COLORS.border }}
                  >
                    ★
                  </button>
                ))}
                <span style={{ fontSize: 12, color: COLORS.muted, alignSelf: "center", marginLeft: 6 }}>
                  {ratingDraft.rating ? `${ratingDraft.rating} / 5` : "未評価"}
                </span>
              </div>
              <textarea className="field-input" rows={3} placeholder="良かった点・次に依頼するとしたら期待すること(任意)" value={ratingDraft.comment} onChange={(e) => setRatingDraft({ ...ratingDraft, comment: e.target.value })} style={{ resize: "vertical", lineHeight: 1.6, marginBottom: 10 }} />
              <ErrorNote message={ratingError} />
              <button className="btn-primary" onClick={saveRating} disabled={ratingSaving || !ratingDraft.rating} style={{ fontSize: 12.5, padding: "9px 20px" }}>
                {ratingSaving ? "保存中…" : ratingSaved ? "保存しました ✓" : rating ? "評価を更新する" : "評価を記録する"}
              </button>
            </>
          ) : rating ? (
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              <div style={{ color: COLORS.teal, fontSize: 20, letterSpacing: 2 }}>{"★".repeat(rating.rating)}<span style={{ color: COLORS.border }}>{"★".repeat(5 - rating.rating)}</span></div>
              {rating.comment && <div style={{ color: COLORS.text, marginTop: 6, whiteSpace: "pre-wrap" }}>{rating.comment}</div>}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: COLORS.faint }}>まだ企業からの評価はありません。契約完了後に記録されます。</div>
          )}
        </div>
      )}

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
// 指標タイル。上端にアクセント色の細い帯を置いて、数字の並びでも視線が迷わないようにしている。
function DashboardStatCard({ label, value, sub, accent, tone }) {
  const bar = tone || accent || COLORS.border;
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "13px 16px 14px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: bar }} />
      <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 5, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      {/* 「カスタマーサクセス」のような長い文字列が値に入るタイルもあるため、文字数で自動的に縮める */}
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: typeof value === "string" && value.length > 6 ? 15 : 22, lineHeight: 1.3, color: accent || COLORS.text, overflowWrap: "anywhere" }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: COLORS.faint, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
    </div>
  );
}

// ダッシュボードのパネル。見出し・任意のアクション・本文をひとつの枠にまとめる。
// 見出し行の高さを揃えることで、横に並べたときに視線が揃う。
function DashboardCard({ title, action, children, spanAll, empty }) {
  return (
    <section className={spanAll ? "span-all" : undefined} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px 18px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12, minHeight: 26 }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13.5, margin: 0, letterSpacing: "0.01em" }}>{title}</h2>
        {action}
      </div>
      {empty ? <div style={{ fontSize: 12.5, color: COLORS.faint, lineHeight: 1.8 }}>{empty}</div> : children}
    </section>
  );
}

// 一覧の「他N件」表示。上限を超えた分はリンクでまとめ、パネルが縦に伸びないようにする。
function MoreLink({ count, onClick }) {
  if (count <= 0) return null;
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", padding: "8px 0 0", cursor: "pointer", fontSize: 11.5, color: COLORS.tealDim, fontFamily: FONT_BODY }}>
      他 {count} 件を見る →
    </button>
  );
}

// 進行中プロジェクトの行。以前は右側に5つの指標を並べていたため、幅が足りないと
// 折り返して1行が3行分の高さになっていた。進捗はバー1本に集約し、常に2行に収める。
function DashboardProjectRow({ p, onOpen }) {
  const ratio = p.taskCount > 0 ? p.doneTaskCount / p.taskCount : 0;
  return (
    <button
      onClick={() => onOpen(p.id)}
      style={{ display: "block", width: "100%", textAlign: "left", background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 13px", cursor: "pointer", marginBottom: 8, color: COLORS.text }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
        <ProjectStatusBadge project={p} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 7 }}>
        <span className="mini-bar"><span style={{ width: `${Math.round(ratio * 100)}%` }} /></span>
        <span style={{ fontSize: 11, color: COLORS.muted, fontFamily: FONT_MONO, flexShrink: 0 }}>{p.doneTaskCount}/{p.taskCount}</span>
        {p.totalLoggedHours != null && <span style={{ fontSize: 11, color: COLORS.faint, flexShrink: 0 }}>{p.totalLoggedHours}h</span>}
        {p.lastActivityAt && (
          <span style={{ fontSize: 10.5, color: COLORS.faint, flexShrink: 0 }}>
            {new Date(p.lastActivityAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
          </span>
        )}
      </div>
    </button>
  );
}

// 推奨人材・推奨案件の1件。マッチ度を右端に固定して、横に並べても比較しやすくする。
function DashboardMatchRow({ name, sub, match, avatar }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "9px 13px", marginBottom: 8 }}>
      {avatar}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        {sub && <div style={{ fontSize: 11, color: COLORS.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 11, fontFamily: FONT_MONO, fontWeight: 600, color: COLORS.tealDim, background: "#FFF3EA", border: `1px solid ${COLORS.teal}`, borderRadius: 6, padding: "3px 8px", flexShrink: 0 }}>
        {match}%
      </span>
    </div>
  );
}

function CompanyDashboard({ onOpenProjects, onOpenProjectDetail, onBack }) {
  const [data, setData] = useState(
    viewCache.dashboard ? { loading: false, value: viewCache.dashboard, error: null } : { loading: true, value: null, error: null }
  );

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) viewCache.dashboard = d;
        setData({ loading: false, value: d, error: d.error || null });
      })
      .catch(() => setData((prev) => (prev.value ? prev : { loading: false, value: null, error: "取得に失敗しました" })));
  }, []);

  if (data.loading) return <div className="fade-in" style={{ color: COLORS.muted, fontSize: 13 }}>読み込み中…</div>;
  if (data.error || !data.value?.hasData) {
    return (
      <div className="fade-in">
          <div style={{ color: COLORS.muted, fontSize: 13 }}>{data.error || "まだ診断結果がありません。"}</div>
      </div>
    );
  }

  const d = data.value;
  const priorityColor = { "非常に高い": COLORS.tealDim, "高い": COLORS.teal, "中程度": COLORS.muted };
  const MAX_ROWS = 3; // 一覧はパネル内に3件まで。残りは「他N件」からそれぞれの画面へ

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 21, fontWeight: 700, margin: 0 }}>{d.companyName}</h1>
        <span style={{ fontSize: 11.5, color: COLORS.muted }}>
          前回の診断から{d.daysSinceDiagnosis}日経過
          {d.rediagnosisRecommended && <span style={{ color: COLORS.tealDim, fontWeight: 600 }}>・再診断の目安です</span>}
        </span>
      </div>

      <div className="dash-stats">
        <DashboardStatCard
          label="企業成長スコア"
          value={<>{d.overallScore}<span style={{ fontSize: 13, color: COLORS.faint, fontWeight: 500 }}> / 100</span></>}
          accent={d.overallScore < 50 ? COLORS.tealDim : COLORS.text}
          tone={d.overallScore < 50 ? COLORS.teal : COLORS.success}
        />
        <DashboardStatCard label="進行中プロジェクト" value={d.projects.length} sub="件" tone={COLORS.amber} />
        <DashboardStatCard
          label="最優先の課題"
          value={d.topIssues[0]?.axisLabel || "—"}
          sub={d.topIssues[0]?.priority ? `優先度: ${d.topIssues[0].priority}` : "診断が必要です"}
          accent={COLORS.text}
          tone={COLORS.teal}
        />
        <DashboardStatCard
          label="次回再診断の目安"
          value={d.rediagnosisRecommended ? "推奨時期" : `あと${d.rediagnosisIntervalDays - d.daysSinceDiagnosis}日`}
          accent={d.rediagnosisRecommended ? COLORS.tealDim : COLORS.text}
          tone={d.rediagnosisRecommended ? COLORS.teal : COLORS.border}
        />
      </div>

      <div className="dash-grid">
        <DashboardCard
          title="成長を止めている課題 TOP3"
          empty={d.topIssues.length === 0 ? "詳細分析がまだありません。AI課題診断を実施すると表示されます。" : null}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {d.topIssues.map((i, idx) => (
              <div key={i.axisKey} style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 13px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 19, height: 19, borderRadius: 6, background: COLORS.teal, color: COLORS.onAccent, fontSize: 11, fontWeight: 700, fontFamily: FONT_DISPLAY, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{idx + 1}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 0 }}>{i.axisLabel}</span>
                  {i.priority && <span style={{ fontSize: 10.5, color: priorityColor[i.priority] || COLORS.muted, flexShrink: 0 }}>{i.priority}</span>}
                </div>
                {i.currentState && <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 5, lineHeight: 1.7 }}>{i.currentState}</div>}
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard
          title="今、御社に必要な経験"
          empty={d.topMatches.length === 0 ? "推奨できる人材がまだいません。" : null}
        >
          {d.topMatches.slice(0, MAX_ROWS).map((t) => (
            <DashboardMatchRow
              key={t.id}
              name={t.name}
              sub={t.role}
              match={t.match}
              avatar={<TalentAvatar talentId={t.id} name={t.name} photoUpdatedAt={t.photoUpdatedAt} size={34} />}
            />
          ))}
        </DashboardCard>

        <DashboardCard
          title="進行中プロジェクト"
          action={d.projects.length > 0 ? <button className="btn-ghost" onClick={onOpenProjects} style={{ fontSize: 11, padding: "4px 11px" }}>すべて見る</button> : null}
          empty={d.projects.length === 0 ? "進行中のプロジェクトはありません。契約が成立すると表示されます。" : null}
          spanAll
        >
          {d.projects.slice(0, MAX_ROWS * 2).map((p) => (
            <DashboardProjectRow key={p.id} p={p} onOpen={onOpenProjectDetail} />
          ))}
          <MoreLink count={d.projects.length - MAX_ROWS * 2} onClick={onOpenProjects} />
        </DashboardCard>
      </div>
    </div>
  );
}

function TalentDashboard({ onOpenProjects, onOpenProjectDetail, onBack }) {
  const [data, setData] = useState(
    viewCache.dashboard ? { loading: false, value: viewCache.dashboard, error: null } : { loading: true, value: null, error: null }
  );
  const [suggestions, setSuggestions] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) viewCache.dashboard = d;
        setData({ loading: false, value: d, error: d.error || null });
      })
      .catch(() => setData((prev) => (prev.value ? prev : { loading: false, value: null, error: "取得に失敗しました" })));
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
          <div style={{ color: COLORS.muted, fontSize: 13 }}>{data.error || "まだスキルマップがありません。"}</div>
      </div>
    );
  }

  const d = data.value;
  const topStrengths = AXES.map((a) => ({ ...a, score: d.scores[a.key] })).sort((a, b) => b.score - a.score).slice(0, 3);
  const MAX_ROWS = 4; // 一覧はパネル内に4件まで。残りは「他N件」からそれぞれの画面へ

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 21, fontWeight: 700, margin: 0 }}>{d.talentName}</h1>
        {d.status === "pending" && <span style={{ fontSize: 11.5, color: COLORS.amber }}>現在、運営による審査中です</span>}
      </div>

      <div className="dash-stats">
        <DashboardStatCard label="進行中案件" value={d.projects.length} sub="件" tone={COLORS.amber} />
        <DashboardStatCard label="今月の稼働時間" value={<>{d.monthlyHours}<span style={{ fontSize: 13, color: COLORS.faint, fontWeight: 500 }}>h</span></>} tone={COLORS.teal} />
        <DashboardStatCard
          label="未完了タスク"
          value={d.upcomingTasks.length}
          sub="件"
          accent={d.upcomingTasks.length > 0 ? COLORS.tealDim : COLORS.text}
          tone={d.upcomingTasks.length > 0 ? COLORS.teal : COLORS.success}
        />
        <DashboardStatCard
          label="企業からの評価"
          value={d.avgRating != null ? <>★ {d.avgRating}</> : "—"}
          sub={d.avgRating != null ? `${d.ratingCount}件の評価` : "まだ評価はありません"}
          accent={d.avgRating != null ? COLORS.teal : undefined}
          tone={COLORS.success}
        />
      </div>

      <div className="dash-grid">
        <DashboardCard title="あなたの強み">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topStrengths.map((a) => (
              <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, width: 104, flexShrink: 0 }}>{a.label}</span>
                <span className="mini-bar"><span style={{ width: `${Math.round((a.score / 30) * 100)}%` }} /></span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: COLORS.tealDim, flexShrink: 0 }}>{a.score}<span style={{ color: COLORS.faint }}>/30</span></span>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard
          title="未完了のタスク"
          empty={d.upcomingTasks.length === 0 ? "未完了のタスクはありません。" : null}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {d.upcomingTasks.slice(0, MAX_ROWS).map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 9, background: (TASK_STATUS_META[t.status] || TASK_STATUS_META.todo).rowBg, border: `1px solid ${COLORS.border}`, borderLeft: `4px solid ${(TASK_STATUS_META[t.status] || TASK_STATUS_META.todo).bar}`, borderRadius: 8, padding: "7px 12px", fontSize: 12 }}>
                <TaskStatusBadge status={t.status} size="sm" />
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                <span style={{ color: COLORS.faint, flexShrink: 0, fontSize: 10.5 }}>{t.companyName}</span>
              </div>
            ))}
          </div>
          <MoreLink count={d.upcomingTasks.length - MAX_ROWS} onClick={onOpenProjects} />
        </DashboardCard>

        <DashboardCard
          title="推奨案件"
          empty={d.topMatches.length === 0 ? "推奨できる案件がまだありません。" : null}
        >
          {d.topMatches.slice(0, MAX_ROWS).map((c) => (
            <DashboardMatchRow key={c.id} name={c.name} sub={c.phase} match={c.match} />
          ))}
        </DashboardCard>

        <DashboardCard
          title="プロフィール改善案"
          action={
            <button className="btn-ghost" onClick={generateSuggestions} disabled={suggestLoading} style={{ fontSize: 11, padding: "4px 11px" }}>
              {suggestLoading ? "生成中…" : suggestions ? "再生成" : "AIに相談"}
            </button>
          }
        >
          {suggestError && <div style={{ fontSize: 12, color: COLORS.tealDim }}>{suggestError}</div>}
          {suggestions ? (
            <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12, color: COLORS.muted, lineHeight: 1.9 }}>
              {suggestions.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          ) : (
            !suggestError && (
              <div style={{ fontSize: 12, color: COLORS.faint, lineHeight: 1.8 }}>
                現在のプロフィールとスキルマップをもとに、企業から見つけてもらいやすくするための改善案をAIが提案します。
              </div>
            )
          )}
        </DashboardCard>

        <DashboardCard
          title="進行中案件"
          action={d.projects.length > 0 ? <button className="btn-ghost" onClick={onOpenProjects} style={{ fontSize: 11, padding: "4px 11px" }}>すべて見る</button> : null}
          empty={d.projects.length === 0 ? "進行中の案件はありません。契約が成立すると表示されます。" : null}
          spanAll
        >
          {d.projects.slice(0, MAX_ROWS * 2).map((p) => (
            <DashboardProjectRow key={p.id} p={p} onOpen={onOpenProjectDetail} />
          ))}
          <MoreLink count={d.projects.length - MAX_ROWS * 2} onClick={onOpenProjects} />
        </DashboardCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 入出金 — 企業は「いつ・いくら支払うか」、人材は「いつ・いくら入金されるか」を月次で確認する。
// 金額は契約条件(Engagement)から算出した予定値で、運営が請求書/支払いを発行済みの月は
// その確定値とステータスを表示する(lib/paymentSchedule.js)。
// ---------------------------------------------------------------------------
const INVOICE_STATUS_LABEL = { draft: "準備中", sent: "請求済み", paid: "入金済み" };
const PAYOUT_STATUS_LABEL = { draft: "準備中", scheduled: "支払予定", paid: "支払済み" };

function PaymentStatusBadge({ status, isForecast, isCompany }) {
  const label = isForecast
    ? "予定"
    : (isCompany ? INVOICE_STATUS_LABEL : PAYOUT_STATUS_LABEL)[status] || status;
  const paid = status === "paid";
  return (
    <span style={{
      fontSize: 11, fontFamily: FONT_DISPLAY, fontWeight: 700, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap",
      background: paid ? COLORS.success : isForecast ? COLORS.surface : "#FFF3EA",
      color: paid ? COLORS.onAccent : isForecast ? COLORS.muted : COLORS.tealDim,
      border: `1.5px solid ${paid ? COLORS.success : isForecast ? COLORS.border : COLORS.teal}`,
    }}>
      {label}
    </span>
  );
}

function PaymentsView({ mode, onBack, onOpenProjectDetail }) {
  const [data, setData] = useState(viewCache.payments || null);
  const [errorMsg, setErrorMsg] = useState(null);
  const isCompany = mode === "company";

  useEffect(() => {
    fetch("/api/payments")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        viewCache.payments = d;
        setData(d);
      })
      .catch(() => { if (!viewCache.payments) setErrorMsg("入出金の予定を取得できませんでした。"); });
  }, []);

  const fmtDate = (d) => new Date(d).toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" });
  const sectionStyle = { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, marginBottom: 16 };

  // 直近の支払い/入金予定(未確定=予定の行のうち、期日が一番近いもの)
  const nextRow = (() => {
    if (!data) return null;
    const all = data.contracts.flatMap((c) => c.rows.filter((r) => r.status !== "paid").map((r) => ({ ...r, c })));
    if (!all.length) return null;
    return all.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
  })();

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>{isCompany ? "お支払い" : "入金予定"}</h1>
      <p style={{ color: COLORS.muted, fontSize: 13, margin: "0 0 20px", lineHeight: 1.8 }}>
        {isCompany
          ? "成立した契約ごとに、いつ・いくらお支払いいただくかを月単位で表示します。金額は契約条件にもとづく予定額で、請求書が発行済みの月はその金額が確定値です。"
          : "成立した契約ごとに、いつ・いくら入金されるかを月単位で表示します。表示は契約条件にもとづく予定額です。"}
      </p>

      <ErrorNote message={errorMsg} onRetry={() => window.location.reload()} />
      {!data && !errorMsg && <div style={{ color: COLORS.muted, fontSize: 13 }}>読み込み中…</div>}

      {data && data.contracts.length === 0 && (
        <div style={{ ...sectionStyle, color: COLORS.muted, fontSize: 13 }}>
          まだ成立した契約がありません。契約が成立すると、ここに{isCompany ? "お支払い" : "入金"}の予定が表示されます。
        </div>
      )}

      {nextRow && (
        <div style={{ ...sectionStyle, borderColor: COLORS.teal, borderWidth: 2 }}>
          <div style={{ fontSize: 11.5, color: COLORS.muted, marginBottom: 4 }}>次の{isCompany ? "お支払い" : "ご入金"}</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 24, color: COLORS.tealDim }}>{fmtDate(nextRow.dueDate)}</div>
          <div style={{ fontSize: 13.5, color: COLORS.text, marginTop: 4 }}>
            {nextRow.amount != null ? <span style={{ fontFamily: FONT_MONO, fontWeight: 600 }}>{nextRow.amount.toLocaleString()}円</span> : "金額未設定"}
            <span style={{ color: COLORS.muted, fontSize: 12 }}> ・ {nextRow.periodLabel} ・ {nextRow.c.counterpartName}</span>
          </div>
        </div>
      )}

      {data && data.contracts.map((c) => (
        <div key={c.engagementId} style={sectionStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5 }}>{c.projectName || c.counterpartName}</div>
            <span style={{ fontSize: 11.5, color: COLORS.muted }}>
              {c.status === "completed" ? "契約完了" : c.status === "paused" ? "一時停止" : "契約中"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 14 }}>
            {c.counterpartName}
            {c.monthlyHours ? ` ・ 月${c.monthlyHours}時間` : ""}
            {c.monthlyAmount != null ? ` ・ 月額${c.monthlyAmount.toLocaleString()}円` : ""}
            {c.startDate ? ` ・ ${fmtDate(c.startDate)}開始` : ""}
          </div>

          {c.rows.length === 0 ? (
            <div style={{ fontSize: 12.5, color: COLORS.faint }}>まだ対象期間がありません。</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {c.rows.map((r) => (
                <div
                  key={r.periodLabel}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                    background: r.isCurrentMonth ? "#FFF9F5" : COLORS.surfaceRaised,
                    border: `1px solid ${r.isCurrentMonth ? COLORS.teal : COLORS.border}`,
                    borderRadius: 10, padding: "11px 14px",
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 600, minWidth: 92 }}>{r.periodLabel}</span>
                  <span style={{ fontSize: 12, color: COLORS.muted, minWidth: 150 }}>
                    {isCompany ? "支払期日" : "入金予定日"} <span style={{ color: COLORS.text, fontWeight: 600 }}>{fmtDate(r.dueDate)}</span>
                  </span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 600, marginLeft: "auto" }}>
                    {r.amount != null ? `${r.amount.toLocaleString()}円` : "—"}
                  </span>
                  <PaymentStatusBadge status={r.status} isForecast={r.isForecast} isCompany={isCompany} />
                </div>
              ))}
            </div>
          )}

          {c.projectId && (
            <button className="btn-ghost" onClick={() => onOpenProjectDetail(c.projectId)} style={{ fontSize: 12, padding: "7px 16px", marginTop: 12 }}>
              プロジェクトを開く
            </button>
          )}
        </div>
      ))}

      {data && data.contracts.length > 0 && (
        <div style={{ fontSize: 11.5, color: COLORS.faint, lineHeight: 1.9, marginTop: 4 }}>
          ※ 月末締め。{isCompany
            ? `お支払い期日は締め日の翌月末（締め日から${DEFAULT_SCHEDULE.companyDueMonthOffset}ヶ月後の末日）です。`
            : `入金日は締め日の翌々月${DEFAULT_SCHEDULE.talentPayoutDay}日（企業からのご入金を確認のうえお振り込みします）です。`}
          期日が土日に当たる場合は前営業日となります（祝日は考慮していません）。<br />
          ※「予定」と表示されている月は、運営が請求書{isCompany ? "" : "・支払い"}を発行する前の概算です。実際の金額・期日は発行時に確定します。
        </div>
      )}
    </div>
  );
}

// 報酬の振込先口座。機微情報のため、保存済みの口座番号は末尾3桁だけを返す設計
// (フルの値はDBにのみ存在し、画面には出さない)。変更するときは入れ直す。
const ACCOUNT_TYPE_OPTIONS = ["普通", "当座"];

function TalentBankAccountField() {
  const [account, setAccount] = useState(null); // 保存済み(マスク済み)の内容
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ bankName: "", branchName: "", accountType: "普通", accountNumber: "", accountHolder: "" });
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const load = async () => {
    try {
      const res = await fetch("/api/talent/bank-account");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setAccount(d.account);
    } catch (e) {
      setErrorMsg("振込先口座の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const startEdit = () => {
    // 口座番号だけは復元できない(マスクしか持っていない)ため、必ず入れ直してもらう
    setForm({
      bankName: account?.bankName || "",
      branchName: account?.branchName || "",
      accountType: account?.accountType || "普通",
      accountNumber: "",
      accountHolder: account?.accountHolder || "",
    });
    setErrorMsg(null);
    setEditing(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/talent/bank-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "保存に失敗しました");
      setAccount(d.account);
      setEditing(false);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("idle");
    }
  };

  const remove = async () => {
    if (!window.confirm("登録済みの振込先口座を削除しますか?")) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/talent/bank-account", { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "削除に失敗しました");
      setAccount(null);
      setEditing(false);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setStatus("idle");
    }
  };

  const box = { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, marginBottom: 20 };

  return (
    <div style={box}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>振込先口座</div>
      <p style={{ fontSize: 11.5, color: COLORS.faint, margin: "0 0 16px", lineHeight: 1.8 }}>
        報酬のお振り込み先です。登録後は<strong style={{ color: COLORS.muted }}>口座番号の末尾3桁のみ</strong>を表示します(確認用)。BATTER BOXの運営以外がこの情報を見ることはありません。
      </p>

      {loading ? (
        <div style={{ fontSize: 13, color: COLORS.muted }}>読み込み中…</div>
      ) : editing ? (
        <form onSubmit={submit}>
          <div className="two-col" style={{ display: "grid", gap: 14, marginBottom: 14 }}>
            <div>
              <label className="field-label">金融機関名</label>
              <input className="field-input" required placeholder="例: みずほ銀行" value={form.bankName} onChange={set("bankName")} />
            </div>
            <div>
              <label className="field-label">支店名</label>
              <input className="field-input" required placeholder="例: 渋谷支店" value={form.branchName} onChange={set("branchName")} />
            </div>
          </div>
          <div className="two-col" style={{ display: "grid", gap: 14, marginBottom: 14 }}>
            <div>
              <label className="field-label">預金種別</label>
              <select className="field-select" value={form.accountType} onChange={set("accountType")}>
                {ACCOUNT_TYPE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">口座番号(数字7桁)</label>
              <input className="field-input" required inputMode="numeric" placeholder="1234567" value={form.accountNumber} onChange={set("accountNumber")} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="field-label">口座名義(カナ)</label>
            <input className="field-input" required placeholder="ﾔﾏﾀﾞ ﾀﾛｳ" value={form.accountHolder} onChange={set("accountHolder")} />
            <p style={{ fontSize: 11, color: COLORS.faint, margin: "6px 0 0" }}>全角カナで入力しても半角カナに自動変換されます。漢字・ひらがなは使えません。</p>
          </div>
          <ErrorNote message={errorMsg} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16, flexWrap: "wrap" }}>
            <button type="button" className="btn-ghost" onClick={() => { setEditing(false); setErrorMsg(null); }} disabled={status === "saving"}>キャンセル</button>
            <button className="btn-primary" type="submit" disabled={status === "saving"}>{status === "saving" ? "保存中…" : "保存する"}</button>
          </div>
        </form>
      ) : account ? (
        <>
          <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", fontSize: 13, lineHeight: 2 }}>
            <div>{account.bankName} {account.branchName}</div>
            <div>{account.accountType} <span style={{ fontFamily: FONT_MONO }}>{account.accountNumberMasked}</span></div>
            <div style={{ fontFamily: FONT_MONO }}>{account.accountHolder}</div>
          </div>
          <ErrorNote message={errorMsg} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14, flexWrap: "wrap" }}>
            <button type="button" className="btn-ghost" onClick={remove} disabled={status === "saving"} style={{ fontSize: 12.5, padding: "8px 16px" }}>削除</button>
            <button type="button" className="btn-ghost" onClick={startEdit} style={{ fontSize: 12.5, padding: "8px 16px" }}>変更する</button>
          </div>
          {status === "saved" && <div style={{ fontSize: 12, color: COLORS.successDim, textAlign: "right", marginTop: 6 }}>保存しました ✓</div>}
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 14 }}>まだ登録されていません。契約完了後のお振り込みに必要です。</div>
          <ErrorNote message={errorMsg} />
          <button type="button" className="btn-primary" onClick={startEdit} style={{ fontSize: 13, padding: "10px 22px" }}>振込先口座を登録する</button>
        </>
      )}
    </div>
  );
}

function SettingsView({ mode, user, profile, onBack, onProfileSaved }) {
  // 顔写真は /api/talent/photo で個別に保存するため、プロフィールフォームとは別に状態を持つ
  const [photoUpdatedAt, setPhotoUpdatedAt] = useState(profile.data?.photoUpdatedAt || null);
  useEffect(() => { setPhotoUpdatedAt(profile.data?.photoUpdatedAt || null); }, [profile.data?.photoUpdatedAt]);

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: "0 0 20px" }}>設定</h1>
      {user.companyId || user.talentId ? (
        mode === "company" ? (
          <ProfileFieldsCompany initial={profile.data?.companyForm} onSaved={onProfileSaved} />
        ) : (
          <>
            <TalentPhotoField
              talentId={profile.data?.talentId || user.talentId}
              name={profile.data?.talentForm?.name}
              photoUpdatedAt={photoUpdatedAt}
              onChange={setPhotoUpdatedAt}
            />
            <ProfileFieldsTalent initial={profile.data?.talentForm} onSaved={onProfileSaved} />
          </>
        )
      ) : (
        <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, marginBottom: 20, fontSize: 13, color: COLORS.muted }}>
          {mode === "company" ? "AI課題診断を一度完了すると、企業情報をここで編集できるようになります。" : "スキルマップ作成を一度完了すると、プロフィールをここで編集できるようになります。"}
        </div>
      )}
      {mode === "talent" && user.talentId && <TalentBankAccountField />}
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
  const [unreadCount, setUnreadCount] = useState(0);
  const initializedViewRef = useRef(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setAuthState({ loading: false, user: data.user }))
      .catch(() => setAuthState({ loading: false, user: null }));
  }, []);

  // /app?project=<id> で開かれた場合は、そのプロジェクト詳細を直接表示する
  // (メール内のリンクや /app/projects/[id] からのリダイレクトで使う)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pid = new URLSearchParams(window.location.search).get("project");
    if (pid) {
      setActiveProjectId(pid);
      setView("projectDetail");
      initializedViewRef.current = true; // マイページ自動オープンに上書きさせない
    }
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

  // 未読メッセージ数を取得してナビの「メッセージ」バッジに表示する。
  // 画面遷移のたび+60秒ごとに再取得する(スレッドを開くとサーバー側で既読になり、次の取得で消える)。
  useEffect(() => {
    if (!authState.user || authState.user.role === "admin") return;
    let alive = true;
    const fetchUnread = () =>
      fetch("/api/messages/unread-count")
        .then((r) => r.json())
        .then((d) => { if (alive && typeof d.count === "number") setUnreadCount(d.count); })
        .catch(() => {});
    fetchUnread();
    const timer = setInterval(fetchUnread, 60000);
    return () => { alive = false; clearInterval(timer); };
  }, [authState.user, view]);

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
  // メッセージ画面から「戻る」で開いた元の画面(マイページ/一覧/マッチング等)に正しく戻すための記録。
  // 以前は一律で診断フロー(view="flow")に戻していたため、「戻ったら診断画面だった」という混乱があった。
  const [inboxOrigin, setInboxOrigin] = useState(null);
  const [threadOrigin, setThreadOrigin] = useState(null);
  const openThread = (matchId, counterpartName, draftMessage, draftPending) => { setThreadOrigin(view); setActiveThread({ matchId, counterpartName, draftMessage, draftPending }); setView("thread"); };
  const openInbox = () => { setInboxOrigin(view); setView("inbox"); };
  // 上部のステップ表示(企業情報/AI課題診断/Growth Map/人材提案)をクリックして、
  // 完了済みのステップに戻れるようにする。データは各stepでstateに保持済みのため再取得は不要。
  const goToStep = (idx) => { setStep(idx); setView("flow"); };

  const goToMyPage = () => setView("mypage");
  // スキルマップ作成済みのユーザーの「ホーム」はマイページ。未作成なら診断フロー。
  const homeView = profile.data?.hasData ? "mypage" : "flow";
  const backHome = () => setView(homeView);
  const backFromInbox = () => setView(inboxOrigin && !["inbox", "thread"].includes(inboxOrigin) ? inboxOrigin : homeView);
  const backFromThread = () => setView(threadOrigin === "inbox" ? "inbox" : threadOrigin && threadOrigin !== "thread" ? threadOrigin : homeView);
  const openDashboard = () => setView("dashboard");
  const openSettings = () => setView("settings");
  const openCompare = () => setView("compare");
  const openProjects = () => setView("projects");
  const openPayments = () => setView("payments");
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
    setCompanyResult({ scores: profile.data.scores, summary: profile.data.summary, axisNotes: profile.data.axisNotes, topIssueDetails: profile.data.topIssueDetails, companySkillMapId: profile.data.companySkillMapId });
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
  // メインメニュー。デスクトップではヘッダーのボタン列、モバイルでは画面下部の固定タブとして表示する。
  const activeNavKey =
    view === "thread" ? "inbox" : view === "projectDetail" ? "projects" : view;
  const navItems = [
    ...(profile.data?.hasData ? [{ key: "mypage", label: "マイページ", Icon: UserRound, onClick: goToMyPage }] : []),
    { key: "inbox", label: "メッセージ", Icon: Send, onClick: openInbox, badge: unreadCount },
    ...(profile.data?.hasData ? [{ key: "dashboard", label: "ダッシュボード", Icon: LayoutDashboard, onClick: openDashboard }] : []),
    { key: "projects", label: "プロジェクト", Icon: ClipboardList, onClick: openProjects },
    // 企業は「いつ支払うか」、人材は「いつ入金されるか」。同じ画面をロール別の見出しで出す。
    { key: "payments", label: mode === "company" ? "お支払い" : "入金予定", Icon: Wallet, onClick: openPayments },
    { key: "settings", label: "設定", Icon: Settings, onClick: openSettings },
  ].map((item) => ({ ...item, active: item.key === activeNavKey }));
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; };
  const headerRight = (
    <>
      <div className="top-nav">
        {navItems.map(({ key, label, Icon, onClick, active, badge }) => (
          <button key={key} className={`btn-ghost${active ? " nav-active" : ""}`} onClick={onClick} style={{ padding: "8px 14px", fontSize: 13 }}>
            <Icon size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            {label}
            {badge > 0 && <span className="nav-badge">{badge > 9 ? "9+" : badge}</span>}
          </button>
        ))}
      </div>
      <button className="btn-ghost" onClick={logout} title="ログアウト" aria-label="ログアウト" style={{ padding: "8px 11px" }}>
        <LogOut size={15} />
      </button>
    </>
  );

  if (view === "dashboard" && profile.data?.hasData) {
    return (
      <Shell step={step} steps={null} headerRight={headerRight} nav={navItems} wide>
        {mode === "company" ? (
          <CompanyDashboard onOpenProjects={openProjects} onOpenProjectDetail={openProjectDetail} onBack={backHome} />
        ) : (
          <TalentDashboard onOpenProjects={openProjects} onOpenProjectDetail={openProjectDetail} onBack={backHome} />
        )}
      </Shell>
    );
  }

  if (view === "mypage" && profile.data?.hasData) {
    return (
      <Shell step={step} steps={null} headerRight={headerRight} nav={navItems}>
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
      <Shell step={step} steps={null} headerRight={headerRight} nav={navItems}>
        <SettingsView mode={mode} user={authState.user} profile={profile} onBack={backHome} onProfileSaved={handleProfileSaved} />
      </Shell>
    );
  }

  if (view === "payments") {
    return (
      <Shell step={step} steps={null} headerRight={headerRight} nav={navItems} wide>
        <PaymentsView mode={mode} onBack={backHome} onOpenProjectDetail={openProjectDetail} />
      </Shell>
    );
  }

  if (view === "compare") {
    return (
      <Shell step={step} steps={null} headerRight={headerRight} nav={navItems}>
        <ComparisonView onBack={backHome} />
      </Shell>
    );
  }

  if (view === "projects") {
    return (
      <Shell step={step} steps={null} headerRight={headerRight} nav={navItems} wide>
        <ProjectsListView onOpenProject={openProjectDetail} onBack={backHome} />
      </Shell>
    );
  }

  if (view === "projectDetail" && activeProjectId) {
    return (
      <Shell step={step} steps={null} headerRight={headerRight} nav={navItems}>
        <ProjectDetailView projectId={activeProjectId} onBack={openProjects} />
      </Shell>
    );
  }

  if (view === "inbox") {
    return (
      <Shell step={step} steps={null} headerRight={headerRight} nav={navItems}>
        <Inbox onOpenThread={openThread} onBack={backFromInbox} />
      </Shell>
    );
  }
  if (view === "thread" && activeThread) {
    return (
      <Shell step={step} steps={null} headerRight={headerRight} nav={navItems}>
        <MessageThread matchId={activeThread.matchId} counterpartName={activeThread.counterpartName} initialDraft={activeThread.draftMessage} draftPending={activeThread.draftPending} onBack={backFromThread} backLabel={threadOrigin === "inbox" ? "← メッセージ一覧に戻る" : threadOrigin === "mypage" ? "← マイページに戻る" : "← 戻る"} />
      </Shell>
    );
  }

  if (mode === "company") {
    return (
      <Shell step={step} steps={COMPANY_STEPS} headerRight={headerRight} onStepClick={goToStep} nav={navItems}>
        {step === 1 && <StepCompany onNext={(form) => { setCompany(form); setStep(2); }} initialForm={company} />}
        {step === 2 && (
          <StepDialog
            companyForm={company}
            onNext={(scores, summary, axisNotes, topIssueDetails, history, companySkillMapId) => { setCompanyResult({ scores, summary, axisNotes, topIssueDetails, companySkillMapId }); setStep(3); }}
          />
        )}
        {step === 3 && <StepSkillMap scores={companyResult.scores} summary={companyResult.summary} axisNotes={companyResult.axisNotes} topIssueDetails={companyResult.topIssueDetails} companyForm={company} companySkillMapId={companyResult.companySkillMapId} onNext={() => setStep(4)} />}
        {step === 4 && (
          <StepTalentProposal companyScores={companyResult.scores} companyPhase={company.phase} companyIndustry={company.industry} onRestart={reset} onOpenThread={openThread} />
        )}
      </Shell>
    );
  }

  return (
    <Shell step={step} steps={TALENT_STEPS} headerRight={headerRight} onStepClick={goToStep} nav={navItems}>
      {step === 1 && <StepTalentInput onNext={(form) => { setTalent(form); setStep(2); }} initialForm={talent} />}
      {step === 2 && (
        <StepTalentDialogue
          talentForm={talent}
          onNext={(result) => { setTalentResult({ ...result, fallback: false }); setStep(3); }}
        />
      )}
      {step === 3 && <StepTalentSkillMap name={talent.name} scores={talentResult.scores} fit={talentResult} talentForm={talent} talentSkillMapId={talentResult.talentSkillMapId} onNext={() => setStep(4)} />}
      {step === 4 && (
        <StepTalentMatches talentScores={talentResult.scores} talentPhases={talentResult.phases} onRestart={reset} onOpenThread={openThread} />
      )}
    </Shell>
  );
}
