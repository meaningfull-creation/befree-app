// MATCH%の内訳を、6つの観点に分解して算出する純粋ロジック(外部依存なし、テスト可能)。
// scoreMatch()(lib/matching.js)が算出する総合スコアとは別に、「なぜこの点数なのか」を
// 経営者が納得できる形で開示するための補助的な内訳表示に使う。
//
// 配点(合計100点):
//   課題領域一致   30点 … 企業の課題TOP3を人材の経験配分でどれだけ埋められるか(MATCH%本体と同じ式)
//   会社フェーズ   20点 … 人材の経験フェーズと企業の現フェーズが一致するか
//   業界経験       15点 … 人材の業種経験と企業の業種が一致/近いか
//   役職経験       15点 … 人材の経営体制(leadership)軸の配点を役職経験の代理指標として使用
//   スキル一致     15点 … 企業の深刻軸トップ3と人材の強み軸トップ3の重なり具合
//   稼働条件        5点 … 人材が現在稼働可能(足切り対象でない)か

import { AXIS_KEYS, TALENT_FOCUS_POINTS, normalizeAllocation, issueAllocation } from "./axes.js";
import { topMatchingAxes } from "./matching.js";

// 企業の課題TOP3を、人材の経験配分でどれだけ埋められるか。
// scoreMatch()と同じ重み付け(課題配分の上位3軸)を使う。ここだけ別の式にすると、
// 「MATCH 54%」と内訳の説明が食い違って、開示する意味がなくなるため。
function issueAreaScore(companyScores, talentScores, topK = 3) {
  const need = issueAllocation(companyScores);
  const exp = normalizeAllocation(talentScores);
  const target = AXIS_KEYS.map((k) => ({ need: need[k], strength: Math.min(1, exp[k] / TALENT_FOCUS_POINTS) }))
    .sort((a, b) => b.need - a.need)
    .slice(0, topK);
  const needSum = target.reduce((s, a) => s + a.need, 0) || 1;
  const fit = target.reduce((s, a) => s + (a.need / needSum) * a.strength, 0);
  return Math.round(fit * 30);
}

function phaseScore(companyPhase, talentPhaseTags = []) {
  if (companyPhase && talentPhaseTags.includes(companyPhase)) return 20;
  return 0;
}

function industryScore(companyIndustry, talentIndustry) {
  if (!companyIndustry || !talentIndustry) return 0;
  if (companyIndustry === talentIndustry) return 15;
  return 5; // 業種は異なるが、何らかの業種経験はある
}

function roleExperienceScore(talentScores) {
  const leadership = normalizeAllocation(talentScores).leadership;
  return Math.round(Math.min(1, leadership / TALENT_FOCUS_POINTS) * 15);
}

function skillOverlapScore(companyScores, talentScores) {
  const overlap = topMatchingAxes(companyScores, talentScores, 3);
  return Math.round((overlap.length / 3) * 15);
}

function availabilityScore(isAvailable) {
  return isAvailable === false ? 0 : 5;
}

// @returns { total, breakdown: [{ key, label, score, max }] }
export function computeMatchBreakdown({
  companyScores,
  talentScores,
  companyPhase,
  companyIndustry,
  talentPhaseTags = [],
  talentIndustry,
  isAvailable = true,
}) {
  const items = [
    { key: "issueArea", label: "課題領域一致", score: issueAreaScore(companyScores, talentScores), max: 30 },
    { key: "phase", label: "会社フェーズ", score: phaseScore(companyPhase, talentPhaseTags), max: 20 },
    { key: "industry", label: "業界経験", score: industryScore(companyIndustry, talentIndustry), max: 15 },
    { key: "role", label: "役職経験", score: roleExperienceScore(talentScores), max: 15 },
    { key: "skill", label: "スキル一致", score: skillOverlapScore(companyScores, talentScores), max: 15 },
    { key: "availability", label: "稼働条件", score: availabilityScore(isAvailable), max: 5 },
  ];
  const total = items.reduce((s, i) => s + i.score, 0);
  return { total: Math.min(100, total), breakdown: items };
}
