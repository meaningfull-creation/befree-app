import { test } from "node:test";
import assert from "node:assert/strict";
import {
  companyProfileFromForm,
  emptyCompanyProfile,
  companyDisplayName,
  saveCompanyProfile,
  NO_COMPANY_NAME_PLACEHOLDER,
} from "../lib/companyProfile.js";

const fullForm = {
  name: "テスト商事",
  industry: "小売・店舗運営",
  headcount: "11〜30名",
  fundingType: "independent",
  phase: "成長期",
  revenue: "1〜3億円",
};

test("入力をそのままCompanyの形に移す", () => {
  const d = companyProfileFromForm(fullForm);
  assert.equal(d.name, "テスト商事");
  assert.equal(d.fundingType, "independent");
  assert.equal(d.revenue, "1〜3億円");
});

test("会社名だけでも保存できる形になる", () => {
  const d = companyProfileFromForm({ name: "テスト商事" });
  // undefined を渡すとPrismaが「変更なし」と解釈して古い値が残るため、必ず値を持たせる
  for (const k of ["industry", "headcount", "fundingType", "phase", "revenue"]) {
    assert.equal(d[k], null, `${k} が null ではない`);
  }
  assert.ok(!Object.values(d).includes(undefined), "undefined が混ざっている");
});

test("アカウント作成直後は、会社名が空のまま保存できる形になる", () => {
  assert.equal(emptyCompanyProfile().name, "");
});

test("会社名が空なら、管理画面では「(会社名未入力)」として扱う", () => {
  // 空のまま画面に出すと行が読めず、削除の確認文字列も空になって削除できなくなる
  assert.equal(companyDisplayName(""), NO_COMPANY_NAME_PLACEHOLDER);
  assert.equal(companyDisplayName("   "), NO_COMPANY_NAME_PLACEHOLDER);
  assert.equal(companyDisplayName(null), NO_COMPANY_NAME_PLACEHOLDER);
  assert.equal(companyDisplayName("テスト商事"), "テスト商事");
});

function fakePrisma(calls) {
  return {
    company: {
      create: async ({ data }) => { calls.push(["company.create", data]); return { id: "new-company" }; },
      update: async (args) => { calls.push(["company.update", args]); return { id: args.where.id }; },
    },
    user: { update: async (args) => { calls.push(["user.update", args]); return {}; } },
  };
}

test("既にCompanyが紐づいていれば、新しく作らず更新する(再診断で重複させない)", async () => {
  const calls = [];
  const id = await saveCompanyProfile(fakePrisma(calls), { id: "u1", companyId: "c1" }, fullForm);
  assert.equal(id, "c1");
  assert.deepEqual(calls.map((c) => c[0]), ["company.update"]);
});

test("アカウント作成時に作ったレコードは、会社情報の入力で同じものが更新される", async () => {
  const calls = [];
  const prisma = fakePrisma(calls);
  const created = await saveCompanyProfile(prisma, { id: "u1", companyId: null }, emptyCompanyProfile());
  assert.equal(created, "new-company");
  assert.equal(calls[0][1].name, "");
  assert.deepEqual(calls.map((c) => c[0]), ["company.create", "user.update"]);
  calls.length = 0;
  const updated = await saveCompanyProfile(prisma, { id: "u1", companyId: created }, fullForm);
  assert.equal(updated, created);
  assert.deepEqual(calls.map((c) => c[0]), ["company.update"]);
  assert.equal(calls[0][1].data.name, "テスト商事");
});
