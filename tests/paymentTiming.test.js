import { test } from "node:test";
import assert from "node:assert/strict";
import { scheduleLabels, scheduleFor, DEFAULT_SCHEDULE } from "../lib/paymentSchedule.js";

// LPの料金セクションと契約提案画面は、この文言と計算をそのまま表示する。
// 片方だけ直して食い違わないよう、ここで固定しておく。

test("既定のスケジュールを日本語にできる", () => {
  const l = scheduleLabels();
  assert.equal(l.closing, "対象月の末日");
  assert.equal(l.companyDue, "締め日の翌月末日");
  assert.equal(l.talentPayout, "締め日の翌々月15日");
  assert.match(l.note, /前営業日/);
});

test("文言は実際の計算と一致する", () => {
  // 2026年11月稼働 → 締め11/30 → 企業の支払期日12/31 → 人材の入金1/15
  const s = scheduleFor(new Date(2026, 10, 17));
  assert.equal(s.closingDate.getMonth(), 10, "締めは対象月の末日");
  assert.equal(s.closingDate.getDate(), 30);
  // 「翌月末日」
  assert.equal(s.companyDueDate.getMonth(), 11);
  assert.equal(s.companyDueDate.getDate(), 31);
  // 「翌々月15日」
  assert.equal(s.talentPayoutDate.getFullYear(), 2027);
  assert.equal(s.talentPayoutDate.getMonth(), 0);
  assert.equal(s.talentPayoutDate.getDate(), 15);
});

test("人材への入金は、必ず企業の支払期日より後になる", () => {
  // 企業からの入金を確認してから人材へ支払う建て付けなので、逆転してはいけない
  for (let m = 0; m < 12; m += 1) {
    const s = scheduleFor(new Date(2026, m, 10));
    assert.ok(s.talentPayoutDate > s.companyDueDate, `${m + 1}月で逆転している`);
  }
});

test("設定を変えても文言が追従する", () => {
  const l = scheduleLabels({ ...DEFAULT_SCHEDULE, companyDueMonthOffset: 2, talentPayoutMonthOffset: 3, talentPayoutDay: 20 });
  assert.equal(l.companyDue, "締め日の翌々月末日");
  assert.equal(l.talentPayout, "締め日の3ヶ月後20日");
});
