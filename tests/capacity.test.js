import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isTalentAvailable } from "../lib/capacityPure.js";

describe("isTalentAvailable", () => {
  test("進行中の契約数が上限未満なら利用可能", () => {
    const talent = { id: "t1", capacity: { maxConcurrentEngagements: 3 } };
    assert.equal(isTalentAvailable(talent, { t1: 2 }), true);
  });

  test("進行中の契約数が上限に達したら利用不可", () => {
    const talent = { id: "t1", capacity: { maxConcurrentEngagements: 3 } };
    assert.equal(isTalentAvailable(talent, { t1: 3 }), false);
  });

  test("進行中の契約数が上限を超えていても利用不可(超過時も弾く)", () => {
    const talent = { id: "t1", capacity: { maxConcurrentEngagements: 3 } };
    assert.equal(isTalentAvailable(talent, { t1: 5 }), false);
  });

  test("該当人材の進行中契約が0件なら常に利用可能", () => {
    const talent = { id: "t1", capacity: { maxConcurrentEngagements: 1 } };
    assert.equal(isTalentAvailable(talent, {}), true);
  });

  test("capacityレコードが無い場合はデフォルト上限3として扱う", () => {
    const talent = { id: "t1" };
    assert.equal(isTalentAvailable(talent, { t1: 2 }), true);
    assert.equal(isTalentAvailable(talent, { t1: 3 }), false);
  });
});
