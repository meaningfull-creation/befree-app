import { AXES, AXIS_KEY_LABEL_PAIRS, TALENT_SCORE_RUBRIC } from "./axes.js";
import { INDUSTRY_CANDIDATES } from "./industries.js";

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
  const subAreas = (talentForm.experiencedSubAreas || []).join("、");
  // 値の重複を避けつつ、価値観は選択式と自由記述の両方を渡す
  const values = [...(talentForm.valueTags || []), talentForm.values].filter(Boolean).join("、");

  return `氏名: ${talentForm.name}
直近の役職: ${talentForm.title}
主な業種・事業ドメインの経験: ${talentForm.industry || "(未指定)"}
実務経験年数: ${talentForm.years}
本人が申告した経験機能領域: ${experiencedLabels.length ? experiencedLabels.join("、") : "(未選択)"}
本人が申告した具体的な経験業務: ${subAreas || "(未選択)"}
得意な働き方: ${workStyle || "(未選択)"}
仕事において大切にしていること: ${values || "(未入力)"}
職務経歴・プロジェクト実績: ${talentForm.summary || "(未入力。役職と経験年数から一般的な傾向で推定してください)"}

タスク:
入力内容をもとに、以下10軸それぞれの実務スキルを0〜30点で採点してください。
軸キーと対応するラベル: ${AXIS_KEY_LABEL_PAIRS}

採点基準(必ずこの基準に沿って一貫した採点をすること):
${rubricText()}

役職・業種・職務経歴の内容と、その軸との関連度から、上記基準のどの段階に該当するかを判断して点数化してください。
「本人が申告した経験機能領域」に含まれていない軸は、職務経歴の記述で明確に言及されていない限り低いスコア(0〜5点)にとどめてください。
逆に、申告された経験機能領域と職務経歴の内容が一致している軸は、その裏付けの強さに応じて高いスコアをつけてください。
「本人が申告した具体的な経験業務」は、どの軸のどの部分を実際にやってきたかを示す最も強い手がかりです。該当する軸のスコアは、この申告と職務経歴の記述が一致するほど高くしてください。
関連性が薄い軸は低いスコアのままにし、経歴で明確に触れられている軸だけ高いスコアをつけてください。

${INDUSTRY_HINT}

あわせて、以下も出力してください:
- phases: 適性のある企業フェーズを ["シード","プレシリーズA","シリーズA","シリーズB以降"] の中から1〜2個
- bottlenecks: 特に強みが活きる課題領域を軸ラベルで上位3つ
- growthAreas: 算出したスコアのうち相対的に低い(この人にとって主戦場ではない)軸を2つ選び、それぞれ { "axisKey": "軸キー", "note": "30〜50字程度の建設的な一言" } の形でまとめる。「苦手」と断定する言い方ではなく、「これまでの経歴では携わる機会が少なかった領域」のように、経歴の幅から見た自然な言い方にすること
- evidence: スコア上位5軸について、なぜその点数にしたかの根拠を { "軸キー": "入力内容のどこを根拠にしたかを30〜60字で具体的に" } の形でまとめる。推測で補った場合は「経歴からの推定」と明記すること
- industryFit: 経験を活かせる可能性がある業界を2〜4件
- summary: 40字程度の総評

出力形式(JSONのみ、scoresは10軸すべてのキーを含める):
{"scores": {"product":0,"sales":0,"marketing":0,"hr":0,"finance_raise":0,"finance_mgmt":0,"cs":0,"ops":0,"tech":0,"leadership":0}, "phases": ["..."], "bottlenecks": ["...","...","..."], "growthAreas": [{"axisKey":"...","note":"..."},{"axisKey":"...","note":"..."}], "evidence": {"軸キー":"..."}, "industryFit": [{"industry":"...","reason":"..."}], "summary": "..."}`;
}

// 「経験を活かせる業界」の候補を出させる共通の指示。
// 業界名は必ず選択肢から選ばせる(表記ゆれを防ぎ、企業側の業種区分と突き合わせられるようにするため)。
export const INDUSTRY_HINT = `industryFit(経験を活かせる可能性がある業界)の出し方:
- 業界名は必ず次の一覧から選ぶこと(一覧にない業界名を作らない): ${INDUSTRY_CANDIDATES.join(" / ")}
- 既に経験がある業界だけでなく、培った機能スキルが横展開できる隣接業界も含めること(例: SaaSの営業基盤構築の経験は、商習慣が近い他の法人向けサービス業界にも活きる)
- 各件に reason として「その業界で活きる理由」を40〜60字で添えること。業界の一般論ではなく、この人の経験と結びつけて書くこと
- 2〜4件。確度の高い順に並べること`;
