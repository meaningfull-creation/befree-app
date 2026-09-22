import { callClaudeJSON } from "@/lib/claude";

function buildSystemPrompt() {
  return `あなたはBATTER BOXというプラットフォーム上で、伴走プロジェクトの90日間の実行プランを設計するアシスタントです。抽象的な一般論ではなく、対象課題に即した具体的な行動項目を書いてください。必ず日本語で、JSON以外の文字を一切含まない出力のみを返してください。`;
}

function buildPrompt({ name, targetAxisLabel, currentMonthGoal, monthlyHours }) {
  const hours = Number(monthlyHours) || 10;
  return `プロジェクト: ${name}
対象課題: ${targetAxisLabel || "未設定"}
今月の目標: ${currentMonthGoal || "未設定"}
契約上の月間稼働時間: ${hours}時間

タスク:
このプロジェクトの90日間(3ヶ月)の実行プランと、進捗を測るKPIを設計してください。

プランの制約(最重要):
- 実行するのは月${hours}時間だけ稼働する外部の実務経験者1名。各月の項目の目安時間(hours)の合計は、必ず${hours}時間以内に収めること
- 各項目は「何をするか」が具体的で、担当者がそのまま着手できる粒度にすること
- Month 1(現状整理・設計): 現状分析、優先順位付け、初期設計など立ち上げ期の内容
- Month 2(実行): 施策の実行、運用開始、初期の改善サイクル
- Month 3(定着・改善): 振り返り、社内メンバーへの引き継ぎ、次フェーズの課題整理
- 各月3〜5項目

KPIの制約:
- 対象課題の進捗が数字で測れるKPIを2〜3個
- targetは90日後に目指す数値(現実的な水準)、unitは単位(件、%、時間など)

出力形式(JSONのみ):
{"months":[{"month":"Month 1","title":"現状整理・設計","items":[{"action":"...","hours":3},{"action":"...","hours":2}]},{"month":"Month 2","title":"実行","items":[...]},{"month":"Month 3","title":"定着・改善","items":[...]}],"kpis":[{"name":"...","target":10,"unit":"件"}]}`;
}

// AI出力を安全な形に整える(欠け・型ゆれ・時間の暴走を吸収する)
export function sanitizePlan(raw, monthlyHours) {
  const hours = Number(monthlyHours) || 10;
  const DEFAULT_TITLES = ["現状整理・設計", "実行", "定着・改善"];
  const months = (Array.isArray(raw?.months) ? raw.months : []).slice(0, 3).map((m, i) => ({
    month: typeof m?.month === "string" ? m.month.slice(0, 20) : `Month ${i + 1}`,
    title: typeof m?.title === "string" ? m.title.slice(0, 40) : DEFAULT_TITLES[i] || "",
    items: (Array.isArray(m?.items) ? m.items : [])
      .filter((it) => typeof it?.action === "string" && it.action.trim())
      .slice(0, 6)
      .map((it) => ({
        action: it.action.trim().slice(0, 200),
        hours: Number.isFinite(Number(it.hours)) ? Math.min(hours, Math.max(0.5, Math.round(Number(it.hours) * 2) / 2)) : null,
      })),
  }));
  const kpis = (Array.isArray(raw?.kpis) ? raw.kpis : [])
    .filter((k) => typeof k?.name === "string" && k.name.trim())
    .slice(0, 3)
    .map((k) => ({
      name: k.name.trim().slice(0, 60),
      target: Number.isFinite(Number(k.target)) ? Number(k.target) : null,
      unit: typeof k.unit === "string" ? k.unit.slice(0, 10) : null,
    }));
  if (months.length === 0) return null;
  return { months, kpis };
}

// プロジェクトの90日間実行プラン+KPI設計をAIに生成させる。失敗時はnullを返す。
export async function generate90DayPlan(project) {
  try {
    const raw = await callClaudeJSON(
      buildSystemPrompt(),
      buildPrompt(project),
      1800, // months+kpisのJSONに十分なサイズ(以前はデフォルト2000で形式も曖昧だった)
      { fast: true } // 「生成」ボタンの待ち時間を短くするため高速モデルを使う
    );
    return sanitizePlan(raw, project.monthlyHours);
  } catch (e) {
    console.error("failed to generate 90-day plan:", e.message);
    return null;
  }
}
