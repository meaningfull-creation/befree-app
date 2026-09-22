import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SCHEDULE,
  monthEnd,
  monthDay,
  adjustToBusinessDay,
  scheduleFor,
  periodLabel,
  buildPaymentSchedule,
  payoutDateForCompletion,
} from "../lib/paymentSchedule.js";

const ymd = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : null);

test("monthEnd", async (t) => {
  await t.test("当月の末日", () => {
    assert.equal(ymd(monthEnd(new Date(2026, 7, 10))), "2026-08-31");
    assert.equal(ymd(monthEnd(new Date(2026, 8, 1))), "2026-09-30");
  });
  await t.test("2月・うるう年", () => {
    assert.equal(ymd(monthEnd(new Date(2026, 1, 3))), "2026-02-28");
    assert.equal(ymd(monthEnd(new Date(2028, 1, 3))), "2028-02-29");
  });
  await t.test("オフセット付き(年またぎ)", () => {
    assert.equal(ymd(monthEnd(new Date(2026, 11, 15), 1)), "2027-01-31");
    assert.equal(ymd(monthEnd(new Date(2026, 11, 15), 2)), "2027-02-28");
  });
});

test("monthDay", async (t) => {
  await t.test("Nヶ月後のD日", () => {
    assert.equal(ymd(monthDay(new Date(2026, 7, 31), 2, 15)), "2026-10-15");
  });
  await t.test("存在しない日は末日に丸める", () => {
    assert.equal(ymd(monthDay(new Date(2026, 0, 31), 1, 31)), "2026-02-28");
  });
  await t.test("年またぎ", () => {
    assert.equal(ymd(monthDay(new Date(2026, 11, 31), 2, 15)), "2027-02-15");
  });
});

test("adjustToBusinessDay", async (t) => {
  await t.test("土曜は金曜へ", () => {
    // 2026-08-01 は土曜
    assert.equal(new Date(2026, 7, 1).getDay(), 6);
    assert.equal(ymd(adjustToBusinessDay(new Date(2026, 7, 1))), "2026-07-31");
  });
  await t.test("日曜は金曜へ", () => {
    // 2026-08-02 は日曜
    assert.equal(new Date(2026, 7, 2).getDay(), 0);
    assert.equal(ymd(adjustToBusinessDay(new Date(2026, 7, 2))), "2026-07-31");
  });
  await t.test("平日はそのまま", () => {
    assert.equal(ymd(adjustToBusinessDay(new Date(2026, 7, 3))), "2026-08-03");
  });
  await t.test("引数を破壊しない", () => {
    const src = new Date(2026, 7, 1);
    adjustToBusinessDay(src);
    assert.equal(ymd(src), "2026-08-01");
  });
});

test("scheduleFor", async (t) => {
  await t.test("既定ルール: 月末締め → 翌月末に企業支払 → 翌々月15日に人材入金", () => {
    const s = scheduleFor(new Date(2026, 7, 20)); // 2026年8月
    assert.equal(ymd(s.closingDate), "2026-08-31");
    assert.equal(ymd(s.companyDueDate), "2026-09-30");
    assert.equal(ymd(s.talentPayoutDate), "2026-10-15");
  });

  await t.test("人材への入金は必ず企業の支払期日より後", () => {
    for (let m = 0; m < 12; m += 1) {
      const s = scheduleFor(new Date(2026, m, 15));
      assert.ok(s.talentPayoutDate > s.companyDueDate, `${m + 1}月: 入金日が企業支払期日より前`);
      assert.ok(s.companyDueDate > s.closingDate, `${m + 1}月: 支払期日が締め日より前`);
    }
  });

  await t.test("支払日が土日に落ちない", () => {
    for (let m = 0; m < 12; m += 1) {
      const s = scheduleFor(new Date(2026, m, 15));
      assert.ok(![0, 6].includes(s.companyDueDate.getDay()), `${m + 1}月: 企業支払期日が土日`);
      assert.ok(![0, 6].includes(s.talentPayoutDate.getDay()), `${m + 1}月: 人材入金日が土日`);
    }
  });

  await t.test("ルールを上書きできる", () => {
    const s = scheduleFor(new Date(2026, 7, 20), { companyDueMonthOffset: 0, talentPayoutMonthOffset: 1, talentPayoutDay: 10 });
    assert.equal(ymd(s.closingDate), "2026-08-31");
    assert.equal(ymd(s.companyDueDate), "2026-08-31");
    assert.equal(ymd(s.talentPayoutDate), "2026-09-10");
  });
});

test("periodLabel", () => {
  assert.equal(periodLabel(new Date(2026, 7, 31)), "2026年8月分");
  assert.equal(periodLabel(new Date(2027, 0, 1)), "2027年1月分");
});

test("buildPaymentSchedule", async (t) => {
  const engagement = { startDate: new Date(2026, 5, 10), monthlyHours: 10, companyAmount: 200000, talentAmount: 120000, status: "active" };

  await t.test("開始月から基準月までを新しい順に並べる", () => {
    const rows = buildPaymentSchedule(engagement, { until: new Date(2026, 7, 20) });
    assert.deepEqual(rows.map((r) => r.periodLabel), ["2026年8月分", "2026年7月分", "2026年6月分"]);
  });

  await t.test("契約条件の金額が各月に入る", () => {
    const rows = buildPaymentSchedule(engagement, { until: new Date(2026, 6, 1) });
    assert.ok(rows.every((r) => r.companyAmount === 200000 && r.talentAmount === 120000));
    assert.ok(rows.every((r) => r.isForecast), "請求書未発行の月は予定扱い");
  });

  await t.test("発行済みの請求書・支払いがあればその金額とステータスを使う", () => {
    const rows = buildPaymentSchedule(engagement, {
      until: new Date(2026, 6, 1),
      invoices: [{ periodLabel: "2026年6月分", amount: 100000, status: "paid" }],
      payouts: [{ periodLabel: "2026年6月分", amount: 60000, status: "scheduled" }],
    });
    const june = rows.find((r) => r.periodLabel === "2026年6月分");
    assert.equal(june.companyAmount, 100000);
    assert.equal(june.talentAmount, 60000);
    assert.equal(june.invoiceStatus, "paid");
    assert.equal(june.payoutStatus, "scheduled");
    assert.equal(june.isForecast, false);
    const july = rows.find((r) => r.periodLabel === "2026年7月分");
    assert.equal(july.isForecast, true);
  });

  await t.test("完了済み契約は完了月で打ち切る", () => {
    const rows = buildPaymentSchedule(engagement, { until: new Date(2026, 11, 1), completedAt: new Date(2026, 6, 20) });
    assert.deepEqual(rows.map((r) => r.periodLabel), ["2026年7月分", "2026年6月分"]);
  });

  await t.test("開始日がない契約は空", () => {
    assert.deepEqual(buildPaymentSchedule({ companyAmount: 1 }), []);
    assert.deepEqual(buildPaymentSchedule(null), []);
  });

  await t.test("開始直後(同月)でも1行は出る", () => {
    const rows = buildPaymentSchedule({ ...engagement, startDate: new Date(2026, 7, 28) }, { until: new Date(2026, 7, 29) });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].periodLabel, "2026年8月分");
  });

  await t.test("年をまたいでも連続する", () => {
    const rows = buildPaymentSchedule({ ...engagement, startDate: new Date(2026, 10, 1) }, { until: new Date(2027, 1, 1) });
    assert.deepEqual(rows.map((r) => r.periodLabel), ["2027年2月分", "2027年1月分", "2026年12月分", "2026年11月分"]);
  });
});

test("payoutDateForCompletion", async (t) => {
  await t.test("完了承認月の翌々月15日", () => {
    assert.equal(ymd(payoutDateForCompletion(new Date(2026, 7, 5))), "2026-10-15");
  });
  await t.test("未完了ならnull", () => {
    assert.equal(payoutDateForCompletion(null), null);
  });
  await t.test("既定値が定義どおり", () => {
    assert.deepEqual(DEFAULT_SCHEDULE, { companyDueMonthOffset: 1, talentPayoutMonthOffset: 2, talentPayoutDay: 15 });
  });
});
