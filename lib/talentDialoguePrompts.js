import { AXES, AXIS_KEY_LABEL_PAIRS, TALENT_SCORE_RUBRIC } from "./axes.js";
import { INDUSTRY_HINT } from "./talentPrompts.js";
import { NO_MATCHING_OPTION_ANSWER, NO_MATCHING_OPTION_NOTE } from "./dialogueAnswers.js";

// 企業側と同じテンポ(4択・reflection付き)だが、実際に使ったユーザーから「10問は大変」との
// フィードバックがあったため5問に短縮。その代わり、スキルマップ作成後の項目ごとの深掘り
// (/api/talent/axis-deep-dive)をより充実させ、対話で直接触れなかった軸をそちらで補う設計にする。
export const MAX_TALENT_DIALOG_TURNS = 5;
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
  const subAreas = (talentForm.experiencedSubAreas || []).join("、");

  return `氏名: ${talentForm.name}
直近の役職: ${talentForm.title}
主な業種・事業ドメインの経験: ${talentForm.industry || "(未指定)"}
実務経験年数: ${talentForm.years || "未入力"}
本人が申告した経験機能領域: ${experiencedLabels.length ? experiencedLabels.join("、") : "(未選択)"}
本人が申告した具体的な経験業務: ${subAreas || "(未選択)"}
得意な働き方: ${workStyle || "(未選択)"}
大切にしている価値観: ${values || "(未選択)"}
職務経歴・プロジェクト実績: ${talentForm.summary || "(未入力)"}`;
}

// 経験年数に合わせて、質問の抽象度を変えるための指示。
//
// 「『得意な領域は何ですか』という質問が、経験2年目の自分には難しく感じた。
//   選択肢を見てもどれが当てはまるか悩んだ」というフィードバックを受けて追加した。
// 経験の浅い方は、自分の仕事がどの領域に当たるのかをまだ言語化できておらず、
// 自己評価や分類を求める質問には答えられない(当てずっぽうで選ばれると採点も狂う)。
function experienceGuidance(years) {
  const junior = years === "3年未満" || years === "3〜5年";
  if (!junior) {
    return `この方の実務経験は${years || "(未指定)"}です。担ってきた役割や裁量の大きさに見合った、具体的な聞き方にしてください。`;
  }
  return `【重要】この方の実務経験は${years}です。経験の浅い方には、次の点を必ず守ってください。

- 「得意な領域は?」「強みは?」「どの分野が専門ですか?」のような、自己評価や分類を求める聞き方は絶対にしないでください。
  自分の仕事がどの領域に当たるのかをまだ言語化できていない段階なので、答えに詰まります。
- 代わりに、直近の出来事を思い出すだけで答えられる聞き方にしてください。
  良い例:「直近3ヶ月で、いちばん時間を使っていた仕事はどれに近いですか?」
         「最近、人に確認しなくても自分だけで進められるようになったことはありますか?」
         「その仕事で、やり方を自分で工夫した場面はありましたか?」
  悪い例:「得意な領域は何ですか?」「強みはどこにありますか?」「専門性を教えてください」
- 「立ち上げ」「責任者として」「主導した」のような、役職の重い言葉を選択肢に使わないでください。
  日常の業務そのままの言葉(「資料をつくった」「先輩と同行した」「問い合わせに対応した」など)にしてください。
- 経験が浅いこと自体を問題のように扱わないでください。これから積み上げる段階として自然に受け止める言い方にしてください。`;
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
${
  lastAnswer === NO_MATCHING_OPTION_ANSWER
    ? `直前の質問は、選択肢が本人の状況に合いませんでした。reflectionでは「うまく当てはまるものがなかったですね、失礼しました。」のように軽く受け止め(相手を責めず、謝りすぎもしない)、次の質問では**同じことを聞き直さないでください**。より具体的で、日常の業務の言葉だけで答えられる聞き方に切り替えるか、別の軸に移ってください。`
    : lastAnswer
      ? `まず、直前の回答(「${lastAnswer}」)を受けて、キャリアコンサルタントらしくポジティブに一言で言語化するreflectionを20〜40字程度で作成してください。相手の経験・工夫を評価する言い方にし、同情・心配するような言い方は避けてください。`
      : `対話の最初の質問なので、reflectionは空文字("")にしてください。`
}

続いて、「未深掘りの軸」の中から、この人の経歴(${talentForm.title}、${talentForm.industry || "業種未指定"})にとって特に確認する価値が高いと考えられる軸を1つ選んでください。
質問できる回数は限られているため、本人が申告した「経験機能領域」に含まれる軸を優先し、その経験の裏付けを具体的に引き出すことを優先してください。経験機能領域に含まれない軸は、対話で無理に触れる必要はありません(スキルマップ作成後に、本人が任意で深掘りできます)。
軸キーと対応するラベル: ${AXIS_KEY_LABEL_PAIRS}

${experienceGuidance(talentForm.years)}

選んだ軸について、本人が「自分ごと」として具体的に思い出しながら即答できる質問を1つ、簡潔な日本語(1〜2文程度)で作成してください。
「あなたのスキルは?」のような抽象的な聞き方ではなく、「実際にどんな場面で、何を、どうしたか」を思い出させる具体的な聞き方にしてください。
経験機能領域として選ばれていない軸について聞く場合は、「経験はないと思いますが念のため」のような聞き方ではなく、隣接する経験があるかを自然に確認する聞き方にしてください。
質問文の末尾は必ず「?」にしてください。
本人が4択で即答できる短い選択肢を4つ添えてください。
選択肢は、どれか1つは必ず当てはまるように幅を持たせてください(「まだ経験がない」「これから」に相当する選択肢を含めてよい)。
なお画面には別途「${NO_MATCHING_OPTION_ANSWER}」というボタンが常に出ます。選択肢の中にこれと同じものを入れる必要はありません。

出力形式(JSONのみ、他の文字列は一切含めない。axisは選んだ軸のキーを入れる):
{"reflection": "...", "axis": "product|sales|marketing|hr|finance_raise|finance_mgmt|cs|ops|tech|leadership", "question": "...", "options": ["...", "...", "...", "..."]}`;
}

export function buildTalentDialogScorePrompt(talentForm, history) {
  const log = history.map((h, i) => `Q${i + 1}(${h.axis || "?"}): ${h.q}\nA${i + 1}: ${h.a}`).join("\n");

  return `${talentContext(talentForm)}

対話ログ:
${log}

${NO_MATCHING_OPTION_NOTE}

タスク:
対話内容と、本人が申告した経験機能領域・働き方・価値観を総合して、この人の経験が10軸のどこに寄っているかを、**合計ちょうど100点**になるよう配分してください。
軸キーと対応するラベル: ${AXIS_KEY_LABEL_PAIRS}

これは「優秀さの採点」ではなく「経験の配分」です。経験が豊富な人でも合計は100点で、ある軸を厚くすれば他の軸は必ず薄くなります。
全軸に高い点を付けることはできません。どの軸を主戦場としてきた人なのかが分かる配分にしてください。

配分の目安:
${rubricText()}

対話や申告内容で明確に裏付けられた軸に点を厚く置き、裏付けのない軸は0〜2点にとどめてください。実務経験がない領域は0点にしてください。
「本人が申告した具体的な経験業務」は、どの軸のどの部分を実際にやってきたかを示す最も強い手がかりです。対話の内容と一致するほど、該当軸に厚く配分してください。
経験年数が長いことを理由に全体へ薄く配ることはしないでください。長さではなく「どこに寄っているか」を表す配分にしてください。
最後に合計が100点になっているか確認してください。

${INDUSTRY_HINT}

あわせて、以下も出力してください:
- phases: 適性のある企業フェーズを ["シード","プレシリーズA","シリーズA","シリーズB以降"] の中から1〜2個
- bottlenecks: 特に強みが活きる課題領域を軸ラベルで上位3つ
- growthAreas: 配分が相対的に低い(この人にとって主戦場ではない)軸を2つ選び、それぞれ { "axisKey": "軸キー", "note": "30〜50字程度の建設的な一言" } の形でまとめる。「苦手」と断定する言い方ではなく、「これまでの経歴では携わる機会が少なかった領域」のように、経歴の幅から見た自然な言い方にすること
- evidence: 配分が多い上位5軸について、なぜその点数を割り振ったかの根拠を { "軸キー": "対話や申告内容のどこを根拠にしたかを30〜60字で具体的に" } の形でまとめる。推測で補った場合は「経歴からの推定」と明記すること
- industryFit: 経験を活かせる可能性がある業界を2〜4件
- summary: ${TALENT_AI_PERSONA_NAME}が対話を振り返って本人に語りかけるような、40字程度の総評

出力形式(JSONのみ、scoresは10軸すべてのキーを含め、合計を100にすること):
{"scores": {"product":0,"sales":0,"marketing":0,"hr":0,"finance_raise":0,"finance_mgmt":0,"cs":0,"ops":0,"tech":0,"leadership":0}, "phases": ["..."], "bottlenecks": ["...","...","..."], "growthAreas": [{"axisKey":"...","note":"..."},{"axisKey":"...","note":"..."}], "evidence": {"軸キー":"..."}, "industryFit": [{"industry":"...","reason":"..."}], "summary": "..."}`;
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
${
  lastAnswer === NO_MATCHING_OPTION_ANSWER
    ? `直前の質問は、選択肢がご本人の状況に合いませんでした。reflectionでは「うまく当てはまるものがなかったですね、失礼しました。」のように軽く受け止め、次の質問では**同じことを聞き直さず**、より具体的で答えやすい聞き方に切り替えてください。`
    : lastAnswer
      ? `直前の回答(「${lastAnswer}」)を受けて、ポジティブに一言で言語化するreflectionを20〜40字程度で作成してください。`
      : `深掘りの最初の質問なので、reflectionは空文字("")にしてください。`
}

${experienceGuidance(talentForm.years)}

続いて、「${axisLabel}」という軸について、この人の実務経験をさらに一段具体的に掘り下げる質問を1つ、簡潔な日本語で作成してください。
質問文の末尾は必ず「?」にしてください。本人が4択で即答できる短い選択肢を4つ添えてください。
選択肢は、どれか1つは必ず当てはまるように幅を持たせてください。画面には別途「${NO_MATCHING_OPTION_ANSWER}」というボタンが常に出るので、選択肢の中に同じものを入れる必要はありません。

出力形式(JSONのみ):
{"reflection": "...", "question": "...", "options": ["...", "...", "...", "..."]}`;
}

export function buildTalentAxisDeepDiveSummaryPrompt(talentForm, axisLabel, currentScore, currentNote, deepDiveHistory) {
  const log = deepDiveHistory.map((h, i) => `深掘りQ${i + 1}: ${h.q}\n深掘りA${i + 1}: ${h.a}`).join("\n");
  return `氏名: ${talentForm.name}(${talentForm.title || "役職未指定"} / ${talentForm.industry || "業種未指定"})

軸: ${axisLabel}
現在の配点: ${currentScore}点(10軸合計100点のうちの、この軸の取り分)
これまでの分析コメント: ${currentNote || "(なし)"}

深掘り対話ログ:
${log}

${NO_MATCHING_OPTION_NOTE}

タスク:
深掘り対話の内容を踏まえて、この軸の配点と、分析コメント(40〜80字、深掘りで分かった具体的な内容を反映)を更新してください。
配点は「10軸合計100点のうち、この軸がどれだけを占めるか」です。経験が主戦場だと分かった場合は25〜40点、専門特化していると分かった場合は40点以上、
思ったほど関与が深くなかった場合は下げてください(変更が不要ならそのまま)。他の軸は自動で調整されるので、この軸の点数だけを答えてください。

出力形式(JSONのみ):
{"score": 0, "note": "..."}`;
}
