"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { COLORS, FONT_DISPLAY, FONT_MONO, GlobalStyle } from "@/lib/theme";

// このページは app/app/page.jsx のSPA内蔵版(view="projectDetail")とは独立した実装です。
// 巨大化した既存SPAファイルを変更せずに、共有・ブックマーク可能な実URL(/app/projects/[id])を
// 提供することだけを目的にしています。両方とも同じAPI(/api/projects/[id]等)を叩くため、
// 表示内容は基本的に一致します。

async function postJSON(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `request failed: ${url}`);
  return data;
}
async function postPatch(url, body) {
  const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `request failed: ${url}`);
  return data;
}

const sectionStyle = { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, marginBottom: 16 };
const sectionTitleStyle = { fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5, marginBottom: 12 };

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [myRole, setMyRole] = useState(null);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [newTask, setNewTask] = useState("");
  const [newKpiName, setNewKpiName] = useState("");
  const [newKpiTarget, setNewKpiTarget] = useState("");
  const [newKpiUnit, setNewKpiUnit] = useState("");
  const [workLogDesc, setWorkLogDesc] = useState("");
  const [workLogHours, setWorkLogHours] = useState("");
  const [commentText, setCommentText] = useState("");
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [rating, setRating] = useState(null);
  const [ratingInput, setRatingInput] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSaving, setRatingSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) { router.replace("/login"); return; }
        setMyRole(d.user.role);
        setAuthChecked(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  const loadRating = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/rating`);
      const d = await res.json();
      if (res.ok) {
        setRating(d.rating);
        if (d.rating) { setRatingInput(d.rating.rating); setRatingComment(d.rating.comment || ""); }
      }
    } catch (e) { /* 評価取得の失敗は致命的ではないので無視 */ }
  };

  const submitRating = async (e) => {
    e.preventDefault();
    setRatingSaving(true);
    try {
      await postJSON(`/api/projects/${id}/rating`, { rating: ratingInput, comment: ratingComment.trim() || undefined });
      await loadRating();
    } catch (e) {
      setErrorMsg("評価の保存に失敗しました。");
    } finally {
      setRatingSaving(false);
    }
  };

  const load = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setData(d);
    } catch (e) {
      setErrorMsg(e.message || "プロジェクトの取得に失敗しました。");
    }
  };

  useEffect(() => { if (authChecked) { load(); loadRating(); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [authChecked, id]);

  const cycleTaskStatus = async (task) => {
    const next = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    await postPatch(`/api/projects/${id}/tasks/${task.id}`, { status: next });
    load();
  };
  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    await postJSON(`/api/projects/${id}/tasks`, { title: newTask.trim() });
    setNewTask("");
    load();
  };
  const addKpi = async (e) => {
    e.preventDefault();
    if (!newKpiName.trim()) return;
    await postJSON(`/api/projects/${id}/kpis`, { name: newKpiName.trim(), targetValue: newKpiTarget || null, unit: newKpiUnit || null });
    setNewKpiName(""); setNewKpiTarget(""); setNewKpiUnit("");
    load();
  };
  const updateKpiValue = async (kpiId, value) => {
    await postPatch(`/api/projects/${id}/kpis/${kpiId}`, { currentValue: value === "" ? null : value });
    load();
  };
  const addWorkLog = async (e) => {
    e.preventDefault();
    if (!workLogDesc.trim() || !workLogHours) return;
    await postJSON(`/api/projects/${id}/worklogs`, { description: workLogDesc.trim(), hours: workLogHours });
    setWorkLogDesc(""); setWorkLogHours("");
    load();
  };
  const addComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await postJSON(`/api/projects/${id}/comments`, { body: commentText.trim() });
    setCommentText("");
    load();
  };
  const generatePlan = async () => {
    setPlanLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}/plan`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setPlan(d.plan);
    } catch (e) {
      setErrorMsg("プランの生成に失敗しました。");
    } finally {
      setPlanLoading(false);
    }
  };
  const generateReview = async () => {
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}/summary`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setReview(d.review);
    } catch (e) {
      setErrorMsg("AIレビューの生成に失敗しました。");
    } finally {
      setReviewLoading(false);
    }
  };

  const taskStatusLabel = { todo: "未着手", in_progress: "進行中", done: "完了" };

  return (
    <div className="app-root">
      <GlobalStyle />
      <div style={{ position: "relative", maxWidth: 880, margin: "0 auto", padding: "48px 24px 80px" }}>
        <a href="/app" className="btn-ghost" style={{ marginBottom: 16, display: "inline-block" }}>← アプリに戻る</a>

        {!authChecked && <div style={{ color: COLORS.muted, fontSize: 13 }}>確認中…</div>}
        {authChecked && errorMsg && !data && (
          <div style={{ color: COLORS.tealDim, fontSize: 13 }}>
            {errorMsg}
            <button className="btn-ghost" onClick={load} style={{ marginLeft: 10 }}>再試行</button>
          </div>
        )}
        {authChecked && !data && !errorMsg && <div style={{ color: COLORS.muted, fontSize: 13 }}>読み込み中…</div>}

        {authChecked && data && (
          <>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{data.project.name}</h1>
            <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 20 }}>
              対象課題: {data.project.targetAxisLabel || "未設定"} ・ 月間稼働: {data.project.monthlyHours ?? "—"}時間
              {data.project.currentMonthGoal && <> ・ 今月の目標: {data.project.currentMonthGoal}</>}
            </div>

            <div style={sectionStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={sectionTitleStyle}>BATTER BOX 90 DAYS PLAN</div>
                <button className="btn-ghost" onClick={generatePlan} disabled={planLoading} style={{ fontSize: 12, padding: "6px 14px" }}>
                  {planLoading ? "生成中…" : plan ? "再生成する" : "プランを生成"}
                </button>
              </div>
              {plan ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {plan.map((m) => (
                    <div key={m.month}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{m.month}｜{m.title}</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: COLORS.muted, lineHeight: 1.8 }}>
                        {m.items.map((it, i) => <li key={i}>{it}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: COLORS.faint }}>まだ生成していません。</div>
              )}
            </div>

            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>タスク</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {data.tasks.map((t) => (
                  <button key={t.id} onClick={() => cycleTaskStatus(t)} style={{ display: "flex", justifyContent: "space-between", width: "100%", textAlign: "left", background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13 }}>
                    <span>{t.title}</span>
                    <span style={{ color: t.status === "done" ? COLORS.teal : COLORS.muted, fontSize: 11.5 }}>{taskStatusLabel[t.status]}</span>
                  </button>
                ))}
                {data.tasks.length === 0 && <div style={{ fontSize: 12.5, color: COLORS.faint }}>まだタスクがありません。</div>}
              </div>
              <form onSubmit={addTask} style={{ display: "flex", gap: 8 }}>
                <input className="field-input" placeholder="新しいタスク" value={newTask} onChange={(e) => setNewTask(e.target.value)} />
                <button className="btn-ghost" type="submit">追加</button>
              </form>
            </div>

            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>KPI</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {data.kpis.map((k) => (
                  <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <span style={{ flex: 1 }}>{k.name}</span>
                    <input
                      className="field-input" style={{ width: 90 }} type="number" defaultValue={k.currentValue ?? ""}
                      onBlur={(e) => updateKpiValue(k.id, e.target.value)} placeholder="実績値"
                    />
                    <span style={{ color: COLORS.faint, fontSize: 12 }}>/ {k.targetValue ?? "—"} {k.unit || ""}</span>
                  </div>
                ))}
                {data.kpis.length === 0 && <div style={{ fontSize: 12.5, color: COLORS.faint }}>まだKPIがありません。</div>}
              </div>
              <form onSubmit={addKpi} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input className="field-input" style={{ flex: 1, minWidth: 120 }} placeholder="KPI名" value={newKpiName} onChange={(e) => setNewKpiName(e.target.value)} />
                <input className="field-input" style={{ width: 90 }} placeholder="目標値" value={newKpiTarget} onChange={(e) => setNewKpiTarget(e.target.value)} />
                <input className="field-input" style={{ width: 70 }} placeholder="単位" value={newKpiUnit} onChange={(e) => setNewKpiUnit(e.target.value)} />
                <button className="btn-ghost" type="submit">追加</button>
              </form>
            </div>

            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>稼働ログ</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {data.workLogs.map((w) => (
                  <div key={w.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: COLORS.muted }}>
                    <span>{w.description}</span>
                    <span style={{ fontFamily: FONT_MONO }}>{w.hours}h ・ {new Date(w.loggedAt).toLocaleDateString("ja-JP")}</span>
                  </div>
                ))}
                {data.workLogs.length === 0 && <div style={{ fontSize: 12.5, color: COLORS.faint }}>まだ記録がありません。</div>}
              </div>
              <form onSubmit={addWorkLog} style={{ display: "flex", gap: 8 }}>
                <input className="field-input" style={{ flex: 1 }} placeholder="内容" value={workLogDesc} onChange={(e) => setWorkLogDesc(e.target.value)} />
                <input className="field-input" style={{ width: 80 }} type="number" step="0.5" placeholder="時間" value={workLogHours} onChange={(e) => setWorkLogHours(e.target.value)} />
                <button className="btn-ghost" type="submit">記録</button>
              </form>
            </div>

            <div style={sectionStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={sectionTitleStyle}>AI進捗サマリー / 月次レビュー</div>
                <button className="btn-ghost" onClick={generateReview} disabled={reviewLoading} style={{ fontSize: 12, padding: "6px 14px" }}>
                  {reviewLoading ? "生成中…" : "AIレビューを生成"}
                </button>
              </div>
              {review ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5 }}>
                  {Object.entries(review).map(([k, v]) => (
                    <div key={k}><span style={{ color: COLORS.muted }}>{k}: </span>{v}</div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: COLORS.faint }}>「AIレビューを生成」を押すと、現在のタスク・KPI・稼働ログ・コメントから進捗レビューを作成します。</div>
              )}
            </div>

            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>企業からの評価</div>
              {myRole === "company" ? (
                <form onSubmit={submitRating} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n} type="button" onClick={() => setRatingInput(n)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: n <= ratingInput ? COLORS.amber : COLORS.border, padding: 0, lineHeight: 1 }}
                      >★</button>
                    ))}
                    <span style={{ fontSize: 12, color: COLORS.muted, marginLeft: 6 }}>{ratingInput} / 5</span>
                  </div>
                  <input className="field-input" placeholder="コメント(任意)" value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} />
                  <button className="btn-ghost" type="submit" disabled={ratingSaving} style={{ alignSelf: "flex-start" }}>
                    {ratingSaving ? "保存中…" : rating ? "評価を更新" : "評価を送信"}
                  </button>
                </form>
              ) : (
                rating ? (
                  <div>
                    <div style={{ fontSize: 18, color: COLORS.amber, marginBottom: 4 }}>{"★".repeat(rating.rating)}{"☆".repeat(5 - rating.rating)}</div>
                    {rating.comment && <div style={{ fontSize: 12.5, color: COLORS.muted }}>{rating.comment}</div>}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: COLORS.faint }}>まだ評価はありません。</div>
                )
              )}
            </div>

            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>コメント</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {data.comments.map((c) => (
                  <div key={c.id} style={{ fontSize: 12.5 }}>
                    <span style={{ color: COLORS.teal }}>{c.authorRole === "company" ? "企業" : "人材"}</span>
                    <span style={{ color: COLORS.faint, marginLeft: 8 }}>{new Date(c.createdAt).toLocaleString("ja-JP")}</span>
                    <div style={{ marginTop: 2 }}>{c.body}</div>
                  </div>
                ))}
                {data.comments.length === 0 && <div style={{ fontSize: 12.5, color: COLORS.faint }}>まだコメントがありません。</div>}
              </div>
              <form onSubmit={addComment} style={{ display: "flex", gap: 8 }}>
                <input className="field-input" style={{ flex: 1 }} placeholder="コメントを入力…" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                <button className="btn-ghost" type="submit">送信</button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
