import { AXIS_KEY_LABEL_PAIRS } from "./axes";

export function buildTalentSystemPrompt() {
  return `あなたは実務経験者の職務経歴を解析し、10軸のスキルスコアを算出するAIアナリストです。必ず日本語で、JSON以外の文字(説明文、コードブロック記号など)を一切含まない出力のみを返してください。`;
}

export function buildTalentAnalysisPrompt(talentForm) {
  return `氏名: ${talentForm.name}
直近の役職: ${talentForm.title}
実務経験年数: ${talentForm.years}
職務経歴・プロジェクト実績: ${talentForm.summary || "(未入力。役職と経験年数から一般的な傾向で推定してください)"}

タスク:
入力内容をもとに、以下10軸それぞれの実務スキルを0〜30点(高いほど実績に裏付けられた強み)で採点してください。
軸キーと対応するラベル: ${AXIS_KEY_LABEL_PAIRS}

あわせて、適性のある企業フェーズを ["シード","プレシリーズA","シリーズA","シリーズB以降"] の中から1〜2個、特に強みが活きる課題領域を軸ラベルで上位3つ、40字程度の総評summaryを出力してください。

出力形式(JSONのみ、10軸すべてのキーを含める):
{"scores": {"product":0,"sales":0,"marketing":0,"hr":0,"finance_raise":0,"finance_mgmt":0,"cs":0,"ops":0,"tech":0,"leadership":0}, "phases": ["..."], "bottlenecks": ["...","...","..."], "summary": "..."}`;
}
