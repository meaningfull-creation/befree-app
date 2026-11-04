import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TALENT_TITLE_GROUPS,
  TALENT_TITLE_OPTIONS,
  normalizeTitle,
  parseTitles,
  formatTitles,
} from "../lib/talentTitles.js";
import { talentProfileFromForm } from "../lib/talentProfile.js";

test("選択肢に「元」で始まるものは無い", () => {
  // 現役で同じ職種に就いている方が選びにくい、というフィードバックへの対応。
  for (const g of TALENT_TITLE_GROUPS) {
    for (const o of g.options) {
      assert.ok(!o.startsWith("元"), `「元」が残っている: ${o}`);
    }
  }
});

test("選択肢はグループ付きで、重複が無い", () => {
  const values = TALENT_TITLE_OPTIONS.map((o) => o.value);
  assert.equal(new Set(values).size, values.length, "重複した選択肢がある");
  for (const o of TALENT_TITLE_OPTIONS) assert.ok(o.group, `${o.value} にグループが無い`);
  // 区切り文字と衝突する選択肢があってはいけない
  for (const v of values) assert.ok(!v.includes("、"), `区切り文字を含む選択肢: ${v}`);
});

test("「元」付きの旧データは、現在の選択肢に読み替える", () => {
  assert.equal(normalizeTitle("元プロダクト責任者 / VPoP"), "プロダクト責任者 / VPoP");
  assert.equal(normalizeTitle("元CTO / VPoE"), "CTO / VPoE");
  // 選択肢に無い自由入力は、そのまま残す(「元」で始まっていても勝手に削らない)
  assert.equal(normalizeTitle("元気印の営業マン"), "元気印の営業マン");
  assert.equal(normalizeTitle("店長"), "店長");
  assert.equal(normalizeTitle(""), "");
  assert.equal(normalizeTitle(null), "");
});

test("兼任している役職をまとめて保存できる", () => {
  const r = formatTitles(["事業責任者 / PL管掌", "マーケティング責任者 / CMO"], "");
  assert.deepEqual(r.titles, ["事業責任者 / PL管掌", "マーケティング責任者 / CMO"]);
  // 表示・AIプロンプト・管理画面・CSVはこの1文字列だけ見ればよい
  assert.equal(r.title, "事業責任者 / PL管掌、マーケティング責任者 / CMO");
});

test("自由記述の役職も一緒に保存できる", () => {
  const r = formatTitles(["店長"], "  店舗開発責任者  ");
  assert.deepEqual(r.titles, ["店長", "店舗開発責任者"]);
  assert.equal(r.title, "店長、店舗開発責任者");
});

test("未選択なら空になる", () => {
  assert.deepEqual(formatTitles([], ""), { titles: [], title: "" });
  assert.deepEqual(formatTitles(null, null), { titles: [], title: "" });
});

test("2回通しても結果が変わらない(自由記述が消えない)", () => {
  // 画面で組み立てた結果を、保存時にもう一度この関数に通す経路がある。
  // 選択肢に無い自由記述を捨てる実装にしていたため、2回目で消えていた。
  const once = formatTitles(["店長"], "店舗開発責任者");
  const twice = formatTitles(once.titles, undefined);
  assert.deepEqual(twice, once);
  assert.deepEqual(twice.titles, ["店長", "店舗開発責任者"]);
});

test("同じ役職を重ねて渡しても1つにまとめる", () => {
  assert.deepEqual(formatTitles(["店長", "元店長"], "店長").titles, ["店長"]);
});

test("保存した値をフォームに戻せる(選択肢と自由記述に振り分ける)", () => {
  const saved = formatTitles(["店長", "プロダクトマネージャー"], "店舗開発責任者");
  const restored = parseTitles(saved.titles, saved.title);
  assert.deepEqual(restored.titles, ["店長", "プロダクトマネージャー"]);
  assert.equal(restored.titleOther, "店舗開発責任者");
});

test("titles が無い旧データは、title文字列から復元する", () => {
  // v6.16より前は単一選択で、「元」付きの文字列が1つだけ入っていた
  assert.deepEqual(parseTitles(null, "元セールス責任者 / VPoS"), {
    titles: ["セールス責任者 / VPoS"],
    titleOther: "",
  });
  // 「その他(自由入力)」で打ち込んだ文言は自由記述側に戻す
  assert.deepEqual(parseTitles(undefined, "現場叩き上げマネージャー"), {
    titles: [],
    titleOther: "現場叩き上げマネージャー",
  });
  assert.deepEqual(parseTitles(null, ""), { titles: [], titleOther: "" });
});

test("同じ役職が重複して入っていても1つにまとめる", () => {
  const r = parseTitles(["店長", "店長", "元店長"], "");
  assert.deepEqual(r.titles, ["店長"]);
});

test("保存形式では、配列と1文字列の両方が入る", () => {
  const d = talentProfileFromForm({
    name: "山田太郎",
    titles: ["店長", "副店長"],
    titleOther: "",
  });
  assert.deepEqual(d.titles, ["店長", "副店長"]);
  assert.equal(d.title, "店長、副店長");
});

test("旧形式(title単体)で渡されても保存できる", () => {
  // 画面以外から talentProfileFromForm を呼ぶ経路のための後方互換
  const d = talentProfileFromForm({ name: "山田太郎", title: "店長" });
  assert.deepEqual(d.titles, ["店長"]);
  assert.equal(d.title, "店長");
});

test("役職が未入力ならnullで保存する", () => {
  const d = talentProfileFromForm({ name: "山田太郎" });
  assert.equal(d.title, null);
  assert.deepEqual(d.titles, []);
});
