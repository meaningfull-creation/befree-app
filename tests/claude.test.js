import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { extractJson } from "../lib/claude.js";

describe("extractJson", () => {
  test("純粋なJSON文字列はそのままパースできる", () => {
    const result = JSON.parse(extractJson('{"a": 1, "b": "テスト"}'));
    assert.deepEqual(result, { a: 1, b: "テスト" });
  });

  test("```json フェンスに包まれていても抽出できる", () => {
    const text = '```json\n{"a": 1}\n```';
    assert.deepEqual(JSON.parse(extractJson(text)), { a: 1 });
  });

  test("前置きの文章が混ざっていても抽出できる", () => {
    const text = 'こちらが結果です:\n{"a": 1}';
    assert.deepEqual(JSON.parse(extractJson(text)), { a: 1 });
  });

  test("後置きの文章が混ざっていても抽出できる", () => {
    const text = '{"a": 1}\n以上です。';
    assert.deepEqual(JSON.parse(extractJson(text)), { a: 1 });
  });

  test("前後両方に文章が混ざっていても抽出できる", () => {
    const text = '回答: {"a": 1, "b": [1,2,3]} これで完了です。';
    assert.deepEqual(JSON.parse(extractJson(text)), { a: 1, b: [1, 2, 3] });
  });

  test("中括弧が全く無い場合は元の文字列をそのまま返す(呼び出し側でエラーになる想定)", () => {
    const text = "JSONではない文章";
    assert.equal(extractJson(text), text);
  });
});
