// 蓄積されたEngagementOutcome(成果スコア)から、軸ごとの「学習係数」を計算する純粋ロジック。
// 外部依存(Prisma等)を持たないため、単体テストから直接検証できる。
//
// 考え方: ある軸が「一致軸」として採用されたマッチングの平均成果スコアが高いほど、
// その軸はマッチング精度への貢献度が高いとみなし、今後のスコア計算での重みを上げる。
// 逆に平均成果が低い軸は重みを下げる。データ件数が少ない軸は1.0(中立)のままにし、
// 少数のサンプルで過剰に調整してしまう(過学習)のを防ぐ。

const MIN_SAMPLES = 3; // これ未満のサンプル数では学習係数を適用しない(信頼区間が狭すぎるため)
const MULTIPLIER_MIN = 0.7;
const MULTIPLIER_MAX = 1.3;
const NEUTRAL_SCORE = 50; // この成果スコアを基準(倍率1.0)とする

// 平均成果スコア(0〜100)とサンプル数から、軸の重み倍率を計算する。
// サンプル数が少ないほど、中立値(1.0)に向けて倍率を減衰させる(ベイズ的な縮小)。
export function computeWeightMultiplier(avgOutcomeScore, sampleCount) {
  if (sampleCount < MIN_SAMPLES) return 1;

  const raw = 1 + (avgOutcomeScore - NEUTRAL_SCORE) / 200; // 成果0点→0.75倍、100点→1.25倍が素の値
  const clamped = Math.max(MULTIPLIER_MIN, Math.min(MULTIPLIER_MAX, raw));

  // サンプル数が少ないうちは中立値寄りに縮小し、データが増えるほど本来の倍率に近づける
  const confidence = Math.min(1, (sampleCount - MIN_SAMPLES) / 12); // 15件で信頼度ほぼ100%
  return 1 + (clamped - 1) * confidence;
}

// EngagementOutcomeの生データ(各レコードに一致軸のリストが紐づいたもの)から、
// 軸ごとの { sampleCount, avgOutcomeScore, weightMultiplier } を集計する。
// records: [{ axisKeys: string[], outcomeScore: number }]
export function aggregateAxisPerformance(records, axisKeys) {
  const stats = Object.fromEntries(axisKeys.map((k) => [k, { sum: 0, count: 0 }]));

  for (const r of records) {
    for (const axis of r.axisKeys || []) {
      if (!stats[axis]) continue;
      stats[axis].sum += r.outcomeScore;
      stats[axis].count += 1;
    }
  }

  const result = {};
  for (const k of axisKeys) {
    const { sum, count } = stats[k];
    const avg = count > 0 ? sum / count : null;
    result[k] = {
      sampleCount: count,
      avgOutcomeScore: avg,
      weightMultiplier: avg != null ? computeWeightMultiplier(avg, count) : 1,
    };
  }
  return result;
}
