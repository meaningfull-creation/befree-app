import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buildPaymentSchedule, DEFAULT_SCHEDULE } from "@/lib/paymentSchedule";

// GET /api/payments
// 認証必須。ログイン中のアカウントの立場に応じて、月次の支払い/入金の予定を返す。
//   企業 … 自社がBATTER BOXに支払う金額と支払期日
//   人材 … 自分がBATTER BOXから受け取る金額と入金予定日
//
// 人材側には企業の支払額(手数料込み)を一切返さない(v4.9の是正と同じ方針)。
export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "company" && user.role !== "talent")) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const isCompany = user.role === "company";

  const where = isCompany
    ? { match: { companySkillMap: { companyId: user.companyId || "" } } }
    : { match: { talentSkillMap: { talentId: user.talentId || "" } } };

  const engagements = await prisma.engagement.findMany({
    where: { ...where, status: { in: ["active", "paused", "completed"] } },
    include: {
      match: {
        include: {
          companySkillMap: { include: { company: { select: { name: true } } } },
          talentSkillMap: { include: { talent: { select: { name: true } } } },
        },
      },
      project: { select: { id: true, name: true, completedAt: true, status: true } },
      invoices: true,
      payouts: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const contracts = engagements.map((e) => {
    const rows = buildPaymentSchedule(
      {
        startDate: e.startDate,
        monthlyHours: e.monthlyHours,
        companyAmount: e.companyAmount,
        talentAmount: e.talentAmount,
        status: e.status,
      },
      {
        completedAt: e.project?.completedAt || null,
        invoices: e.invoices,
        payouts: e.payouts,
      }
    );

    return {
      engagementId: e.id,
      projectId: e.project?.id || null,
      projectName: e.project?.name || null,
      counterpartName: isCompany ? e.match.talentSkillMap.talent.name : e.match.companySkillMap.company.name,
      status: e.status,
      monthlyHours: e.monthlyHours,
      startDate: e.startDate,
      completedAt: e.project?.completedAt || null,
      // 人材には企業の支払額(手数料込み)を見せない
      monthlyAmount: isCompany ? e.companyAmount : e.talentAmount,
      rows: rows.map((r) => ({
        periodLabel: r.periodLabel,
        closingDate: r.closingDate,
        dueDate: isCompany ? r.companyDueDate : r.talentPayoutDate,
        amount: isCompany ? r.companyAmount : r.talentAmount,
        status: isCompany ? r.invoiceStatus : r.payoutStatus,
        isForecast: r.isForecast,
        isCurrentMonth: r.isCurrentMonth,
      })),
    };
  });

  return NextResponse.json({
    role: user.role,
    schedule: DEFAULT_SCHEDULE,
    contracts,
  });
}
