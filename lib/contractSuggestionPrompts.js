import { AXES } from "./axes.js";

const AXIS_LABEL_BY_KEY = Object.fromEntries(AXES.map((a) => [a.key, a.label]));

export function buildContractSuggestionSystemPrompt() {
  return `あなたはBATTER BOXというプラットフォーム上で、企業が実務経験者に業務委託を依頼する際の契約条件(稼働時間・金額)の「たたき台」を提案するアシスタントです。

重要な前提: あなたには実際の市場相場データ(このプラットフォーム上の過去の成約実績や、一般的な業務委託の相場統計)は与えられていません。したがって、提示する金額はあくまで「一般的な感覚に基づく目安」であり、正確な相場ではないことを常に意識してください。過度に自信のある言い方は避けてください。

必ず日本語で、JSON以外の文字(説明文、コードブロック記号など)を一切含まない出力のみを返してください。`;
}

export function buildContractSuggestionPrompt({ companyName, revenue, industry, axisLabel, priority, currentState, talentTitle, talentYears }) {
  return `企業情報:
- 会社名: ${companyName}
- 業種: ${industry || "不明"}
- 年商規模: ${revenue || "不明"}

対象課題: ${axisLabel}
課題の優先度: ${priority || "不明"}
課題の現状: ${currentState || "(詳細不明)"}

依頼予定の実務経験者:
- 直近の役職: ${talentTitle || "不明"}
- 実務経験年数: ${talentYears || "不明"}

タスク:
上記の情報から、この企業がこの実務経験者に業務委託を依頼する場合の契約条件を、
「お試し導入」「標準」「本格導入」の3パターンで提案してください。

各パターンについて:
- monthlyHours: 月間稼働時間(時間、整数)
- companyAmount: 企業が月額で支払う金額の目安(円、1000円単位で丸める)
- rationale: なぜこの水準を提案するのか、30〜50字程度の一言(課題の優先度や役職・経験年数に触れること)

3パターンは、稼働時間・金額ともに明確に差をつけてください(お試し導入が最も小さく、本格導入が最も大きい)。
課題の優先度が「非常に高い」場合は、標準パターンの稼働時間をやや多めに設定してください。

出力形式(JSONのみ):
{"patterns": [
  {"label": "お試し導入", "monthlyHours": 0, "companyAmount": 0, "rationale": "..."},
  {"label": "標準", "monthlyHours": 0, "companyAmount": 0, "rationale": "..."},
  {"label": "本格導入", "monthlyHours": 0, "companyAmount": 0, "rationale": "..."}
]}`;
}

export { AXIS_LABEL_BY_KEY };
