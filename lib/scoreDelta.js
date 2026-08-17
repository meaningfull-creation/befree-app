// 再診断のBefore/After比較用。2時点のaxisScoresを受け取り、軸ごとの差分と
// 総合スコアの差分を計算する。外部依存なし、テスト可能。

import { AXES } from "./axes.js";

// @returns { totalBefore, totalAfter, totalDelta, axisDeltas: [{ key, label, before, after, delta }] }
export function computeScoreDelta(previousScores, currentScores) {
  const axisDeltas = AXES.map((a) => {
    const before = previousScores?.[a.key] ?? 0;
    const after = currentScores?.[a.key] ?? 0;
    return { key: a.key, label: a.label, before, after, delta: after - before };
  });
  const totalBefore = Math.round(axisDeltas.reduce((s, d) => s + d.before, 0) / AXES.length);
  const totalAfter = Math.round(axisDeltas.reduce((s, d) => s + d.after, 0) / AXES.length);
  return { totalBefore, totalAfter, totalDelta: totalAfter - totalBefore, axisDeltas };
}
