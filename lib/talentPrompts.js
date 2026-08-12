import { AXIS_KEY_LABEL_PAIRS, TALENT_SCORE_RUBRIC } from "./axes.js";

export function buildTalentSystemPrompt() {
  return `あなたは実務経験者の職務経歴を解析し、10軸のスキルスコアを算出するAIアナリストです。必ず日本語で、JSON以外の文字(説明文、コードブロック記号など)を一切含まない出力のみを返してください。`;
}

function rubricText() {
  return TALENT_SCORE_RUBRIC.map((r) => `${r.range}点: ${r.label}`).join("\n");
}

export function buildTalentAnalysisPrompt(talentForm) {
  return `氏名: ${talentForm.name}
直近の役職: ${talentForm.title}
主な業種・事業ドメインの経験: ${talentForm.industry || "(未指定)"}
実務経験年数: ${talentForm.years}
職務経歴・プロジェクト実績: ${talentForm.summary || "(未入力。役職と経験年数から一般的な傾向で推定してください)"}

タスク:
入力内容をもとに、以下10軸それぞれの実務スキルを0〜30点で採点してください。
軸キーと対応するラベル: ${AXIS_KEY_LABEL_PAIRS}

採点基準(必ずこの基準に沿って一貫した採点をすること):
${rubricText()}

役職・業種・職務経歴の内容と、その軸との関連度から、上記基準のどの段階に該当するかを判断して点数化してください。
関連性が薄い軸は低いスコア(0〜5点)にとどめ、経歴で明確に触れられている軸だけ高いスコアをつけてください。

あわせて、適性のある企業フェーズを ["シード","プレシリーズA","シリーズA","シリーズB以降"] の中から1〜2個、特に強みが活きる課題領域を軸ラベルで上位3つ、40字程度の総評summaryを出力してください。

出力形式(JSONのみ、10軸すべてのキーを含める):
{"scores": {"product":0,"sales":0,"marketing":0,"hr":0,"finance_raise":0,"finance_mgmt":0,"cs":0,"ops":0,"tech":0,"leadership":0}, "phases": ["..."], "bottlenecks": ["...","...","..."], "summary": "..."}`;
}
