import { test } from "node:test";
import assert from "node:assert/strict";
import { csvEscape, buildCsv, CSV_BOM } from "../lib/csv.js";
import {
  buildTalentsCsv,
  buildCompaniesCsv,
  TALENT_CSV_HEADERS,
  COMPANY_CSV_HEADERS,
  nameOrEmailWhere,
  registrationStageLabel,
} from "../lib/adminExport.js";
import { AXES } from "../lib/axes.js";

// --- CSVの組み立て -----------------------------------------------------------

test("カンマ・改行・引用符を含む値は引用符で囲む", () => {
  assert.equal(csvEscape("ふつう"), "ふつう");
  assert.equal(csvEscape("a,b"), '"a,b"');
  assert.equal(csvEscape("改\n行"), '"改\n行"');
  // 引用符は2つ重ねてエスケープする
  assert.equal(csvEscape('彼は"そう"言った'), '"彼は""そう""言った"');
  assert.equal(csvEscape(null), "");
  assert.equal(csvEscape(undefined), "");
  assert.equal(csvEscape(0), "0");
});

test("Excelで文字化けしないようBOMを付け、改行はCRLFにする", () => {
  const csv = buildCsv(["a", "b"], [["1", "2"]]);
  assert.ok(csv.startsWith(CSV_BOM), "BOMが無い");
  assert.equal(csv, `${CSV_BOM}a,b\r\n1,2\r\n`);
});

// --- 検索条件(一覧とCSVで同じものを使う) -----------------------------------

test("検索語が無ければ全件、あれば氏名とメールアドレスの両方を見る", () => {
  assert.deepEqual(nameOrEmailWhere(""), {});
  assert.deepEqual(nameOrEmailWhere("  "), {});
  assert.deepEqual(nameOrEmailWhere(null), {});
  const where = nameOrEmailWhere(" 山田 ");
  assert.equal(where.OR.length, 2);
  assert.equal(where.OR[0].name.contains, "山田");
  assert.equal(where.OR[1].user.email.contains, "山田");
});

test("登録状況は、スキルマップの有無と名前の有無で3段階に分かれる", () => {
  assert.equal(registrationStageLabel("山田太郎", true), "完了");
  assert.equal(registrationStageLabel("山田太郎", false), "入力途中");
  assert.equal(registrationStageLabel("", false), "アカウントのみ");
});

// --- 人材CSV -----------------------------------------------------------------

const alloc = { product: 5, sales: 30, marketing: 5, hr: 20, finance_raise: 0, finance_mgmt: 5, cs: 10, ops: 15, tech: 5, leadership: 5 };

function parseRow(csv, index) {
  // テスト用の簡易パーサ(引用符で囲まれた値に対応)
  const line = csv.replace(CSV_BOM, "").split("\r\n")[index];
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

test("人材CSVは、10軸の配点を1軸1列で出す", () => {
  const csv = buildTalentsCsv([
    {
      name: "山田太郎", status: "approved", title: "店長", industry: "小売・店舗運営", years: "3年未満",
      experiencedFunctions: ["ops", "sales"], experiencedSubAreas: ["売上管理"], workStyleTags: ["現場に入る"],
      valueTags: ["現場の声"], careerHistory: "店舗運営を担当", bio: null,
      capacity: { currentCommittedHours: 10, maxConcurrentEngagements: 3 },
      user: { email: "a@example.com" },
      createdAt: new Date("2026-01-02"),
      skillMaps: [{ axisScores: alloc, createdAt: new Date("2026-01-03") }],
    },
  ]);
  const header = parseRow(csv, 0);
  const row = parseRow(csv, 1);
  assert.equal(header.length, TALENT_CSV_HEADERS.length);
  assert.equal(row.length, TALENT_CSV_HEADERS.length);
  // 10軸は AXES の並び順で、ラベルが列名になる
  for (const axis of AXES) {
    const col = header.indexOf(axis.label);
    assert.ok(col >= 0, `${axis.label} 列が無い`);
    assert.equal(row[col], String(alloc[axis.key]), `${axis.label} の値が違う`);
  }
  assert.equal(row[header.indexOf("氏名")], "山田太郎");
  assert.equal(row[header.indexOf("メールアドレス")], "a@example.com");
  assert.equal(row[header.indexOf("登録状況")], "完了");
  // 機能領域はキーではなくラベルで出す
  assert.equal(row[header.indexOf("経験機能領域")], "オペレーション / セールス基盤");
  assert.equal(row[header.indexOf("強みの上位3軸")], "セールス基盤:30 / 採用・組織:20 / オペレーション:15");
});

test("スキルマップがまだ無い人材も行として出し、配点は空欄にする", () => {
  const csv = buildTalentsCsv([
    { name: "", status: "approved", skillMaps: [], user: { email: "b@example.com" }, createdAt: new Date("2026-01-02") },
  ]);
  const header = parseRow(csv, 0);
  const row = parseRow(csv, 1);
  assert.equal(row.length, TALENT_CSV_HEADERS.length, "列数がヘッダと合っていない");
  assert.equal(row[header.indexOf("氏名")], "(氏名未入力)");
  assert.equal(row[header.indexOf("登録状況")], "アカウントのみ");
  for (const axis of AXES) assert.equal(row[header.indexOf(axis.label)], "");
  assert.equal(row[header.indexOf("最新解析日")], "");
});

// --- 企業CSV -----------------------------------------------------------------

test("企業CSVは、10軸スコアと総合スコア・最優先ボトルネックを出す", () => {
  const csv = buildCompaniesCsv([
    {
      name: "テスト商事", industry: "飲食", headcount: "11〜30名", fundingType: "vc", phase: "シリーズA", revenue: "1〜3億円",
      user: { email: "c@example.com" },
      createdAt: new Date("2026-01-02"),
      skillMaps: [{ axisScores: alloc, createdAt: new Date("2026-01-03") }],
    },
  ]);
  const header = parseRow(csv, 0);
  const row = parseRow(csv, 1);
  assert.equal(row.length, COMPANY_CSV_HEADERS.length);
  assert.equal(row[header.indexOf("外部資本の有無")], "外部資本あり");
  // 平均 = 100 / 10軸
  assert.equal(row[header.indexOf("総合スコア")], "10");
  // 最も低い軸が最優先ボトルネック
  assert.equal(row[header.indexOf("最優先ボトルネック")], "資金調達:0");
  for (const axis of AXES) assert.equal(row[header.indexOf(axis.label)], String(alloc[axis.key]));
});

test("診断前の企業も行として出し、スコアは空欄にする", () => {
  const csv = buildCompaniesCsv([{ name: "", skillMaps: [], user: null, createdAt: new Date("2026-01-02") }]);
  const header = parseRow(csv, 0);
  const row = parseRow(csv, 1);
  assert.equal(row.length, COMPANY_CSV_HEADERS.length);
  assert.equal(row[header.indexOf("会社名")], "(会社名未入力)");
  assert.equal(row[header.indexOf("登録状況")], "アカウントのみ");
  assert.equal(row[header.indexOf("総合スコア")], "");
  assert.equal(row[header.indexOf("メールアドレス")], "");
});

test("氏名にカンマが入っていても列がずれない", () => {
  const csv = buildTalentsCsv([
    { name: "山田, 太郎", status: "approved", skillMaps: [], user: { email: "d@example.com" }, createdAt: new Date("2026-01-02") },
  ]);
  const header = parseRow(csv, 0);
  const row = parseRow(csv, 1);
  assert.equal(row.length, header.length);
  assert.equal(row[0], "山田, 太郎");
});
