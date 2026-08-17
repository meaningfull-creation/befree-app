import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeMatchBreakdown } from "../lib/matchBreakdown.js";
import { AXIS_KEYS } from "../lib/axes.js";

const CRISIS_COMPANY = Object.fromEntries(AXIS_KEYS.map((k) => [k, 0]));
const MAX_TALENT = Object.fromEntries(AXIS_KEYS.map((k) => [k, 30]));
const ZERO_TALENT = Object.fromEntries(AXIS_KEYS.map((k) => [k, 0]));

describe("computeMatchBreakdown", () => {
  test("6つの内訳項目を返し、各上限を超えない", () => {
    const { breakdown } = computeMatchBreakdown({
      companyScores: CRISIS_COMPANY,
      talentScores: MAX_TALENT,
      companyPhase: "シリーズA",
      talentPhaseTags: ["シリーズA"],
      companyIndustry: "SaaS",
      talentIndustry: "SaaS",
    });
    assert.equal(breakdown.length, 6);
    for (const item of breakdown) {
      assert.ok(item.score <= item.max, `${item.key} exceeds max`);
      assert.ok(item.score >= 0, `${item.key} is negative`);
    }
  });

  test("配点の合計は100点", () => {
    const { breakdown } = computeMatchBreakdown({ companyScores: CRISIS_COMPANY, talentScores: MAX_TALENT });
    const maxSum = breakdown.reduce((s, i) => s + i.max, 0);
    assert.equal(maxSum, 100);
  });

  test("totalは各項目の合計と一致し、100を超えない", () => {
    const { total, breakdown } = computeMatchBreakdown({
      companyScores: CRISIS_COMPANY,
      talentScores: MAX_TALENT,
      companyPhase: "シリーズA",
      talentPhaseTags: ["シリーズA"],
      companyIndustry: "SaaS",
      talentIndustry: "SaaS",
    });
    const sum = breakdown.reduce((s, i) => s + i.score, 0);
    assert.equal(total, sum);
    assert.ok(total <= 100);
  });

  test("フェーズが一致すると20点満点、しなければ0点", () => {
    const withMatch = computeMatchBreakdown({ companyScores: CRISIS_COMPANY, talentScores: ZERO_TALENT, companyPhase: "シリーズA", talentPhaseTags: ["シリーズA"] });
    const withoutMatch = computeMatchBreakdown({ companyScores: CRISIS_COMPANY, talentScores: ZERO_TALENT, companyPhase: "シリーズA", talentPhaseTags: ["シード"] });
    const phaseItem = (r) => r.breakdown.find((i) => i.key === "phase").score;
    assert.equal(phaseItem(withMatch), 20);
    assert.equal(phaseItem(withoutMatch), 0);
  });

  test("業種が完全一致すれば15点、一部経験ありなら5点、情報なしなら0点", () => {
    const exact = computeMatchBreakdown({ companyScores: CRISIS_COMPANY, talentScores: ZERO_TALENT, companyIndustry: "SaaS", talentIndustry: "SaaS" });
    const partial = computeMatchBreakdown({ companyScores: CRISIS_COMPANY, talentScores: ZERO_TALENT, companyIndustry: "SaaS", talentIndustry: "フィンテック" });
    const none = computeMatchBreakdown({ companyScores: CRISIS_COMPANY, talentScores: ZERO_TALENT });
    const industryItem = (r) => r.breakdown.find((i) => i.key === "industry").score;
    assert.equal(industryItem(exact), 15);
    assert.equal(industryItem(partial), 5);
    assert.equal(industryItem(none), 0);
  });

  test("稼働不可の場合は稼働条件が0点になる", () => {
    const available = computeMatchBreakdown({ companyScores: CRISIS_COMPANY, talentScores: ZERO_TALENT, isAvailable: true });
    const unavailable = computeMatchBreakdown({ companyScores: CRISIS_COMPANY, talentScores: ZERO_TALENT, isAvailable: false });
    const availItem = (r) => r.breakdown.find((i) => i.key === "availability").score;
    assert.equal(availItem(available), 5);
    assert.equal(availItem(unavailable), 0);
  });

  test("役職経験はleadership軸のスコアに比例する", () => {
    const highLeadership = computeMatchBreakdown({ companyScores: CRISIS_COMPANY, talentScores: { ...ZERO_TALENT, leadership: 30 } });
    const noLeadership = computeMatchBreakdown({ companyScores: CRISIS_COMPANY, talentScores: ZERO_TALENT });
    const roleItem = (r) => r.breakdown.find((i) => i.key === "role").score;
    assert.equal(roleItem(highLeadership), 15);
    assert.equal(roleItem(noLeadership), 0);
  });
});
