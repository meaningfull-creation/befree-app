import { callClaudeJSON } from "@/lib/claude";

function buildSystemPrompt() {
  return `あなたはBATTER BOXというプラットフォーム上で、伴走プロジェクトの進捗をレビューするアシスタントです。事実に基づいて簡潔に整理し、根拠のない誇張は避けてください。データが少ない場合は無理に多くを書かず、「記録がまだ少ない」旨を正直に書いてください。必ず日本語で、JSON以外の文字を一切含まない出力のみを返してください。`;
}

function buildPrompt({ project, tasks, kpis, workLogs, comments }) {
  const taskSummary = tasks.map((t) => `- [${t.status}] ${t.title}`).join("\n") || "(タスクなし)";
  const kpiSummary = kpis.map((k) => `- ${k.name}: ${k.currentValue ?? "未計測"} / 目標${k.targetValue ?? "未設定"}${k.unit || ""}`).join("\n") || "(KPIなし)";
  const workLogSummary = workLogs.slice(0, 20).map((w) => `- ${w.hours}h: ${w.description}`).join("\n") || "(稼働ログなし)";
  const commentSummary = comments.slice(-15).map((c) => `- [${c.authorRole === "company" ? "企業" : "人材"}] ${c.body}`).join("\n") || "(コメントなし)";

  return `プロジェクト: ${project.name}
対象課題: ${project.targetAxisLabel || "未設定"}
今月の目標: ${project.currentMonthGoal || "未設定"}
月間稼働時間: ${project.monthlyHours || "未設定"}時間

タスク一覧:
${taskSummary}

KPI:
${kpiSummary}

直近の稼働ログ:
${workLogSummary}

直近のコメント・議事メモ:
${commentSummary}

タスク:
上記のデータをもとに、以下7項目からなるレビューを生成してください。記録が少ない項目は「記録が少なく判断できません」のように正直に書いてください。
- 今月実施したこと(実施済み・進行中のタスク、稼働ログから読み取れる内容を40〜80字で)
- 達成したKPI(目標を満たしている、または大きく前進しているKPIを列挙。無ければ「該当なし」)
- 未達KPI(目標に届いていないKPIを列挙。無ければ「該当なし」)
- 課題(コメントやタスクの停滞から読み取れる課題があれば40〜80字で。無ければ「特筆すべき課題なし」)
- 来月の優先事項(40〜80字)
- 継続すべき施策(あれば。無ければ「判断材料が不足」)
- やめるべき施策(あれば。無ければ「該当なし」)

出力形式(JSONのみ):
{"achievements":"...","kpiAchieved":"...","kpiMissed":"...","issues":"...","nextPriorities":"...","continue":"...","stop":"..."}`;
}

// プロジェクトの現在の記録(タスク・KPI・稼働ログ・コメント)からAIレビューを生成する。
// 失敗時はnullを返す(呼び出し側でエラー表示する)。
export async function generateProjectReview({ project, tasks, kpis, workLogs, comments }) {
  try {
    const result = await callClaudeJSON(buildSystemPrompt(), buildPrompt({ project, tasks, kpis, workLogs, comments }));
    return result;
  } catch (e) {
    console.error("failed to generate project review:", e.message);
    return null;
  }
}
