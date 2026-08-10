import { AXIS_LABEL_LIST, AXIS_KEY_LABEL_PAIRS } from "./axes";

export const MAX_DIALOG_TURNS = 4;

export function buildDialogSystemPrompt() {
  return `あなたはスタートアップの成長課題を診断するAIコンサルタントです。必ず日本語で、JSON以外の文字(説明文、コードブロック記号など)を一切含まない出力のみを返してください。`;
}

export function buildDialogNextQuestionPrompt(companyForm, history) {
  const log = history.length
    ? history.map((h, i) => `Q${i + 1}: ${h.q}\nA${i + 1}: ${h.a}`).join("\n")
    : "(まだ回答なし)";
  return `企業情報:
- 会社名: ${companyForm.name}
- 事業ドメイン: ${companyForm.industry}
- 従業員数: ${companyForm.headcount}
- 事業フェーズ: ${companyForm.phase}
- 直近ARR/売上規模: ${companyForm.revenue}

これまでの対話ログ:
${log}

タスク:
以下10軸のうち、まだ深掘りできていないテーマを見極めるための、鋭い診断質問を1つ日本語で作成してください。
軸: ${AXIS_LABEL_LIST}

経営者が3択で即答できる短い選択肢を添えてください。これまでの質問とテーマが重複しないようにしてください。

出力形式(JSONのみ、他の文字列は一切含めない):
{"question": "...", "options": ["...", "...", "..."]}`;
}

export function buildDialogScorePrompt(companyForm, history) {
  const log = history.map((h, i) => `Q${i + 1}: ${h.q}\nA${i + 1}: ${h.a}`).join("\n");
  return `企業情報:
- 会社名: ${companyForm.name}
- 事業ドメイン: ${companyForm.industry}
- 従業員数: ${companyForm.headcount}
- 事業フェーズ: ${companyForm.phase}
- 直近ARR/売上規模: ${companyForm.revenue}

対話ログ:
${log}

タスク:
対話内容をもとに、以下10軸それぞれの深刻度を0〜100点(スコアが低いほど深刻なボトルネック)で採点してください。あわせて、最も深刻な課題についての一行要約(30〜50字)を書いてください。
軸キーと対応するラベル: ${AXIS_KEY_LABEL_PAIRS}

出力形式(JSONのみ、10軸すべてのキーを含める):
{"scores": {"product":0,"sales":0,"marketing":0,"hr":0,"finance_raise":0,"finance_mgmt":0,"cs":0,"ops":0,"tech":0,"leadership":0}, "summary": "..."}`;
}
