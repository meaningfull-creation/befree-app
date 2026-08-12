import { prisma } from "@/lib/prisma";
import { callClaudeJSON } from "@/lib/claude";
import { AXES } from "@/lib/axes";
import { topMatchingAxes } from "@/lib/matching";

function buildReasonSystemPrompt() {
  return `あなたはスタートアップ支援の専門家です。企業の課題と実務経験者の強みを照らし合わせ、なぜこの組み合わせが良いマッチなのかを、経営者が読んで納得できる一行の日本語で説明します。誇張や一般論を避け、具体的な軸名に触れてください。必ず日本語で、JSON以外の文字を一切含まない出力のみを返してください。`;
}

function buildReasonPrompt(company, talent, matchScore, topAxes) {
  const axisLabel = Object.fromEntries(AXES.map((a) => [a.key, a.label]));
  const topAxisLabels = topAxes.map((k) => axisLabel[k]).join("・");
  return `企業: ${company.name}(${company.phase || "フェーズ不明"})
企業の課題スキルマップ(0〜100点、低いほど深刻): ${JSON.stringify(company.skillMap)}
企業の直近の課題要約: ${company.summary || "(なし)"}

人材: ${talent.name}(${talent.title || "役職不明"})
人材のスキルマップ(0〜30点、高いほど強み): ${JSON.stringify(talent.skillMap)}
人材の総評: ${talent.summary || "(なし)"}

特に一致度が高い軸: ${topAxisLabels || "(明確な一致軸なし)"}
算出済みの適合度スコア: ${matchScore}%

タスク:
上記から、なぜこの人材がこの企業に合うのかを40〜70字程度の一行で説明してください。一致軸に具体的に触れること。

出力形式(JSONのみ):
{"reason": "..."}`;
}

// Match作成時に、企業・人材双方のスキルマップからAIが根拠文を生成する。
// 生成に失敗した場合はnullを返し、呼び出し側は根拠なしでMatchを作成する(処理は止めない)。
export async function generateMatchReason(companySkillMapId, talentSkillMapId, matchScore) {
  try {
    const [companySkillMap, talentSkillMap] = await Promise.all([
      prisma.companySkillMap.findUnique({ where: { id: companySkillMapId }, include: { company: true } }),
      prisma.talentSkillMap.findUnique({ where: { id: talentSkillMapId }, include: { talent: true } }),
    ]);
    if (!companySkillMap || !talentSkillMap) return null;

    const topAxes = topMatchingAxes(companySkillMap.axisScores, talentSkillMap.axisScores);

    const result = await callClaudeJSON(
      buildReasonSystemPrompt(),
      buildReasonPrompt(
        {
          name: companySkillMap.company.name,
          phase: companySkillMap.company.phase,
          skillMap: companySkillMap.axisScores,
          summary: companySkillMap.summary,
        },
        {
          name: talentSkillMap.talent.name,
          title: talentSkillMap.talent.title,
          skillMap: talentSkillMap.axisScores,
          summary: talentSkillMap.summary,
        },
        matchScore,
        topAxes
      )
    );
    return result.reason || null;
  } catch (e) {
    console.error("failed to generate match reason:", e.message);
    return null;
  }
}
