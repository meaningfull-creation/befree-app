import { test } from "node:test";
import assert from "node:assert/strict";
import { talentProfileFromForm, saveTalentProfile } from "../lib/talentProfile.js";

const fullForm = {
  name: "山田太郎",
  title: "店長",
  industry: "小売・店舗運営",
  years: "3年未満",
  summary: "店舗の売上管理を担当",
  experiencedFunctions: ["sales", "ops"],
  experiencedSubAreas: ["売上管理・予実管理"],
  workStyleTags: ["現場に入る"],
  valueTags: ["現場の声を大事にする"],
  values: "まず現場を見る",
};

test("入力をそのままTalentの形に移す", () => {
  const d = talentProfileFromForm(fullForm);
  assert.equal(d.name, "山田太郎");
  assert.equal(d.title, "店長");
  assert.equal(d.years, "3年未満");
  // 自由記述は bio と careerHistory の両方に入れる(v5.4の一本化に合わせている)
  assert.equal(d.bio, "店舗の売上管理を担当");
  assert.equal(d.careerHistory, "店舗の売上管理を担当");
  assert.deepEqual(d.experiencedFunctions, ["sales", "ops"]);
});

test("お名前だけでも保存できる形になる(入力途中の人材を一覧に出すため)", () => {
  const d = talentProfileFromForm({ name: "山田太郎" });
  assert.equal(d.name, "山田太郎");
  // 未入力は null / 空配列。undefined を渡すとPrismaが「変更なし」と解釈して
  // 古い値が残ってしまうため、必ず値を持たせる。
  for (const k of ["title", "industry", "years", "bio", "careerHistory", "values"]) {
    assert.equal(d[k], null, `${k} が null ではない`);
  }
  for (const k of ["experiencedFunctions", "experiencedSubAreas", "workStyleTags", "valueTags"]) {
    assert.deepEqual(d[k], [], `${k} が空配列ではない`);
  }
  assert.ok(!Object.values(d).includes(undefined), "undefined が混ざっている");
});

test("配列でない値が来ても落とさず空配列にする", () => {
  const d = talentProfileFromForm({ name: "山田", experiencedFunctions: "sales", workStyleTags: null, valueTags: 3 });
  assert.deepEqual(d.experiencedFunctions, []);
  assert.deepEqual(d.workStyleTags, []);
  assert.deepEqual(d.valueTags, []);
});

// --- saveTalentProfile: 作成/更新の出し分け ---------------------------------

function fakePrisma(calls) {
  return {
    talent: {
      create: async ({ data }) => { calls.push(["talent.create", data]); return { id: "new-talent" }; },
      update: async (args) => { calls.push(["talent.update", args]); return { id: args.where.id }; },
    },
    user: {
      update: async (args) => { calls.push(["user.update", args]); return {}; },
    },
  };
}

test("既にTalentが紐づいていれば、新しく作らず更新する(再診断で重複させない)", async () => {
  const calls = [];
  const id = await saveTalentProfile(fakePrisma(calls), { id: "u1", talentId: "t1" }, fullForm);
  assert.equal(id, "t1");
  assert.deepEqual(calls.map((c) => c[0]), ["talent.update"]);
  assert.equal(calls[0][1].where.id, "t1");
});

test("初回は作成し、稼働枠も同時に作ってUserに紐づける", async () => {
  const calls = [];
  const id = await saveTalentProfile(fakePrisma(calls), { id: "u1", talentId: null }, fullForm);
  assert.equal(id, "new-talent");
  assert.deepEqual(calls.map((c) => c[0]), ["talent.create", "user.update"]);
  // 稼働枠(Capacity)は人材ごとに必ず1つ必要なので、作成と同時に作る
  assert.ok(calls[0][1].capacity?.create, "Capacityが同時に作られていない");
  assert.equal(calls[1][1].data.talentId, "new-talent");
});
