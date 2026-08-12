import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeWeightMultiplier, aggregateAxisPerformance } from "../lib/learning.js";

describe("computeWeightMultiplier", () => {
  test("サンプル数が最低件数未満なら中立値1を返す(過学習防止)", () => {
    assert.equal(computeWeightMultiplier(95, 0), 1);
    assert.equal(computeWeightMultiplier(95, 2), 1);
  });

  test("平均成果が50点(中立)なら、サンプルが十分でも倍率はほぼ1", () => {
    const m = computeWeightMultiplier(50, 20);
    assert.ok(Math.abs(m - 1) < 0.01);
  });

  test("平均成果が高いほど倍率は1を上回る", () => {
    const m = computeWeightMultiplier(90, 20);
    assert.ok(m > 1);
  });

  test("平均成果が低いほど倍率は1を下回る", () => {
    const m = computeWeightMultiplier(10, 20);
    assert.ok(m < 1);
  });

  test("倍率は上限1.3・下限0.7でクランプされる", () => {
    const high = computeWeightMultiplier(100, 100);
    const low = computeWeightMultiplier(0, 100);
    assert.ok(high <= 1.3);
    assert.ok(low >= 0.7);
  });

  test("サンプル数が少ないほど中立値に近づく(信頼度による縮小)", () => {
    const fewSamples = computeWeightMultiplier(100, 4);
    const manySamples = computeWeightMultiplier(100, 30);
    assert.ok(Math.abs(fewSamples - 1) < Math.abs(manySamples - 1));
  });
});

describe("aggregateAxisPerformance", () => {
  test("軸ごとに平均成果スコアとサンプル数を正しく集計する", () => {
    const records = [
      { axisKeys: ["hr", "sales"], outcomeScore: 80 },
      { axisKeys: ["hr"], outcomeScore: 60 },
      { axisKeys: ["tech"], outcomeScore: 40 },
    ];
    const result = aggregateAxisPerformance(records, ["hr", "sales", "tech", "ops"]);

    assert.equal(result.hr.sampleCount, 2);
    assert.equal(result.hr.avgOutcomeScore, 70);
    assert.equal(result.sales.sampleCount, 1);
    assert.equal(result.tech.sampleCount, 1);
    assert.equal(result.ops.sampleCount, 0);
    assert.equal(result.ops.avgOutcomeScore, null);
  });

  test("データが全くない軸は倍率1で返る", () => {
    const result = aggregateAxisPerformance([], ["hr"]);
    assert.equal(result.hr.weightMultiplier, 1);
  });

  test("すべての指定軸キーが結果に含まれる", () => {
    const result = aggregateAxisPerformance([], ["a", "b", "c"]);
    assert.deepEqual(Object.keys(result).sort(), ["a", "b", "c"]);
  });
});
