import { AXES, AXIS_KEY_LABEL_PAIRS, TALENT_SCORE_RUBRIC } from "./axes.js";

export function buildTalentSystemPrompt() {
  return `あなたは実務経験者の職務経歴を解析し、10軸のスキルスコアを算出するAIアナリストです。単に高いスコアをつけるのではなく、経験してきた機能領域として本人が明示的に選んだものと、職務経歴の記述内容を突き合わせて、実態に即した精度の高い採点をしてください。必ず日本語で、JSON以外の文字(説明文、コードブロック記号など)を一切含まない出力のみを返してください。`;
}

function rubricText() {
  return TALENT_SCORE_RUBRIC.map((r) => `${r.range}点: ${r.label}`).join("\n");
}

const AXIS_LABEL_BY_KEY = Object.fromEntries(AXES.map((a) => [a.key, a.label]));

export function buildTalentAnalysisPrompt(talentForm) {
  const experiencedLabels = (talentForm.experiencedFunctions || []).map((k) => AXIS_LABEL_BY_KEY[k] || k);
  const workStyle = (talentForm.workStyleTags || []).join("、");

  return `氏名: ${talentForm.name}
直近の役職: ${talentForm.title}
主な業種・事業ドメインの経験: ${talentForm.industry || "(未指定)"}
実務経験年数: ${talentForm.years}
本人が申告した経験機能領域: ${experiencedLabels.length ? experiencedLabels.join("、") : "(未選択)"}
得意な働き方: ${workStyle || "(未選択)"}
仕事において大切にしていること: ${talentForm.values || "(未入力)"}
職務経歴・プロジェクト実績: ${talentForm.summary || "(未入力。役職と経験年数から一般的な傾向で推定してください)"}

タスク:
入力内容をもとに、以下10軸それぞれの実務スキルを0〜30点で採点してください。
軸キーと対応するラベル: ${AXIS_KEY_LABEL_PAIRS}

採点基準(必ずこの基準に沿って一貫した採点をすること):
${rubricText()}

役職・業種・職務経歴の内容と、その軸との関連度から、上記基準のどの段階に該当するかを判断して点数化してください。
「本人が申告した経験機能領域」に含まれていない軸は、職務経歴の記述で明確に言及されていない限り低いスコア(0〜5点)にとどめてください。
逆に、申告された経験機能領域と職務経歴の内容が一致している軸は、その裏付けの強さに応じて高いスコアをつけてください。
関連性が薄い軸は低いスコアのままにし、経歴で明確に触れられている軸だけ高いスコアをつけてください。

あわせて、以下も出力してください:
- phases: 適性のある企業フェーズを ["シード","プレシリーズA","シリーズA","シリーズB以降"] の中から1〜2個
- bottlenecks: 特に強みが活きる課題領域を軸ラベルで上位3つ
- growthAreas: 算出したスコアのうち相対的に低い(この人にとって主戦場ではない)軸を2つ選び、それぞれ { "axisKey": "軸キー", "note": "30〜50字程度の建設的な一言" } の形でまとめる。「苦手」と断定する言い方ではなく、「これまでの経歴では携わる機会が少なかった領域」のように、経歴の幅から見た自然な言い方にすること
- summary: 40字程度の総評

出力形式(JSONのみ、10軸すべてのキーを含める):
{"scores": {"product":0,"sales":0,"marketing":0,"hr":0,"finance_raise":0,"finance_mgmt":0,"cs":0,"ops":0,"tech":0,"leadership":0}, "phases": ["..."], "bottlenecks": ["...","...","..."], "growthAreas": [{"axisKey":"...","note":"..."},{"axisKey":"...","note":"..."}], "summary": "..."}`;
}
