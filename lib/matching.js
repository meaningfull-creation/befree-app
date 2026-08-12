// BATTER BOX マッチングロジック実装
// 詳細な設計根拠は BeFree_マッチングロジック設計.md を参照(旧サービス名時代に作成したドキュメントです)。
//
//  gap_i      = (100 - companyScore_i) / 100   … 企業側: 課題の深刻度
//  strength_i = talentScore_i / 30              … 人材側: 強みの強さ
//  axisFit_i  = gap_i × strength_i
//  weight_i   = (gap_i × learnedWeight_i) / Σ(gap × learnedWeight)  … 深刻な軸ほど、かつ過去の成果が良い軸ほど重みが大きい
//  overall    = Σ(weight_i × axisFit_i) × 100 + phaseBonus
//
// learnedWeight(軸ごとの学習係数)は lib/learning.js で EngagementOutcome の蓄積から計算する。
// 蓄積データが増えるほどこの係数の精度が上がり、同じ計算式を真似ただけの競合には再現できない差別化要素になる。

import { AXIS_KEYS } from "./axes.js";

export function scoreMatch(companyScores, talentScores, companyPhase, talentPhaseTags = [], phaseBonus = 6, axisWeightMultipliers = {}) {
  const gap = AXIS_KEYS.map((k) => (100 - (companyScores?.[k] ?? 50)) / 100);
  const strength = AXIS_KEYS.map((k) => (talentScores?.[k] ?? 0) / 30);
  const axisFit = gap.map((g, i) => g * strength[i]);

  const learned = AXIS_KEYS.map((k) => axisWeightMultipliers[k] ?? 1);
  const weightedGap = gap.map((g, i) => g * learned[i]);
  const weightedGapSum = weightedGap.reduce((s, g) => s + g, 0) || 1;
  const weights = weightedGap.map((g) => g / weightedGapSum);

  let overall = weights.reduce((s, w, i) => s + w * axisFit[i], 0) * 100;

  const phaseHit = companyPhase && talentPhaseTags.some((p) => companyPhase.includes(p));
  if (phaseHit) overall += phaseBonus;

  return Math.min(100, Math.round(overall));
}

// 一致軸(根拠生成用): 企業側 gap 上位3軸 ∩ 人材側 strength 上位3軸
export function topMatchingAxes(companyScores, talentScores, n = 3) {
  const byGap = [...AXIS_KEYS]
    .map((k) => ({ key: k, gap: (100 - (companyScores?.[k] ?? 50)) / 100 }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, n)
    .map((x) => x.key);
  const byStrength = [...AXIS_KEYS]
    .map((k) => ({ key: k, strength: (talentScores?.[k] ?? 0) / 30 }))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, n)
    .map((x) => x.key);
  return byGap.filter((k) => byStrength.includes(k));
}

// 30%未満の候補を足切りし、適合度降順でランク付けする
export function rankCandidates(list, scoreFn, threshold = 30) {
  return list
    .map((item) => ({ ...item, match: scoreFn(item) }))
    .filter((item) => item.match >= threshold)
    .sort((a, b) => b.match - a.match);
}
