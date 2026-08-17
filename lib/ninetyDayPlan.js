import { callClaudeJSON } from "@/lib/claude";

function buildSystemPrompt() {
  return `あなたはBATTER BOXというプラットフォーム上で、伴走プロジェクトの90日間の実行プランを設計するアシスタントです。抽象的な一般論ではなく、対象課題に即した具体的な行動項目を書いてください。必ず日本語で、JSON以外の文字を一切含まない出力のみを返してください。`;
}

function buildPrompt({ name, targetAxisLabel, currentMonthGoal, monthlyHours }) {
  return `プロジェクト: ${name}
対象課題: ${targetAxisLabel || "未設定"}
今月の目標: ${currentMonthGoal || "未設定"}
月間稼働時間: ${monthlyHours || "未設定"}時間

タスク:
このプロジェクトの90日間(3ヶ月)の実行プランを作成してください。各月について、実施内容を3〜4項目、箇条書きで挙げてください。
- Month1(現状整理・設計): 現状分析、KPI整理、課題の優先順位付けなど、立ち上げ期にふさわしい内容
- Month2(実行): 施策の実行、運用開始、初期の改善サイクルなど
- Month3(定着・改善): 振り返り、社内メンバーへの引き継ぎ・移管、次フェーズの課題整理など

出力形式(JSONのみ):
{"month1": ["...", "...", "..."], "month2": ["...", "...", "..."], "month3": ["...", "...", "..."]}`;
}

// プロジェクトの90日間実行プランをAIに生成させる。失敗時はnullを返す。
export async function generate90DayPlan(project) {
  try {
    return await callClaudeJSON(buildSystemPrompt(), buildPrompt(project));
  } catch (e) {
    console.error("failed to generate 90-day plan:", e.message);
    return null;
  }
}
