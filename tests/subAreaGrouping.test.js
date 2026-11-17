import { test } from "node:test";
import assert from "node:assert/strict";
import { groupSubAreasByAxis, FUNCTION_SUBAREA_OPTIONS, AXES } from "../lib/axes.js";

// 企業側の候補詳細で「どの領域で、具体的に何をやってきたか」を読ませるためのまとめ直し。

test("軸ごとにまとめ、AXESの定義順に並べる", () => {
  const g = groupSubAreasByAxis(["KPI設計・経営数値の管理", "プロダクト企画・要件定義", "事業承継"]);
  // プロダクト戦略はAXESの先頭、経営体制は末尾
  assert.deepEqual(g.map((x) => x.key), ["product", "leadership"]);
  assert.deepEqual(g[0].tags, ["プロダクト企画・要件定義"]);
  assert.deepEqual(g[1].tags, ["KPI設計・経営数値の管理", "事業承継"]);
  assert.equal(g[0].label, AXES.find((a) => a.key === "product").label);
});

test("選択肢に無いタグは落とし、重複はまとめる", () => {
  const g = groupSubAreasByAxis(["事業承継", "存在しないタグ", "事業承継"]);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].tags, ["事業承継"]);
});

test("空・不正な入力でも落ちない", () => {
  assert.deepEqual(groupSubAreasByAxis([]), []);
  assert.deepEqual(groupSubAreasByAxis(null), []);
  assert.deepEqual(groupSubAreasByAxis(undefined), []);
  assert.deepEqual(groupSubAreasByAxis("事業承継"), []);
  assert.deepEqual(groupSubAreasByAxis([null, 1, {}]), []);
});

test("87項目すべてが、いずれかの軸に割り当てられる", () => {
  // どれか1つでも軸に紐づかないと、選んだのに表示されない業務が出てしまう
  const all = FUNCTION_SUBAREA_OPTIONS.map((o) => o.value);
  const grouped = groupSubAreasByAxis(all);
  const count = grouped.reduce((n, g) => n + g.tags.length, 0);
  assert.equal(count, all.length, "どの軸にも入らなかった業務がある");
  assert.equal(grouped.length, AXES.length, "業務が1つも無い軸がある");
});
