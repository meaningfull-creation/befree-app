import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBankAccount, maskAccountNumber, toHalfWidthKana, ACCOUNT_TYPES } from "../lib/bankAccount.js";

const valid = {
  bankName: "みずほ銀行",
  branchName: "渋谷支店",
  accountType: "普通",
  accountNumber: "1234567",
  accountHolder: "ﾔﾏﾀﾞ ﾀﾛｳ",
};

test("normalizeBankAccount", async (t) => {
  await t.test("正しい入力はそのまま通る", () => {
    const r = normalizeBankAccount(valid);
    assert.equal(r.ok, true);
    assert.deepEqual(r.value, valid);
  });

  await t.test("全角数字の口座番号を半角に正規化する", () => {
    const r = normalizeBankAccount({ ...valid, accountNumber: "１２３４５６７" });
    assert.equal(r.ok, true);
    assert.equal(r.value.accountNumber, "1234567");
  });

  await t.test("ハイフン・空白を除去する", () => {
    const r = normalizeBankAccount({ ...valid, accountNumber: "123-45 67" });
    assert.equal(r.ok, true);
    assert.equal(r.value.accountNumber, "1234567");
  });

  await t.test("全角カナの名義を半角カナに正規化する(濁点も分解)", () => {
    const r = normalizeBankAccount({ ...valid, accountHolder: "ヤマダ　タロウ" });
    assert.equal(r.ok, true);
    assert.equal(r.value.accountHolder, "ﾔﾏﾀﾞ ﾀﾛｳ");
  });

  await t.test("口座番号が7桁でなければ弾く", () => {
    for (const n of ["123456", "12345678", "abcdefg", ""]) {
      const r = normalizeBankAccount({ ...valid, accountNumber: n });
      assert.equal(r.ok, false, `${n} が通ってしまった`);
    }
  });

  await t.test("漢字・ひらがなの名義は弾く", () => {
    assert.equal(normalizeBankAccount({ ...valid, accountHolder: "山田太郎" }).ok, false);
    assert.equal(normalizeBankAccount({ ...valid, accountHolder: "やまだたろう" }).ok, false);
  });

  await t.test("預金種別は普通・当座のみ", () => {
    for (const t2 of ACCOUNT_TYPES) {
      assert.equal(normalizeBankAccount({ ...valid, accountType: t2 }).ok, true);
    }
    assert.equal(normalizeBankAccount({ ...valid, accountType: "貯蓄" }).ok, false);
    assert.equal(normalizeBankAccount({ ...valid, accountType: "" }).ok, false);
  });

  await t.test("金融機関名・支店名は必須", () => {
    assert.equal(normalizeBankAccount({ ...valid, bankName: "  " }).ok, false);
    assert.equal(normalizeBankAccount({ ...valid, branchName: "" }).ok, false);
  });

  await t.test("nullやundefinedでも落ちない", () => {
    assert.equal(normalizeBankAccount(null).ok, false);
    assert.equal(normalizeBankAccount(undefined).ok, false);
    assert.equal(normalizeBankAccount({}).ok, false);
  });

  await t.test("英字の名義は大文字に揃える", () => {
    const r = normalizeBankAccount({ ...valid, accountHolder: "yamada taro" });
    assert.equal(r.ok, true);
    assert.equal(r.value.accountHolder, "YAMADA TARO");
  });
});

test("maskAccountNumber", async (t) => {
  await t.test("末尾3桁だけ残す", () => {
    assert.equal(maskAccountNumber("1234567"), "****567");
  });
  await t.test("短い値・空値でも桁を漏らさない", () => {
    assert.equal(maskAccountNumber("12"), "**");
    assert.equal(maskAccountNumber(""), "");
    assert.equal(maskAccountNumber(null), "");
  });
});

test("toHalfWidthKana", () => {
  assert.equal(toHalfWidthKana("パピプペポ"), "ﾊﾟﾋﾟﾌﾟﾍﾟﾎﾟ");
  assert.equal(toHalfWidthKana("ジュン"), "ｼﾞｭﾝ");
});
