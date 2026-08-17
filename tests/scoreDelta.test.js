import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeScoreDelta } from "../lib/scoreDelta.js";
import { AXIS_KEYS } from "../lib/axes.js";

const ZERO = Object.fromEntries(AXIS_KEYS.map((k) => [k, 0]));
const FULL = Object.fromEntries(AXIS_KEYS.map((k) => [k, 100]));

describe("computeScoreDelta", () => {
  test("全軸が0→100に改善した場合、総合スコアの差分は100", () => {
    const { totalBefore, totalAfter, totalDelta } = computeScoreDelta(ZERO, FULL);
    assert.equal(totalBefore, 0);
    assert.equal(totalAfter, 100);
    assert.equal(totalDelta, 100);
  });

  test("変化がなければ全軸の差分は0", () => {
    const { totalDelta, axisDeltas } = computeScoreDelta(FULL, FULL);
    assert.equal(totalDelta, 0);
    for (const d of axisDeltas) assert.equal(d.delta, 0);
  });

  test("軸ごとの差分が正しく計算される", () => {
    const before = { ...ZERO, hr: 20 };
    const after = { ...ZERO, hr: 55 };
    const { axisDeltas } = computeScoreDelta(before, after);
    const hr = axisDeltas.find((d) => d.key === "hr");
    assert.equal(hr.before, 20);
    assert.equal(hr.after, 55);
    assert.equal(hr.delta, 35);
  });

  test("スコアが悪化した場合は負の差分になる", () => {
    const before = { ...ZERO, sales: 80 };
    const after = { ...ZERO, sales: 40 };
    const { axisDeltas, totalDelta } = computeScoreDelta(before, after);
    assert.equal(axisDeltas.find((d) => d.key === "sales").delta, -40);
    assert.ok(totalDelta < 0);
  });

  test("すべての軸が結果に含まれる", () => {
    const { axisDeltas } = computeScoreDelta(ZERO, FULL);
    assert.equal(axisDeltas.length, AXIS_KEYS.length);
  });
});
