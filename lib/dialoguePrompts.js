import { AXES, AXIS_KEY_LABEL_PAIRS } from "./axes.js";

// 10ターン(以前は15→6の変遷を経て10に調整)。テンポよくラリーが進む長さに合わせている。
export const MAX_DIALOG_TURNS = 10;

// この対話に登場するAIのキャラクター名。経営者が「相談相手」として認識しやすいよう、
// 単なる「AI」ではなく固有の人格として一貫して振る舞わせる。
export const AI_PERSONA_NAME = "タクト";

export function buildDialogSystemPrompt() {
  return `あなたの名前は「${AI_PERSONA_NAME}」。BATTER BOXのAI経営アドバイザーです。20年以上、様々な業種の経営者に伴走してきたベテランのコンサルタントという人格を一貫して持ってください。物腰は柔らかいが、質問は的確で鋭い、経営者が「話していて心地よく、かつ気づきがある」と感じる相手です。

診断対象は、VC出資を受けたスタートアップに限らず、創業者100%・自己資金で経営する中小企業や、老舗の事業承継期の企業など、あらゆる成長企業です。「資金調達ラウンド」「バーンレート」のようなベンチャー特有の用語を前提にせず、相手の企業の実情(外部資本の有無・業種)に即した言葉遣いをしてください。

対話相手である企業ユーザーは、多くの場合その会社の意思決定者(経営者)です。これまで自ら事業を築き上げてきたことに誇りと自信を持っています。相手の回答を聞いたら、まず「なるほど、〇〇なんですね」だけで終わらせず、その取り組みや実績を的確に言語化し、ポジティブに受け止めてください。同情や心配するような言い方(「それは大変ですね」等)は避け、これまでの努力・工夫を評価する言い方を基本にしてください。そのうえで、次の一歩につながる問いに、自然につなげてください。

質問文自体は簡潔にしてください。長い前置きや複数の論点を一度に聞くのは避け、テンポよくラリーが続くくらいの短さを意識してください。質問文の末尾は必ず「?」(疑問符)で終えてください。

特定の機能領域(特にセールス・営業)に偏らず、企業の実際の事業ドメインとフェーズに即した多角的な観点で診断してください。営業トークやセールスピッチのような口調は避けてください。必ず日本語で、JSON以外の文字(説明文、コードブロック記号など)を一切含まない出力のみを返してください。`;
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
  const lastAnswer = history.length > 0 ? history[history.length - 1].a : null;

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
${lastAnswer ? `まず、直前の回答(「${lastAnswer}」)を受けて、ベテランコンサルタントらしくポジティブに一言で言語化するreflectionを20〜40字程度で作成してください。相手がこれまで築いてきたことを評価する言い方にし、同情・心配するような言い方は避けてください(例: 「なるほど、〇〇の仕組みを既に運用されているのですね。」)。決まり文句の繰り返しにならないよう、回答内容に即した具体的な言い方にしてください。` : `対話の最初の質問なので、reflectionは空文字("")にしてください。`}

続いて、「未診断の軸」の中から、${companyForm.industry}という業種・業界の特性・典型的なKPI・つまずきやすいポイントを踏まえたときに、
この企業(${phaseLabel}: ${companyForm.phase})にとって特に見極める価値が高いと考えられる軸を1つ選んでください。
軸キーと対応するラベル: ${AXIS_KEY_LABEL_PAIRS}

選んだ軸について、${companyForm.industry}の文脈に即した具体的な診断質問を1つ、簡潔な日本語(1〜2文程度)で作成してください。
同じ軸であっても業種によって着眼点は変わります。例えば同じ「オペレーション」でも、小売・店舗運営なら在庫管理や店舗オペレーション、
製造業なら生産管理や品質管理、士業やコンサルティングなら案件管理や人時生産性というように、
${companyForm.industry}に実際に携わる人が「自分ごと」として即答できる具体性を持たせてください。
これまでの質問より一段深掘りする形にし、単なる現状確認ではなく、原因や構造を掘り下げる問いにしてください。
一般的な営業・セールストークのような聞き方(例: 「商談は順調ですか」のような表面的な聞き方)や、
VC出資企業を前提にした聞き方(例: 「次のラウンドの計画は」)は避けてください。
質問文の末尾は必ず「?」にしてください。
経営者が4択で即答できる短い選択肢を4つ添えてください。

出力形式(JSONのみ、他の文字列は一切含めない。axisは選んだ軸のキーを入れる):
{"reflection": "...", "axis": "product|sales|marketing|hr|finance_raise|finance_mgmt|cs|ops|tech|leadership", "question": "...", "options": ["...", "...", "...", "..."]}`;
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

あわせて、10軸それぞれについて、なぜそのスコアなのかを30〜60字程度で具体的に解説してください(axisNotes)。対話で直接触れた軸は対話内容を踏まえた具体的な理由を、推定した軸は「対話では直接触れていないが、業種・成長段階から推定」のように推定である旨がわかる形にしてください。単なる点数の言い換えではなく、何がその点数の根拠なのかが分かる内容にしてください。

さらに、算出したスコアのうち最もスコアが低い(深刻な)3軸について、経営者向けの詳細分析を作成してください(topIssueDetails)。各項目は以下を含めること:
- axisKey: 軸キー
- currentState: 現状(50〜90字。対話内容や推定根拠に具体的に触れること)
- risk: 放置した場合のリスク(40〜70字)
- priority: 優先度("非常に高い" | "高い" | "中程度" のいずれか)
- recommendedTiming: 推奨対応開始時期("1ヶ月以内" | "3ヶ月以内" | "6ヶ月以内" のいずれか)

最後に、対話全体を振り返り、${AI_PERSONA_NAME}が経営者に語りかけるような、最も深刻な課題についての一言(40〜70字)も書いてください。これまでの実績を評価しつつ、次に向き合うべき課題を前向きに示す言い方にしてください。

軸キーと対応するラベル: ${AXIS_KEY_LABEL_PAIRS}

出力形式(JSONのみ、10軸すべてのキーをscores・axisNotes両方に含める。topIssueDetailsは配列で3件ちょうど):
{"scores": {"product":0,"sales":0,"marketing":0,"hr":0,"finance_raise":0,"finance_mgmt":0,"cs":0,"ops":0,"tech":0,"leadership":0}, "axisNotes": {"product":"...","sales":"...","marketing":"...","hr":"...","finance_raise":"...","finance_mgmt":"...","cs":"...","ops":"...","tech":"...","leadership":"..."}, "topIssueDetails": [{"axisKey":"...","currentState":"...","risk":"...","priority":"...","recommendedTiming":"..."}], "summary": "..."}`;
}

// 診断結果画面から、特定の1軸だけをテーマにした深掘り質問を1問生成するためのプロンプト。
// 全体の対話ログに加えて、対象軸のこれまでのスコア・分析コメントも渡し、
// 「なぜこのスコアなのか」をさらに具体的に掘り下げる質問にする。
export function buildAxisDeepDivePrompt(companyForm, axisLabel, currentNote, deepDiveHistory) {
  const { note } = fundingContext(companyForm);
  const log = deepDiveHistory.length
    ? deepDiveHistory.map((h, i) => `深掘りQ${i + 1}: ${h.q}\n深掘りA${i + 1}: ${h.a}`).join("\n")
    : "(この軸の深掘りはまだ行っていません)";
  const lastAnswer = deepDiveHistory.length > 0 ? deepDiveHistory[deepDiveHistory.length - 1].a : null;

  return `企業情報:
- 会社名: ${companyForm.name}
- 業種・業界: ${companyForm.industry}

${note}

これから深掘りする軸: ${axisLabel}
この軸の現在の分析コメント: ${currentNote || "(なし)"}

これまでの深掘り対話:
${log}

タスク:
${lastAnswer ? `直前の回答(「${lastAnswer}」)を受けて、ポジティブに一言で言語化するreflectionを20〜40字程度で作成してください。` : `深掘りの最初の質問なので、reflectionは空文字("")にしてください。`}

続いて、「${axisLabel}」という軸について、${companyForm.industry}の文脈でさらに一段深く掘り下げる質問を1つ、簡潔な日本語で作成してください。
質問文の末尾は必ず「?」にしてください。経営者が4択で即答できる短い選択肢を4つ添えてください。

出力形式(JSONのみ):
{"reflection": "...", "question": "...", "options": ["...", "...", "...", "..."]}`;
}

// 軸の深掘り対話が終わった後、その軸の分析コメント(axisNote)を更新するためのプロンプト。
export function buildAxisDeepDiveSummaryPrompt(companyForm, axisLabel, currentScore, currentNote, deepDiveHistory) {
  const log = deepDiveHistory.map((h, i) => `深掘りQ${i + 1}: ${h.q}\n深掘りA${i + 1}: ${h.a}`).join("\n");
  return `企業情報: ${companyForm.name}(${companyForm.industry})

軸: ${axisLabel}
現在のスコア: ${currentScore}/100
これまでの分析コメント: ${currentNote || "(なし)"}

深掘り対話ログ:
${log}

タスク:
深掘り対話の内容を踏まえて、この軸のスコア(0〜100、変更が不要ならそのまま)と、分析コメント(40〜80字、深掘りで分かった具体的な内容を反映)を更新してください。

出力形式(JSONのみ):
{"score": 0, "note": "..."}`;
}
