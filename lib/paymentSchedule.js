// 支払い・入金のスケジュール計算。DB接続なしの純粋ロジック(テスト可能)。
//
// お金の流れは 企業 → BATTER BOX → 人材 の2段階(README「支払いフローと契約構造」参照)。
// 日付の既定ルールは以下。運営が管理画面(/admin/settings)から変更できる。
//
//   締め日        … 対象月の末日
//   企業の支払期日 … 締め日の翌月末日           (COMPANY_DUE_MONTH_OFFSET = 1)
//   人材の入金日   … 締め日の翌々月15日          (TALENT_PAYOUT_MONTH_OFFSET = 2, TALENT_PAYOUT_DAY = 15)
//
// 企業からの入金を確認してから人材へ支払う建て付けのため、人材への入金は企業の支払期日より後に置いている。
// 土日に当たる場合は前営業日に繰り上げる(日本の商習慣に合わせる)。祝日カレンダーは未対応。

export const DEFAULT_SCHEDULE = {
  companyDueMonthOffset: 1, // 締め月から何ヶ月後の末日を企業の支払期日とするか
  talentPayoutMonthOffset: 2, // 締め月から何ヶ月後を人材の入金月とするか
  talentPayoutDay: 15, // 人材への入金日(その月の何日か)
};

// 指定日が属する月の末日を返す(時刻は00:00:00に正規化)。
export function monthEnd(date, monthOffset = 0) {
  const d = new Date(date);
  // 翌月の0日目 = 当月の末日。monthOffsetヶ月ずらしてから末日を取る。
  return new Date(d.getFullYear(), d.getMonth() + monthOffset + 1, 0);
}

// 指定日が属する月からmonthOffsetヶ月後の、day日を返す。
// その月に存在しない日(2月31日など)は末日に丸める。
export function monthDay(date, monthOffset, day) {
  const d = new Date(date);
  const target = new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(day, lastDay));
}

// 土日なら前営業日(金曜)に繰り上げる。祝日は未対応。
export function adjustToBusinessDay(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=日 6=土
  if (day === 0) d.setDate(d.getDate() - 2);
  else if (day === 6) d.setDate(d.getDate() - 1);
  return d;
}

// 対象月(基準日の属する月)の締め日・企業支払期日・人材入金日をまとめて返す。
export function scheduleFor(baseDate, schedule = DEFAULT_SCHEDULE) {
  const s = { ...DEFAULT_SCHEDULE, ...(schedule || {}) };
  const closingDate = monthEnd(baseDate, 0);
  return {
    closingDate,
    companyDueDate: adjustToBusinessDay(monthEnd(closingDate, s.companyDueMonthOffset)),
    talentPayoutDate: adjustToBusinessDay(monthDay(closingDate, s.talentPayoutMonthOffset, s.talentPayoutDay)),
  };
}

// 年月のラベル("2026年8月分")。請求書・支払いの periodLabel と揃える。
export function periodLabel(date) {
  const d = new Date(date);
  return `${d.getFullYear()}年${d.getMonth() + 1}月分`;
}

// 同じ年月かどうか。
function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

// 契約(Engagement)から、月次の請求・支払い予定を組み立てる。
//
// engagement: { startDate, monthlyHours, companyAmount, talentAmount, status }
// options.until … どの月まで出すか(既定は今月)。完了済み契約は完了月まで。
// options.completedAt … 完了承認日(あれば、その月で打ち切る)
// options.schedule … 日付ルールの上書き
// options.invoices / options.payouts … 実際に発行済みの Invoice / Payout(periodLabelで突き合わせる)
//
// 返り値は新しい月が先頭。各要素:
//   { periodLabel, closingDate, companyDueDate, talentPayoutDate,
//     companyAmount, talentAmount, invoiceStatus, payoutStatus, isForecast }
export function buildPaymentSchedule(engagement, options = {}) {
  const e = engagement || {};
  if (!e.startDate) return [];

  const schedule = options.schedule || DEFAULT_SCHEDULE;
  const invoiceByPeriod = new Map((options.invoices || []).map((i) => [i.periodLabel, i]));
  const payoutByPeriod = new Map((options.payouts || []).map((p) => [p.periodLabel, p]));

  const start = new Date(e.startDate);
  const now = options.until ? new Date(options.until) : new Date();
  // 完了した契約は、完了を承認した月を最終月として打ち切る。
  const endAnchor = options.completedAt ? new Date(options.completedAt) : now;
  const end = endAnchor < start ? start : endAnchor;

  const rows = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const guard = new Date(end.getFullYear(), end.getMonth(), 1);
  // 契約期間が異常に長い場合の暴走防止(10年分)
  for (let i = 0; i < 120 && cursor <= guard; i += 1) {
    const s = scheduleFor(cursor, schedule);
    const label = periodLabel(cursor);
    const invoice = invoiceByPeriod.get(label) || null;
    const payout = payoutByPeriod.get(label) || null;
    rows.push({
      periodLabel: label,
      closingDate: s.closingDate,
      companyDueDate: s.companyDueDate,
      talentPayoutDate: s.talentPayoutDate,
      companyAmount: invoice ? invoice.amount : e.companyAmount ?? null,
      talentAmount: payout ? payout.amount : e.talentAmount ?? null,
      invoiceStatus: invoice ? invoice.status : null,
      payoutStatus: payout ? payout.status : null,
      // 請求書/支払いがまだ発行されていない月は「予定」扱い(確定値ではない)
      isForecast: !invoice && !payout,
      isCurrentMonth: sameMonth(cursor, now),
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return rows.reverse();
}

// 完了承認日から、人材への入金予定日を求める(プロジェクト画面の「入金予定日」表示用)。
export function payoutDateForCompletion(completedAt, schedule = DEFAULT_SCHEDULE) {
  if (!completedAt) return null;
  return scheduleFor(completedAt, schedule).talentPayoutDate;
}
