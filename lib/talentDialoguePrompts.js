import { AXES, AXIS_KEY_LABEL_PAIRS, TALENT_SCORE_RUBRIC } from "./axes.js";

// 企業側と同じテンポ(10問・4択・reflection付き)で、実務経験者自身の自己分析を助ける対話。
export const MAX_TALENT_DIALOG_TURNS = 10;
export const TALENT_AI_PERSONA_NAME = "タクト";

const AXIS_LABEL_BY_KEY = Object.fromEntries(AXES.map((a) => [a.key, a.label]));

export function buildTalentDialogSystemPrompt() {
  return `あなたの名前は「${TALENT_AI_PERSONA_NAME}」。BATTER BOXのAIキャリアアドバイザーです。20年以上、様々な業種の実務経験者のキャリア相談に乗ってきたベテランのキャリアコンサルタントという人格を一貫して持ってください。

対話の相手は、自分の強み・弱み・働き方の特性を、書類だけではうまく言語化できていない実務経験者です。相手が自分では気づいていない強みや、経歴の中で当たり前だと思って言語化してこなかった経験を、対話を通じて引き出してください。

相手の回答を聞いたら、まず「なるほど、〇〇なんですね」だけで終わらせず、その経験・工夫を的確に言語化し、ポジティブに受け止めてください。同情や心配するような言い方は避け、これまでのキャリアを評価する言い方を基本にしてください。そのうえで、次の気づきにつながる問いに、自然につなげてください。

質問文自体は簡潔にしてください。長い前置きや複数の論点を一度に聞くのは避け、テンポよくラリーが続くくらいの短さを意識してください。質問文の末尾は必ず「?」(疑問符)で終えてください。

必ず日本語で、JSON以外の文字(説明文、コードブロック記号など)を一切含まない出力のみを返してください。`;
}

function rubricText() {
  return TALENT_SCORE_RUBRIC.map((r) => `${r.range}点: ${r.label}`).join("\n");
}

function talentContext(talentForm) {
  const experiencedLabels = (talentForm.experiencedFunctions || []).map((k) => AXIS_LABEL_BY_KEY[k] || k);
  const workStyle = [...(talentForm.workStyleTags || [])].join("、");
  const values = [...(talentForm.valueTags || []), talentForm.values].filter(Boolean).join("、");

  return `氏名: ${talentForm.name}
直近の役職: ${talentForm.title}
主な業種・事業ドメインの経験: ${talentForm.industry || "(未指定)"}
実務経験年数: ${talentForm.years}
本人が申告した経験機能領域: ${experiencedLabels.length ? experiencedLabels.join("、") : "(未選択)"}
得意な働き方: ${workStyle || "(未選択)"}
大切にしている価値観: ${values || "(未選択)"}
職務経歴・プロジェクト実績: ${talentForm.summary || "(未入力)"}`;
}

function axisCoverage(history) {
  const askedKeys = history.map((h) => h.axis).filter(Boolean);
  const asked = AXES.filter((a) => askedKeys.includes(a.key));
  const remaining = AXES.filter((a) => !askedKeys.includes(a.key));
  return { asked, remaining };
}

export function buildTalentDialogNextQuestionPrompt(talentForm, history) {
  const log = history.length
    ? history.map((h, i) => `Q${i + 1}(${h.axis || "?"}): ${h.q}\nA${i + 1}: ${h.a}`).join("\n")
    : "(まだ回答なし)";
  const { asked, remaining } = axisCoverage(history);
  const lastAnswer = history.length > 0 ? history[history.length - 1].a : null;

  return `${talentContext(talentForm)}

これまでの対話ログ:
${log}

深掘り済みの軸: ${asked.length ? asked.map((a) => a.label).join("、") : "なし"}
未深掘りの軸: ${remaining.map((a) => a.label).join("、")}

タスク:
${lastAnswer ? `まず、直前の回答(「${lastAnswer}」)を受けて、キャリアコンサルタントらしくポジティブに一言で言語化するreflectionを20〜40字程度で作成してください。相手の経験・工夫を評価する言い方にし、同情・心配するような言い方は避けてください。` : `対話の最初の質問なので、reflectionは空文字("")にしてください。`}

続いて、「未深掘りの軸」の中から、この人の経歴(${talentForm.title}、${talentForm.industry || "業種未指定"})にとって特に確認する価値が高いと考えられる軸を1つ選んでください。
軸キーと対応するラベル: ${AXIS_KEY_LABEL_PAIRS}

選んだ軸について、本人が「自分ごと」として具体的に思い出しながら即答できる質問を1つ、簡潔な日本語(1〜2文程度)で作成してください。
「あなたのスキルは?」のような抽象的な聞き方ではなく、「実際にどんな場面で、何を、どうしたか」を思い出させる具体的な聞き方にしてください。
経験機能領域として選ばれていない軸について聞く場合は、「経験はないと思いますが念のため」のような聞き方ではなく、隣接する経験があるかを自然に確認する聞き方にしてください。
質問文の末尾は必ず「?」にしてください。
本人が4択で即答できる短い選択肢を4つ添えてください。

出力形式(JSONのみ、他の文字列は一切含めない。axisは選んだ軸のキーを入れる):
{"reflection": "...", "axis": "product|sales|marketing|hr|finance_raise|finance_mgmt|cs|ops|tech|leadership", "question": "...", "options": ["...", "...", "...", "..."]}`;
}

export function buildTalentDialogScorePrompt(talentForm, history) {
  const log = history.map((h, i) => `Q${i + 1}(${h.axis || "?"}): ${h.q}\nA${i + 1}: ${h.a}`).join("\n");

  return `${talentContext(talentForm)}

対話ログ:
${log}

タスク:
対話内容と、本人が申告した経験機能領域・働き方・価値観を総合して、以下10軸それぞれの実務スキルを0〜30点で採点してください。
軸キーと対応するラベル: ${AXIS_KEY_LABEL_PAIRS}

採点基準(必ずこの基準に沿って一貫した採点をすること):
${rubricText()}

対話や申告内容で明確に裏付けられた軸は高いスコアを、そうでない軸は低いスコア(0〜5点)にとどめてください。

あわせて、以下も出力してください:
- phases: 適性のある企業フェーズを ["シード","プレシリーズA","シリーズA","シリーズB以降"] の中から1〜2個
- bottlenecks: 特に強みが活きる課題領域を軸ラベルで上位3つ
- growthAreas: 算出したスコアのうち相対的に低い(この人にとって主戦場ではない)軸を2つ選び、それぞれ { "axisKey": "軸キー", "note": "30〜50字程度の建設的な一言" } の形でまとめる。「苦手」と断定する言い方ではなく、「これまでの経歴では携わる機会が少なかった領域」のように、経歴の幅から見た自然な言い方にすること
- summary: ${TALENT_AI_PERSONA_NAME}が対話を振り返って本人に語りかけるような、40字程度の総評

出力形式(JSONのみ、10軸すべてのキーを含める):
{"scores": {"product":0,"sales":0,"marketing":0,"hr":0,"finance_raise":0,"finance_mgmt":0,"cs":0,"ops":0,"tech":0,"leadership":0}, "phases": ["..."], "bottlenecks": ["...","...","..."], "growthAreas": [{"axisKey":"...","note":"..."},{"axisKey":"...","note":"..."}], "summary": "..."}`;
}

// 人材側のスキルマップ結果画面から、特定の1軸だけをテーマにした深掘り質問を1問生成するためのプロンプト。
export function buildTalentAxisDeepDivePrompt(talentForm, axisLabel, currentNote, deepDiveHistory) {
  const log = deepDiveHistory.length
    ? deepDiveHistory.map((h, i) => `深掘りQ${i + 1}: ${h.q}\n深掘りA${i + 1}: ${h.a}`).join("\n")
    : "(この軸の深掘りはまだ行っていません)";
  const lastAnswer = deepDiveHistory.length > 0 ? deepDiveHistory[deepDiveHistory.length - 1].a : null;

  return `氏名: ${talentForm.name}(${talentForm.title || "役職未指定"} / ${talentForm.industry || "業種未指定"})

これから深掘りする軸: ${axisLabel}
この軸の現在の分析コメント: ${currentNote || "(なし)"}

これまでの深掘り対話:
${log}

タスク:
${lastAnswer ? `直前の回答(「${lastAnswer}」)を受けて、ポジティブに一言で言語化するreflectionを20〜40字程度で作成してください。` : `深掘りの最初の質問なので、reflectionは空文字("")にしてください。`}

続いて、「${axisLabel}」という軸について、この人の実務経験をさらに一段具体的に掘り下げる質問を1つ、簡潔な日本語で作成してください。
質問文の末尾は必ず「?」にしてください。本人が4択で即答できる短い選択肢を4つ添えてください。

出力形式(JSONのみ):
{"reflection": "...", "question": "...", "options": ["...", "...", "...", "..."]}`;
}

export function buildTalentAxisDeepDiveSummaryPrompt(talentForm, axisLabel, currentScore, currentNote, deepDiveHistory) {
  const log = deepDiveHistory.map((h, i) => `深掘りQ${i + 1}: ${h.q}\n深掘りA${i + 1}: ${h.a}`).join("\n");
  return `氏名: ${talentForm.name}(${talentForm.title || "役職未指定"} / ${talentForm.industry || "業種未指定"})

軸: ${axisLabel}
現在のスコア: ${currentScore}/30
これまでの分析コメント: ${currentNote || "(なし)"}

深掘り対話ログ:
${log}

タスク:
深掘り対話の内容を踏まえて、この軸のスコア(0〜30、変更が不要ならそのまま)と、分析コメント(40〜80字、深掘りで分かった具体的な内容を反映)を更新してください。

出力形式(JSONのみ):
{"score": 0, "note": "..."}`;
}
