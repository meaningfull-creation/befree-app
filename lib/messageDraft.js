import { callClaudeJSON } from "@/lib/claude";
import { AXES } from "@/lib/axes";
import { topMatchingAxes } from "@/lib/matching";

function buildDraftSystemPrompt() {
  return `あなたはBATTER BOXというプラットフォーム上で、初回メッセージの下書きを作成するアシスタントです。丁寧だが堅苦しすぎない、実務者同士のやり取りらしい自然な日本語で書きます。定型的な挨拶文の羅列や誇張表現は避け、相手の状況に具体的に触れてください。必ず日本語で、JSON以外の文字を一切含まない出力のみを返してください。`;
}

function buildDraftPrompt({ senderRole, company, talent, topAxes }) {
  const axisLabel = Object.fromEntries(AXES.map((a) => [a.key, a.label]));
  const topAxisLabels = topAxes.map((k) => axisLabel[k]).join("・");

  const context = `企業: ${company.name}(${company.phase || "フェーズ不明"})
企業の直近の課題要約: ${company.summary || "(なし)"}
特に一致度が高い軸: ${topAxisLabels || "(明確な一致軸なし)"}

実務経験者: ${talent.name}(${talent.title || "役職不明"})
実務経験者の総評: ${talent.summary || "(なし)"}`;

  if (senderRole === "company") {
    return `${context}

タスク:
上記の企業担当者になりかわって、この実務経験者(${talent.name}さん)へ送る初回メッセージの下書きを120〜200字程度で作成してください。
- 企業の課題(特に一致度が高い軸の内容)に具体的に触れること
- なぜこの人にお声がけしたのか、経歴のどこに期待しているかに触れること
- 一度話を聞いてみたい、というカジュアルな打診のトーンにすること(いきなり契約を迫らない)
- 定型的な「はじめまして」だけで終わらせず、内容のある一言にすること

出力形式(JSONのみ):
{"message": "..."}`;
  }

  return `${context}

タスク:
上記の実務経験者(${talent.name}さん)になりかわって、この企業(${company.name})へ送る初回メッセージの下書きを120〜200字程度で作成してください。
- 企業の課題(特に一致度が高い軸の内容)に具体的に触れること
- 自分のどの経験がその課題に活かせそうか、具体的に一言触れること
- 一度話を聞いてみたい、というカジュアルな打診のトーンにすること
- 定型的な「はじめまして」だけで終わらせず、内容のある一言にすること

出力形式(JSONのみ):
{"message": "..."}`;
}

// 企業⇄人材のマッチングが成立した際、送信者の立場に応じた初回メッセージの下書きをAIに生成させる。
// 生成に失敗した場合はnullを返す(呼び出し側は下書きなしでスレッドを開くだけになる)。
//
// @param senderRole "company" | "talent" — メッセージの送信者(下書きの一人称になる側)
export async function generateOutreachMessage({ companySkillMap, talentSkillMap, senderRole }) {
  try {
    const topAxes = topMatchingAxes(companySkillMap.axisScores, talentSkillMap.axisScores);

    const result = await callClaudeJSON(
      buildDraftSystemPrompt(),
      buildDraftPrompt({
        senderRole,
        company: {
          name: companySkillMap.company.name,
          phase: companySkillMap.company.phase,
          summary: companySkillMap.summary,
        },
        talent: {
          name: talentSkillMap.talent.name,
          title: talentSkillMap.talent.title,
          summary: talentSkillMap.summary,
        },
        topAxes,
      })
    );
    return result.message || null;
  } catch (e) {
    console.error("failed to generate outreach message draft:", e.message);
    return null;
  }
}
