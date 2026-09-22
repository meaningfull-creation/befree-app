// BATTER BOX マッチングロジック実装
// 詳細な設計根拠は BeFree_マッチングロジック設計.md を参照(旧サービス名時代に作成したドキュメントです)。
//
// v4.4で再設計。旧式は10軸全体の加重平均だったため、1〜2軸に強い「専門家型」の人材
// (このサービスの人材像そのもの)が構造的に20%台に留まり、30%の足切りにほぼ全員が
// 引っかかるという欠陥があった。新式は「企業の課題TOP3をどれだけ埋められるか」を測る:
//
//  gap_i      = (100 - companyScore_i) / 100          … 企業側: 課題の深刻度
//  strength_i = talentScore_i / 30                     … 人材側: 強みの強さ
//  対象軸     = gap × learnedWeight の上位 topK 軸(=課題TOP3)
//  weight_i   = (gap_i × learnedWeight_i) / Σ(同上)    … TOP3内で深刻な軸ほど重い
//  overall    = Σ(weight_i × strength_i) × 100 + phaseBonus   (上限100)
//
// つまりMATCH%は「あなたの会社のいちばん深刻な課題3つに対する、この人の強さの加重平均」。
// 課題と無関係な軸が弱くてもスコアは下がらない(月10時間で課題TOP3を埋める、という商品設計と一致)。
//
// learnedWeight(軸ごとの学習係数)は lib/learning.js で EngagementOutcome の蓄積から計算する。
// 蓄積データが増えるほどこの係数の精度が上がり、同じ計算式を真似ただけの競合には再現できない差別化要素になる。

import { AXIS_KEYS } from "./axes.js";

export function scoreMatch(companyScores, talentScores, companyPhase, talentPhaseTags = [], phaseBonus = 6, axisWeightMultipliers = {}, topK = 3) {
  const axes = AXIS_KEYS.map((k) => {
    const gap = (100 - (companyScores?.[k] ?? 50)) / 100;
    const learned = axisWeightMultipliers[k] ?? 1;
    return {
      gap,
      strength: (talentScores?.[k] ?? 0) / 30,
      weightedGap: gap * learned,
    };
  });

  // 課題TOP3(学習係数込みで深刻な軸の上位topK)だけを評価対象にする。
  // sortは安定ソートなので、同点時はAXIS_KEYSの定義順で決まる(結果は決定的)。
  const target = [...axes].sort((a, b) => b.weightedGap - a.weightedGap).slice(0, topK);
  const weightSum = target.reduce((s, a) => s + a.weightedGap, 0) || 1;

  let overall = target.reduce((s, a) => s + (a.weightedGap / weightSum) * a.strength, 0) * 100;

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
