import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { scoreMatch, topMatchingAxes, rankCandidates } from "../lib/matching.js";
import { AXIS_KEYS, clampAxisScores, sanitizeAxisNotes } from "../lib/axes.js";

const ZERO_COMPANY = Object.fromEntries(AXIS_KEYS.map((k) => [k, 100])); // 課題なし(深刻度0)
const CRISIS_COMPANY = Object.fromEntries(AXIS_KEYS.map((k) => [k, 0])); // 全軸が最も深刻
const ZERO_TALENT = Object.fromEntries(AXIS_KEYS.map((k) => [k, 0])); // 強みなし
const MAX_TALENT = Object.fromEntries(AXIS_KEYS.map((k) => [k, 30])); // 全軸満点

describe("scoreMatch", () => {
  test("課題が全くない企業は、人材のスキルに関わらず適合度が低い(重みが0に近づく)", () => {
    const score = scoreMatch(ZERO_COMPANY, MAX_TALENT, null, []);
    assert.equal(score, 0);
  });

  test("深刻な課題を持つ企業に、全軸満点の人材が組み合わさると適合度は最大の100", () => {
    const score = scoreMatch(CRISIS_COMPANY, MAX_TALENT, null, []);
    assert.equal(score, 100);
  });

  test("深刻な課題を持つ企業に、強みが全くない人材では適合度は0", () => {
    const score = scoreMatch(CRISIS_COMPANY, ZERO_TALENT, null, []);
    assert.equal(score, 0);
  });

  test("フェーズが一致するとボーナスが加算される", () => {
    const company = { ...CRISIS_COMPANY, hr: 50 }; // hr以外は深刻、hrはそこそこ
    const talent = { ...ZERO_TALENT, hr: 30 }; // hrだけ強い
    const withoutBonus = scoreMatch(company, talent, "シリーズA", []);
    const withBonus = scoreMatch(company, talent, "シリーズA", ["シリーズA"]);
    assert.ok(withBonus > withoutBonus, "フェーズ一致時はスコアが上がるはず");
    assert.equal(withBonus - withoutBonus, 6, "デフォルトのphaseBonusは6");
  });

  test("スコアは100を超えない(フェーズボーナスで上限突破しない)", () => {
    const score = scoreMatch(CRISIS_COMPANY, MAX_TALENT, "シリーズA", ["シリーズA"]);
    assert.ok(score <= 100);
  });

  test("companyScoresに軸が欠けていてもクラッシュしない(デフォルト50扱い)", () => {
    const score = scoreMatch({}, MAX_TALENT, null, []);
    assert.ok(Number.isFinite(score));
  });

  test("axisWeightMultipliersを省略した場合は全軸1.0扱いで、指定時と同じ結果になる", () => {
    const withoutParam = scoreMatch(CRISIS_COMPANY, ZERO_TALENT, "シリーズA", ["シリーズA"]);
    const withNeutralParam = scoreMatch(CRISIS_COMPANY, ZERO_TALENT, "シリーズA", ["シリーズA"], 6, {});
    assert.equal(withoutParam, withNeutralParam);
  });

  test("特定軸の学習係数を上げると、その軸が強い人材の適合度が上がる", () => {
    const company = { ...CRISIS_COMPANY }; // 全軸深刻(gapが均等)
    const talent = { ...ZERO_TALENT, hr: 30 }; // hrだけ満点
    const base = scoreMatch(company, talent, null, []);
    const boosted = scoreMatch(company, talent, null, [], 6, { hr: 1.3 });
    assert.ok(boosted > base, "hr軸の学習係数を上げるとhrが強い人材の適合度が上がるはず");
  });
});

describe("topMatchingAxes", () => {
  test("企業の深刻軸と人材の強み軸が一致する軸だけを返す", () => {
    const company = { ...ZERO_COMPANY, hr: 10, sales: 15, tech: 20 }; // 深刻なのは hr, sales, tech の順
    const talent = { ...ZERO_TALENT, hr: 29, marketing: 25, ops: 20 }; // 強いのは hr, marketing, ops
    const overlap = topMatchingAxes(company, talent, 3);
    assert.deepEqual(overlap, ["hr"]); // 唯一の共通軸
  });

  test("重なりがなければ空配列を返す", () => {
    const company = { ...ZERO_COMPANY, hr: 5, sales: 10, tech: 15 };
    const talent = { ...ZERO_TALENT, marketing: 30, ops: 25, cs: 20 };
    const overlap = topMatchingAxes(company, talent, 3);
    assert.deepEqual(overlap, []);
  });
});

describe("rankCandidates", () => {
  test("閾値未満の候補を除外し、スコア降順に並べる", () => {
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const scores = { a: 80, b: 10, c: 50 };
    const ranked = rankCandidates(list, (item) => scores[item.id], 30);
    assert.deepEqual(ranked.map((r) => r.id), ["a", "c"]);
    assert.equal(ranked[0].match, 80);
  });

  test("全員が閾値未満なら空配列", () => {
    const list = [{ id: "a" }, { id: "b" }];
    const ranked = rankCandidates(list, () => 5, 30);
    assert.deepEqual(ranked, []);
  });
});

describe("clampAxisScores", () => {
  test("範囲外の値を0〜maxにクランプする", () => {
    const raw = Object.fromEntries(AXIS_KEYS.map((k, i) => [k, i === 0 ? -10 : i === 1 ? 999 : 50]));
    const clamped = clampAxisScores(raw, 100);
    assert.equal(clamped[AXIS_KEYS[0]], 0);
    assert.equal(clamped[AXIS_KEYS[1]], 100);
    assert.equal(clamped[AXIS_KEYS[2]], 50);
  });

  test("欠けている軸・不正な値は中央値で補完する", () => {
    const clamped = clampAxisScores({}, 30);
    for (const k of AXIS_KEYS) {
      assert.equal(clamped[k], 15);
    }
  });

  test("すべての軸キーが出力に含まれる", () => {
    const clamped = clampAxisScores({ product: 10 }, 100);
    assert.equal(Object.keys(clamped).length, AXIS_KEYS.length);
  });
});

describe("sanitizeAxisNotes", () => {
  test("全10軸のキーを保証する", () => {
    const notes = sanitizeAxisNotes({ product: "テスト" });
    assert.equal(Object.keys(notes).length, AXIS_KEYS.length);
  });

  test("欠けている軸は空文字になる", () => {
    const notes = sanitizeAxisNotes({ product: "テスト" });
    assert.equal(notes.sales, "");
  });

  test("文字列以外の値は空文字に置き換える", () => {
    const notes = sanitizeAxisNotes({ product: 12345, sales: null });
    assert.equal(notes.product, "");
    assert.equal(notes.sales, "");
  });

  test("長すぎる文字列は200文字に切り詰める", () => {
    const notes = sanitizeAxisNotes({ product: "あ".repeat(300) });
    assert.equal(notes.product.length, 200);
  });
});
