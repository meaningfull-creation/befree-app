import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeRestoredForm, pickOption, splitOtherValue, OTHER_OPTION } from "../lib/formRestore.js";

const defaults = { name: "", industry: "IT", headcount: "11〜30名", phase: "成長期" };

test("保存済みの内容が無ければ既定値のまま", () => {
  assert.deepEqual(mergeRestoredForm(defaults, null), defaults);
  assert.deepEqual(mergeRestoredForm(defaults, {}), defaults);
  // 名前が空 = アカウント作成だけで離脱した方。復元しても意味がないので既定値を出す
  assert.deepEqual(mergeRestoredForm(defaults, { name: "" }), defaults);
});

test("入っている項目だけ上書きし、nullは既定値を残す", () => {
  const merged = mergeRestoredForm(defaults, { name: "テスト商事", industry: null, phase: undefined, headcount: "1〜5名" });
  assert.equal(merged.name, "テスト商事");
  assert.equal(merged.headcount, "1〜5名");
  // null/undefined でプルダウンが空欄になるのを防ぐ
  assert.equal(merged.industry, "IT");
  assert.equal(merged.phase, "成長期");
});

test("選択肢に無い値は既定値に寄せる", () => {
  const options = ["A", "B", "C"];
  assert.equal(pickOption("B", options, "A"), "B");
  assert.equal(pickOption("削除された選択肢", options, "A"), "A");
  assert.equal(pickOption(null, options, "A"), "A");
});

test("選択肢に無い値は「その他」+自由入力に振り分ける", () => {
  const options = ["店長", "副店長", OTHER_OPTION];
  assert.deepEqual(splitOtherValue("店長", options), { value: "店長", other: "" });
  // 「その他(自由入力)」で打ち込んだ文言はそのまま保存されている
  assert.deepEqual(splitOtherValue("現場叩き上げマネージャー", options), { value: OTHER_OPTION, other: "現場叩き上げマネージャー" });
  // 未入力なら先頭の選択肢に落とす(空のプルダウンにしない)
  assert.deepEqual(splitOtherValue(null, options), { value: "店長", other: "" });
  assert.deepEqual(splitOtherValue("", options), { value: "店長", other: "" });
});
