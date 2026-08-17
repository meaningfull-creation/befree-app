import { AXES, AXIS_KEY_LABEL_PAIRS } from "./axes.js";

// 6ターンに拡大(以前は4)。10軸のうちより多くを直接の対話でカバーし、
// 推定に頼る軸を減らすことで診断の精度を上げる。
export const MAX_DIALOG_TURNS = 6;

export function buildDialogSystemPrompt() {
  return `あなたはスタートアップの成長課題を診断するAIコンサルタントです。特定の機能領域(特にセールス・営業)に偏らず、企業の実際の事業ドメインとフェーズに即した多角的な観点で診断してください。営業トークやセールスピッチのような口調は避け、構造的な課題を見極める客観的な診断者としての口調で質問してください。必ず日本語で、JSON以外の文字(説明文、コードブロック記号など)を一切含まない出力のみを返してください。`;
}

function axisCoverage(history) {
  const askedKeys = history.map((h) => h.axis).filter(Boolean);
  const asked = AXES.filter((a) => askedKeys.includes(a.key));
  const remaining = AXES.filter((a) => !askedKeys.includes(a.key));
  return { asked, remaining };
}

export function buildDialogNextQuestionPrompt(companyForm, history) {
  const log = history.length
    ? history.map((h, i) => `Q${i + 1}(${h.axis || "?"}): ${h.q}\nA${i + 1}: ${h.a}`).join("\n")
    : "(まだ回答なし)";
  const { asked, remaining } = axisCoverage(history);

  return `企業情報:
- 会社名: ${companyForm.name}
- 事業ドメイン: ${companyForm.industry}
- 従業員数: ${companyForm.headcount}
- 事業フェーズ: ${companyForm.phase}
- 直近ARR/売上規模: ${companyForm.revenue}

これまでの対話ログ:
${log}

診断済みの軸: ${asked.length ? asked.map((a) => a.label).join("、") : "なし"}
未診断の軸: ${remaining.map((a) => a.label).join("、")}

タスク:
「未診断の軸」の中から、${companyForm.industry}という事業ドメインの特性・典型的なKPI・つまずきやすいポイントを踏まえたときに、
このフェーズ(${companyForm.phase})の企業にとって特に見極める価値が高いと考えられる軸を1つ選んでください。
軸キーと対応するラベル: ${AXIS_KEY_LABEL_PAIRS}

選んだ軸について、${companyForm.industry}の文脈に即した具体的な診断質問を1つ日本語で作成してください。
これまでの質問より一段深掘りする形にし、単なる現状確認ではなく、原因や構造を掘り下げる問いにしてください。
一般的な営業・セールストークのような聞き方(例: 「商談は順調ですか」のような表面的な聞き方)は避け、
その業界特有の構造的な課題(オペレーション、規制、顧客特性、技術的制約など軸に応じた観点)を捉える質問にしてください。
経営者が3択で即答できる短い選択肢を添えてください。

出力形式(JSONのみ、他の文字列は一切含めない。axisは選んだ軸のキーを入れる):
{"axis": "product|sales|marketing|hr|finance_raise|finance_mgmt|cs|ops|tech|leadership", "question": "...", "options": ["...", "...", "..."]}`;
}

export function buildDialogScorePrompt(companyForm, history) {
  const log = history.map((h, i) => `Q${i + 1}(${h.axis || "?"}): ${h.q}\nA${i + 1}: ${h.a}`).join("\n");
  return `企業情報:
- 会社名: ${companyForm.name}
- 事業ドメイン: ${companyForm.industry}
- 従業員数: ${companyForm.headcount}
- 事業フェーズ: ${companyForm.phase}
- 直近ARR/売上規模: ${companyForm.revenue}

対話ログ:
${log}

タスク:
${companyForm.industry}という事業ドメインの文脈を踏まえて、対話内容をもとに以下10軸それぞれの深刻度を0〜100点(スコアが低いほど深刻なボトルネック)で採点してください(BATTER BOX Growth Map)。
対話で直接触れていない軸についても、業種・フェーズ・従業員数から妥当な推定値を入れてください(0点や100点固定にしない)。

あわせて、10軸それぞれについて、なぜそのスコアなのかを20〜40字程度で一言解説してください(axisNotes)。
対話で直接触れた軸は対話内容に基づいた具体的な理由を、推定した軸は「対話では直接触れていないが、業種・フェーズから推定」のように推定である旨がわかる形にしてください。

さらに、算出したスコアのうち最もスコアが低い(深刻な)3軸について、経営者向けの詳細分析を作成してください(topIssueDetails)。各項目は以下を含めること:
- axisKey: 軸キー
- currentState: 現状(40〜70字。対話内容や推定根拠に触れること)
- risk: 放置した場合のリスク(30〜60字)
- priority: 優先度("非常に高い" | "高い" | "中程度" のいずれか)
- recommendedTiming: 推奨対応開始時期("1ヶ月以内" | "3ヶ月以内" | "6ヶ月以内" のいずれか)

最後に、最も深刻な課題についての一行要約(30〜50字)も書いてください。

軸キーと対応するラベル: ${AXIS_KEY_LABEL_PAIRS}

出力形式(JSONのみ、10軸すべてのキーをscores・axisNotes両方に含める。topIssueDetailsは配列で3件ちょうど):
{"scores": {"product":0,"sales":0,"marketing":0,"hr":0,"finance_raise":0,"finance_mgmt":0,"cs":0,"ops":0,"tech":0,"leadership":0}, "axisNotes": {"product":"...","sales":"...","marketing":"...","hr":"...","finance_raise":"...","finance_mgmt":"...","cs":"...","ops":"...","tech":"...","leadership":"..."}, "topIssueDetails": [{"axisKey":"...","currentState":"...","risk":"...","priority":"...","recommendedTiming":"..."}], "summary": "..."}`;
}
