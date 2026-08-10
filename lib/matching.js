// BeFree マッチングロジック実装
// 詳細な設計根拠は BeFree_マッチングロジック設計.md を参照。
//
//  gap_i      = (100 - companyScore_i) / 100   … 企業側: 課題の深刻度
//  strength_i = talentScore_i / 30              … 人材側: 強みの強さ
//  axisFit_i  = gap_i × strength_i
//  weight_i   = gap_i / Σgap                     … 深刻な軸ほど重みが大きい
//  overall    = Σ(weight_i × axisFit_i) × 100 + phaseBonus

import { AXIS_KEYS } from "./axes";

export function scoreMatch(companyScores, talentScores, companyPhase, talentPhaseTags = [], phaseBonus = 6) {
  const gap = AXIS_KEYS.map((k) => (100 - (companyScores?.[k] ?? 50)) / 100);
  const strength = AXIS_KEYS.map((k) => (talentScores?.[k] ?? 0) / 30);
  const axisFit = gap.map((g, i) => g * strength[i]);

  const gapSum = gap.reduce((s, g) => s + g, 0) || 1;
  const weights = gap.map((g) => g / gapSum);

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
