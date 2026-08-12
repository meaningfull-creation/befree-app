import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../lib/passwordHash.js";

describe("hashPassword / verifyPassword", () => {
  test("正しいパスワードは検証を通る", () => {
    const { hash, salt } = hashPassword("correct horse battery staple");
    assert.equal(verifyPassword("correct horse battery staple", hash, salt), true);
  });

  test("間違ったパスワードは検証を通らない", () => {
    const { hash, salt } = hashPassword("correct horse battery staple");
    assert.equal(verifyPassword("wrong password", hash, salt), false);
  });

  test("パスワードは平文のまま保存されない", () => {
    const { hash } = hashPassword("hunter2");
    assert.ok(!hash.includes("hunter2"));
  });

  test("同じパスワードでも毎回異なるソルト・ハッシュが生成される(レインボーテーブル対策)", () => {
    const a = hashPassword("same-password");
    const b = hashPassword("same-password");
    assert.notEqual(a.salt, b.salt);
    assert.notEqual(a.hash, b.hash);
  });

  test("空文字と実際のパスワードを混同しない", () => {
    const { hash, salt } = hashPassword("something");
    assert.equal(verifyPassword("", hash, salt), false);
  });
});
