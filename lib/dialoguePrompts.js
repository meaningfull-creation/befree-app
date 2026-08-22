import { AXES, AXIS_KEY_LABEL_PAIRS } from "./axes.js";

// 6ターンに拡大(以前は4)。10軸のうちより多くを直接の対話でカバーし、
// 推定に頼る軸を減らすことで診断の精度を上げる。
export const MAX_DIALOG_TURNS = 6;

export function buildDialogSystemPrompt() {
  return `あなたは成長企業の経営課題を診断するAIコンサルタントです。VC出資を受けたスタートアップに限らず、創業者100%・自己資金で経営する中小企業や、老舗の事業承継期の企業など、あらゆる成長企業を診断対象とします。「資金調達ラウンド」「バーンレート」のようなベンチャー特有の用語を前提にせず、相手の企業の実情(外部資本の有無・業種)に即した言葉遣いをしてください。特定の機能領域(特にセールス・営業)に偏らず、企業の実際の事業ドメインとフェーズに即した多角的な観点で診断してください。営業トークやセールスピッチのような口調は避け、構造的な課題を見極める客観的な診断者としての口調で質問してください。必ず日本語で、JSON以外の文字(説明文、コードブロック記号など)を一切含まない出力のみを返してください。`;
}

// 外部資本の有無に応じて、プロンプトに埋め込む文脈情報の言葉を出し分ける。
// 特に finance_raise 軸は「VC調達」に限定されないよう明示的に補足する。
function fundingContext(companyForm) {
  if (companyForm.fundingType === "vc") {
    return {
      phaseLabel: "資金調達フェーズ",
      note: "この企業はVC・エンジェル投資等の外部資本を受けています。資金調達(finance_raise軸)は、次のラウンドに向けた資金調達戦略・投資家対応の観点で診断してください。",
    };
  }
  return {
    phaseLabel: "会社の成長段階",
    note: "この企業は外部資本を入れていません(自己資金・創業者主体での経営)。VCラウンドやピッチのような聞き方は避けてください。資金調達(finance_raise軸)は、銀行融資・信用保証協会・補助金/助成金の活用・資金繰り管理など、この種の企業にとって現実的な「資金アクセス力」の観点で診断してください。",
  };
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
  const { phaseLabel, note } = fundingContext(companyForm);

  return `企業情報:
- 会社名: ${companyForm.name}
- 業種・業界: ${companyForm.industry}
- 従業員数: ${companyForm.headcount}
- ${phaseLabel}: ${companyForm.phase}
- 年商: ${companyForm.revenue}

${note}

これまでの対話ログ:
${log}

診断済みの軸: ${asked.length ? asked.map((a) => a.label).join("、") : "なし"}
未診断の軸: ${remaining.map((a) => a.label).join("、")}

タスク:
「未診断の軸」の中から、${companyForm.industry}という業種・業界の特性・典型的なKPI・つまずきやすいポイントを踏まえたときに、
この企業(${phaseLabel}: ${companyForm.phase})にとって特に見極める価値が高いと考えられる軸を1つ選んでください。
軸キーと対応するラベル: ${AXIS_KEY_LABEL_PAIRS}

選んだ軸について、${companyForm.industry}の文脈に即した具体的な診断質問を1つ日本語で作成してください。
同じ軸であっても業種によって着眼点は変わります。例えば同じ「オペレーション」でも、小売・店舗運営なら在庫管理や店舗オペレーション、
製造業なら生産管理や品質管理、士業やコンサルティングなら案件管理や人時生産性というように、
${companyForm.industry}に実際に携わる人が「自分ごと」として即答できる具体性を持たせてください。
これまでの質問より一段深掘りする形にし、単なる現状確認ではなく、原因や構造を掘り下げる問いにしてください。
一般的な営業・セールストークのような聞き方(例: 「商談は順調ですか」のような表面的な聞き方)や、
VC出資企業を前提にした聞き方(例: 「次のラウンドの計画は」)は避けてください。
経営者が3択で即答できる短い選択肢を添えてください。

出力形式(JSONのみ、他の文字列は一切含めない。axisは選んだ軸のキーを入れる):
{"axis": "product|sales|marketing|hr|finance_raise|finance_mgmt|cs|ops|tech|leadership", "question": "...", "options": ["...", "...", "..."]}`;
}

export function buildDialogScorePrompt(companyForm, history) {
  const log = history.map((h, i) => `Q${i + 1}(${h.axis || "?"}): ${h.q}\nA${i + 1}: ${h.a}`).join("\n");
  const { phaseLabel, note } = fundingContext(companyForm);

  return `企業情報:
- 会社名: ${companyForm.name}
- 業種・業界: ${companyForm.industry}
- 従業員数: ${companyForm.headcount}
- ${phaseLabel}: ${companyForm.phase}
- 年商: ${companyForm.revenue}

${note}

対話ログ:
${log}

タスク:
${companyForm.industry}という業種・業界の文脈を踏まえて、対話内容をもとに以下10軸それぞれの深刻度を0〜100点(スコアが低いほど深刻なボトルネック)で採点してください(BATTER BOX Growth Map)。
対話で直接触れていない軸についても、業種・${phaseLabel}・従業員数から妥当な推定値を入れてください(0点や100点固定にしない)。

あわせて、10軸それぞれについて、なぜそのスコアなのかを20〜40字程度で一言解説してください(axisNotes)。
対話で直接触れた軸は対話内容に基づいた具体的な理由を、推定した軸は「対話では直接触れていないが、業種・成長段階から推定」のように推定である旨がわかる形にしてください。

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
