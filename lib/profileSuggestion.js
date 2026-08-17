import { prisma } from "@/lib/prisma";
import { callClaudeJSON } from "@/lib/claude";
import { AXES } from "@/lib/axes";

function buildSystemPrompt() {
  return `あなたはBATTER BOXというプラットフォーム上で、実務経験者のプロフィールをより魅力的で伝わりやすくするための改善提案を行うアシスタントです。上から目線の指摘ではなく、実務者に寄り添う具体的で実行しやすい提案をしてください。必ず日本語で、JSON以外の文字を一切含まない出力のみを返してください。`;
}

function buildPrompt(talent, skillMap) {
  const axisLabel = Object.fromEntries(AXES.map((a) => [a.key, a.label]));
  const topAxes = AXES.map((a) => ({ label: axisLabel[a.key], score: skillMap.axisScores[a.key] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((a) => `${a.label}(${a.score}/30)`)
    .join("、");

  return `実務経験者のプロフィール:
氏名: ${talent.name}
直近の役職: ${talent.title || "未入力"}
主な業種経験: ${talent.industry || "未入力"}
実務経験年数: ${talent.years || "未入力"}
自己紹介: ${talent.bio || "(未入力)"}

AIが算出したスキルマップ上の強み(上位3軸): ${topAxes}

タスク:
このプロフィールを企業側の担当者が見たときに、より魅力が伝わりやすくなるための改善提案を3〜4個、それぞれ30〜60字程度で日本語で作成してください。
- 自己紹介が空欄・簡素な場合は、具体的に何を書くとよいかを提案すること
- スキルマップ上の強みが自己紹介の文章に反映されていない場合は、それに触れる提案をすること
- 抽象的な助言(「もっと詳しく書きましょう」等)ではなく、「〜について、具体的な数字や事例を1つ加えると説得力が増します」のような実行しやすい提案にすること

出力形式(JSONのみ):
{"suggestions": ["...", "...", "..."]}`;
}

// 人材のプロフィール改善案をAIに生成させる。生成に失敗した場合はnullを返す。
export async function generateProfileSuggestions(talentId) {
  try {
    const [talent, skillMap] = await Promise.all([
      prisma.talent.findUnique({ where: { id: talentId } }),
      prisma.talentSkillMap.findFirst({ where: { talentId }, orderBy: { createdAt: "desc" } }),
    ]);
    if (!talent || !skillMap) return null;

    const result = await callClaudeJSON(buildSystemPrompt(), buildPrompt(talent, skillMap));
    return Array.isArray(result.suggestions) ? result.suggestions.slice(0, 4) : null;
  } catch (e) {
    console.error("failed to generate profile suggestions:", e.message);
    return null;
  }
}
