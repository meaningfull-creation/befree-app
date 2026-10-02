import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { scoreMatch, topMatchingAxes, rankCandidates } from "../lib/matching.js";
import { AXIS_KEYS, clampAxisScores, sanitizeAxisNotes, sanitizeTopIssueDetails, normalizeAllocation, issueAllocation, TALENT_POINT_BUDGET } from "../lib/axes.js";

const ZERO_COMPANY = Object.fromEntries(AXIS_KEYS.map((k) => [k, 100])); // 課題なし(深刻度0)
const CRISIS_COMPANY = Object.fromEntries(AXIS_KEYS.map((k) => [k, 0])); // 全軸が最も深刻
const ZERO_TALENT = Object.fromEntries(AXIS_KEYS.map((k) => [k, 0])); // 強みなし
// 配点制(v6.6)より前の「全軸満点(各30点)」のデータ。
// 配点に直すと全軸10点ずつの“万能型”になり、どの軸も即戦力ラインに届かない。
const MAX_TALENT = Object.fromEntries(AXIS_KEYS.map((k) => [k, 30]));

describe("scoreMatch", () => {
  test("課題が全くない企業は、人材のスキルに関わらず適合度が低い(重みが0に近づく)", () => {
    const score = scoreMatch(ZERO_COMPANY, MAX_TALENT, null, []);
    assert.equal(score, 0);
  });

  // v6.6の配点制を固定するテスト。
  // 「全軸が高い人材」はもう作れない(合計100点なので、厚くした分だけ他が薄くなる)。
  test("企業の課題TOP3に経験を振り切った人材は適合度100になる", () => {
    const company = Object.fromEntries(AXIS_KEYS.map((k) => [k, 80]));
    company.sales = 0;
    company.marketing = 0;
    company.hr = 0;
    // 100点を課題TOP3だけに配分した人材(各軸が即戦力ライン30点以上)
    const focused = { ...ZERO_TALENT, sales: 34, marketing: 33, hr: 33 };
    assert.equal(scoreMatch(company, focused, null, []), 100);
  });

  test("旧式の「全軸満点」データは、配点に直すと万能型になり満点にはならない", () => {
    const score = scoreMatch(CRISIS_COMPANY, MAX_TALENT, null, []);
    // 10軸に10点ずつ → どの軸も 10/30 ≒ 0.33 止まり
    assert.equal(score, 33);
    assert.ok(score < 100, "ハイレイヤーでも全企業に対して満点にはならない");
  });

  test("特化型は、課題が噛み合う企業では万能型に勝ち、噛み合わない企業では負ける", () => {
    const opsCompany = Object.fromEntries(AXIS_KEYS.map((k) => [k, 80]));
    opsCompany.ops = 10;
    opsCompany.hr = 25;
    opsCompany.cs = 35;
    // 現場を回してきた人(ops中心)
    const fieldLead = { ...ZERO_TALENT, ops: 40, hr: 25, sales: 20, cs: 15 };
    const generalist = Object.fromEntries(AXIS_KEYS.map((k) => [k, 10]));
    assert.ok(
      scoreMatch(opsCompany, fieldLead, null, []) > scoreMatch(opsCompany, generalist, null, []),
      "課題(ops)に経験が寄っている人のほうが高いはず"
    );

    const techCompany = Object.fromEntries(AXIS_KEYS.map((k) => [k, 80]));
    techCompany.tech = 10;
    techCompany.product = 20;
    techCompany.finance_raise = 30;
    assert.ok(
      scoreMatch(techCompany, fieldLead, null, []) < scoreMatch(opsCompany, fieldLead, null, []),
      "同じ人でも、課題が噛み合わない企業では低くなるはず"
    );
  });

  test("人材スコアを一律に底上げしても、配分が同じなら適合度は変わらない", () => {
    const company = Object.fromEntries(AXIS_KEYS.map((k) => [k, 60]));
    company.sales = 10;
    const modest = { ...ZERO_TALENT, sales: 12, marketing: 6, ops: 2 };
    const inflated = { ...ZERO_TALENT, sales: 60, marketing: 30, ops: 10 }; // 同じ比率で5倍
    assert.equal(scoreMatch(company, modest, null, []), scoreMatch(company, inflated, null, []));
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

  // v4.4の再設計を固定するテスト: 専門家型がまともなスコアになること
  test("課題TOP3に強い専門家は、無関係な軸が弱くても高スコアになる", () => {
    // sales(20)とmarketing(30)が深刻、他はそこそこ(60)の企業
    const company = Object.fromEntries(AXIS_KEYS.map((k) => [k, 60]));
    company.sales = 20;
    company.marketing = 30;
    // 営業・マーケの専門家(他の軸はほぼ経験なし)
    const specialist = { ...ZERO_TALENT, sales: 28, marketing: 20 };
    // 全軸そこそこのジェネラリスト
    const generalist = Object.fromEntries(AXIS_KEYS.map((k) => [k, 15]));

    const sSpec = scoreMatch(company, specialist, null, []);
    const sGen = scoreMatch(company, generalist, null, []);
    assert.ok(sSpec >= 40, `課題に合った専門家は40%以上になるはず(実際: ${sSpec})`);
    assert.ok(sSpec > sGen, "課題に合った専門家はジェネラリストより高スコアのはず");
  });

  test("課題と無関係な軸だけが強い人材は低スコアになる", () => {
    const company = Object.fromEntries(AXIS_KEYS.map((k) => [k, 60]));
    company.sales = 20;
    company.marketing = 30;
    // 課題(sales/marketing)とは無関係のtechだけ強い人材
    const mismatch = { ...ZERO_TALENT, tech: 28 };
    const s = scoreMatch(company, mismatch, null, []);
    assert.ok(s < 30, `課題と噛み合わない人材は足切り(30%)未満のはず(実際: ${s})`);
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

describe("sanitizeTopIssueDetails", () => {
  test("正常な入力はそのまま通す", () => {
    const input = [
      { axisKey: "hr", currentState: "現状説明", risk: "リスク説明", priority: "非常に高い", recommendedTiming: "1ヶ月以内" },
    ];
    const out = sanitizeTopIssueDetails(input);
    assert.equal(out.length, 1);
    assert.equal(out[0].axisKey, "hr");
    assert.equal(out[0].priority, "非常に高い");
  });

  test("配列でない入力は空配列を返す", () => {
    assert.deepEqual(sanitizeTopIssueDetails(null), []);
    assert.deepEqual(sanitizeTopIssueDetails("not an array"), []);
  });

  test("不正な軸キーは除外する", () => {
    const out = sanitizeTopIssueDetails([{ axisKey: "invalid_axis", currentState: "x", risk: "x", priority: "高い", recommendedTiming: "1ヶ月以内" }]);
    assert.deepEqual(out, []);
  });

  test("重複した軸キーは1件だけ残す", () => {
    const out = sanitizeTopIssueDetails([
      { axisKey: "hr", currentState: "1つ目", risk: "x", priority: "高い", recommendedTiming: "1ヶ月以内" },
      { axisKey: "hr", currentState: "2つ目", risk: "x", priority: "高い", recommendedTiming: "1ヶ月以内" },
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].currentState, "1つ目");
  });

  test("不正なpriority/recommendedTimingはデフォルト値に置き換える", () => {
    const out = sanitizeTopIssueDetails([
      { axisKey: "hr", currentState: "x", risk: "x", priority: "不正な値", recommendedTiming: "不正な値" },
    ]);
    assert.equal(out[0].priority, "中程度");
    assert.equal(out[0].recommendedTiming, "3ヶ月以内");
  });

  test("4件以上入力されても3件までに切り詰める", () => {
    const out = sanitizeTopIssueDetails(
      AXIS_KEYS.map((k) => ({ axisKey: k, currentState: "x", risk: "x", priority: "高い", recommendedTiming: "1ヶ月以内" }))
    );
    assert.equal(out.length, 3);
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

describe("normalizeAllocation(配点制)", () => {
  test("どんな入力でも10軸の合計がちょうど100点になる", () => {
    const cases = [
      { product: 8, sales: 10, marketing: 7, hr: 29, finance_raise: 6, finance_mgmt: 12, cs: 14, ops: 19, tech: 5, leadership: 22 },
      { ops: 1 },
      Object.fromEntries(AXIS_KEYS.map((k) => [k, 7])),
      { sales: 33.4, marketing: 33.3, hr: 33.3 },
    ];
    for (const c of cases) {
      const a = normalizeAllocation(c);
      const sum = AXIS_KEYS.reduce((s, k) => s + a[k], 0);
      assert.equal(sum, TALENT_POINT_BUDGET, `合計が100にならない: ${JSON.stringify(c)}`);
      AXIS_KEYS.forEach((k) => assert.ok(Number.isInteger(a[k]) && a[k] >= 0));
    }
  });

  test("べき等: 正規化済みのスコアをもう一度通しても変わらない(旧データの移行が不要)", () => {
    const legacy = { product: 8, sales: 10, marketing: 7, hr: 29, finance_raise: 6, finance_mgmt: 12, cs: 14, ops: 19, tech: 5, leadership: 22 };
    const once = normalizeAllocation(legacy);
    assert.deepEqual(normalizeAllocation(once), once);
  });

  test("正規化しても強みの順位(どこに経験が寄っているか)は変わらない", () => {
    const legacy = { product: 8, sales: 10, marketing: 7, hr: 29, finance_raise: 6, finance_mgmt: 12, cs: 14, ops: 19, tech: 5, leadership: 22 };
    const a = normalizeAllocation(legacy);
    const order = (o) => [...AXIS_KEYS].sort((x, y) => o[y] - o[x] || AXIS_KEYS.indexOf(x) - AXIS_KEYS.indexOf(y));
    assert.deepEqual(order(a).slice(0, 3), order(legacy).slice(0, 3));
  });

  test("情報がない(全軸0・空・不正値)場合は全軸0のまま返す", () => {
    for (const c of [{}, null, Object.fromEntries(AXIS_KEYS.map((k) => [k, 0])), { ops: "x", hr: -5 }]) {
      const a = normalizeAllocation(c);
      assert.equal(AXIS_KEYS.reduce((s, k) => s + a[k], 0), 0);
    }
  });
});

describe("issueAllocation(企業の課題100点の配分)", () => {
  test("課題の深刻な軸ほど多くの点が割り当てられ、合計は100になる", () => {
    const company = { product: 68, sales: 34, marketing: 48, hr: 29, finance_raise: 58, finance_mgmt: 24, cs: 52, ops: 42, tech: 64, leadership: 55 };
    const a = issueAllocation(company);
    assert.equal(AXIS_KEYS.reduce((s, k) => s + a[k], 0), 100);
    assert.ok(a.finance_mgmt > a.product, "スコアが低い(深刻な)軸のほうが配点が多いはず");
    assert.ok(a.hr > a.tech);
  });

  test("課題がまったくない企業(全軸100)は配点も0になり、誰ともマッチしない", () => {
    const perfect = Object.fromEntries(AXIS_KEYS.map((k) => [k, 100]));
    const a = issueAllocation(perfect);
    assert.equal(AXIS_KEYS.reduce((s, k) => s + a[k], 0), 0);
    assert.equal(scoreMatch(perfect, { ...ZERO_TALENT, sales: 100 }, null, []), 0);
  });
});
