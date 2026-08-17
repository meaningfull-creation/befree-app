// MATCH%の内訳を、6つの観点に分解して算出する純粋ロジック(外部依存なし、テスト可能)。
// scoreMatch()(lib/matching.js)が算出する総合スコアとは別に、「なぜこの点数なのか」を
// 経営者が納得できる形で開示するための補助的な内訳表示に使う。
//
// 配点(合計100点):
//   課題領域一致   30点 … 企業の課題(gap)と人材の強み(strength)の重み付き一致度
//   会社フェーズ   20点 … 人材の経験フェーズと企業の現フェーズが一致するか
//   業界経験       15点 … 人材の業種経験と企業の業種が一致/近いか
//   役職経験       15点 … 人材の経営体制(leadership)軸のスコアを役職経験の代理指標として使用
//   スキル一致     15点 … 企業の深刻軸トップ3と人材の強み軸トップ3の重なり具合
//   稼働条件        5点 … 人材が現在稼働可能(足切り対象でない)か

import { AXIS_KEYS } from "./axes.js";
import { topMatchingAxes } from "./matching.js";

function issueAreaScore(companyScores, talentScores) {
  const gap = AXIS_KEYS.map((k) => (100 - (companyScores?.[k] ?? 50)) / 100);
  const strength = AXIS_KEYS.map((k) => (talentScores?.[k] ?? 0) / 30);
  const gapSum = gap.reduce((s, g) => s + g, 0) || 1;
  const weights = gap.map((g) => g / gapSum);
  const fit = weights.reduce((s, w, i) => s + w * gap[i] * strength[i], 0);
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
  const leadership = talentScores?.leadership ?? 0;
  return Math.round((leadership / 30) * 15);
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
