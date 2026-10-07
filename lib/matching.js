// BATTER BOX マッチングロジック実装
// 詳細な設計根拠は BeFree_マッチングロジック設計.md を参照(旧サービス名時代に作成したドキュメントです)。
//
// v4.4で「企業の課題TOP3をどれだけ埋められるか」を測る式に再設計し、
// v6.6で両側を「100点の配分」として扱う配点制に変更した。
//
// 配点制にした理由:
//   旧式は人材側の各軸を0〜30点で独立に採点していたため、経験豊富な人ほど全軸が高くなり、
//   どの企業から見ても上位に並んでしまった。これだとハイレイヤーの人材が入るたびに
//   ローレイヤーの人材に打席が回らなくなる。
//   スコアを「配分」にすると、表せるのは“どこに経験が寄っているか”だけになる。
//   合計100点は誰でも同じなので、勝てるのは企業が実際に困っている領域に
//   経験を積んできた人になる。
//
//  need_i     = issueAllocation(企業スコア)_i        … 企業: 課題100点の配分
//  exp_i      = normalizeAllocation(人材スコア)_i    … 人材: 経験100点の配分
//  strength_i = min(1, exp_i / 30)                   … 30点集まれば「この軸は即戦力」
//  対象軸     = need × learnedWeight の上位 topK 軸(=課題TOP3)
//  weight_i   = (need_i × learned_i) / Σ(同上)       … TOP3内で深刻な軸ほど重い
//  overall    = Σ(weight_i × strength_i) × 100 + phaseBonus   (上限100)
//
// 合計100点なので30点以上を取れる軸は最大3つ。つまり誰であっても
// 「すべての企業に対して満点」にはならない。
//
// normalizeAllocation はべき等なので、配点制より前に保存された0〜30点のスキルマップも
// そのまま同じ式に通せる(移行作業は不要。形=強みの偏りは保たれる)。
//
// learnedWeight(軸ごとの学習係数)は lib/learning.js で EngagementOutcome の蓄積から計算する。
// 蓄積データが増えるほどこの係数の精度が上がり、同じ計算式を真似ただけの競合には再現できない差別化要素になる。

import { AXIS_KEYS, TALENT_FOCUS_POINTS, normalizeAllocation, issueAllocation } from "./axes.js";

// --- 計算の使い回し ---------------------------------------------------------
// scoreMatch は「企業×人材」の総当たりで呼ばれる(管理画面のマッチング表、
// 候補一覧のランキング)。1回の呼び出しの中身を分解すると、
//   ・企業の課題配分と、評価対象のTOP3軸とその重み … 企業側だけで決まる
//   ・各軸の強さ(strength)                        … 人材側だけで決まる
// のに、どちらも毎回ゼロから計算し直していた。
// 企業300社×人材300人の表では、同じ正規化を18万回やり直していたことになる。
//
// スコアの値は一切変えずに、企業側・人材側それぞれの中間結果を
// スコアの元オブジェクト(DBから読んだ axisScores)をキーにして使い回す。
// WeakMapなので、元オブジェクトが捨てられればキャッシュも一緒に消える。
// axisScoresは読み取り専用に扱われており(更新時は新しいオブジェクトを作る)、
// 同じオブジェクトの中身が書き換わることはない。
const companyTargetsCache = new WeakMap();
const talentStrengthCache = new WeakMap();

function companyTargets(companyScores, axisWeightMultipliers, topK) {
  const cached = companyScores && typeof companyScores === "object" ? companyTargetsCache.get(companyScores) : null;
  // 学習係数(axisWeightMultipliers)とtopKが同じ呼び出しの間だけ使い回す
  if (cached && cached.mult === axisWeightMultipliers && cached.topK === topK) return cached.targets;

  const need = issueAllocation(companyScores);
  const axes = AXIS_KEYS.map((k) => ({ key: k, weightedNeed: need[k] * (axisWeightMultipliers[k] ?? 1) }));
  // 課題TOP3(学習係数込みで深刻な軸の上位topK)だけを評価対象にする。
  // sortは安定ソートなので、同点時はAXIS_KEYSの定義順で決まる(結果は決定的)。
  const target = [...axes].sort((a, b) => b.weightedNeed - a.weightedNeed).slice(0, topK);
  const weightSum = target.reduce((s, a) => s + a.weightedNeed, 0) || 1;
  const targets = target.map((a) => ({ key: a.key, w: a.weightedNeed / weightSum }));

  if (companyScores && typeof companyScores === "object") {
    companyTargetsCache.set(companyScores, { mult: axisWeightMultipliers, topK, targets });
  }
  return targets;
}

function talentStrength(talentScores) {
  const cached = talentScores && typeof talentScores === "object" ? talentStrengthCache.get(talentScores) : null;
  if (cached) return cached;

  const exp = normalizeAllocation(talentScores);
  const strength = {};
  AXIS_KEYS.forEach((k) => { strength[k] = Math.min(1, exp[k] / TALENT_FOCUS_POINTS); });

  if (talentScores && typeof talentScores === "object") talentStrengthCache.set(talentScores, strength);
  return strength;
}

export function scoreMatch(companyScores, talentScores, companyPhase, talentPhaseTags = [], phaseBonus = 6, axisWeightMultipliers = {}, topK = 3) {
  const targets = companyTargets(companyScores, axisWeightMultipliers, topK);
  const strength = talentStrength(talentScores);

  let overall = targets.reduce((s, t) => s + t.w * strength[t.key], 0) * 100;

  const phaseHit = companyPhase && talentPhaseTags.some((p) => companyPhase.includes(p));
  if (phaseHit) overall += phaseBonus;

  return Math.min(100, Math.round(overall));
}

// 一致軸(根拠生成用): 企業側の課題配分 上位3軸 ∩ 人材側の経験配分 上位3軸
export function topMatchingAxes(companyScores, talentScores, n = 3) {
  const need = issueAllocation(companyScores);
  const exp = normalizeAllocation(talentScores);
  const topN = (alloc) =>
    [...AXIS_KEYS]
      .map((k) => ({ key: k, v: alloc[k] }))
      .sort((a, b) => b.v - a.v)
      .slice(0, n)
      .map((x) => x.key);
  const byNeed = topN(need);
  const byStrength = new Set(topN(exp));
  return byNeed.filter((k) => byStrength.has(k));
}

// 30%未満の候補を足切りし、適合度降順でランク付けする。
// 配点制では「企業の課題TOP3のうち、3分の1以上をカバーできている」が下限の目安。
export function rankCandidates(list, scoreFn, threshold = 30) {
  return list
    .map((item) => ({ ...item, match: scoreFn(item) }))
    .filter((item) => item.match >= threshold)
    .sort((a, b) => b.match - a.match);
}
