import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMatchIfAuthorized } from "@/lib/matchAccess";
import { standardTalentAmount } from "@/lib/pricing";
import { logAudit } from "@/lib/auditLog";

// POST /api/matches/[matchId]/propose-contract
// 認証必須(role=company、そのマッチングの企業側当事者のみ)。
// 「契約は人材側ではなく企業側から送れるようにしたい」との要望に対応し、契約条件の提案を
// 企業側から人材側へ送るための機能。既に成立済み(active)の契約がある場合は上書きできない。
// body: { monthlyHours, companyAmount, talentAmount? }
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getMatchIfAuthorized(params.matchId, user);
  if (!authorized) return NextResponse.json({ error: "アクセス権がありません" }, { status: 403 });
  if (authorized.myRole !== "company") {
    return NextResponse.json({ error: "契約条件の提案は企業アカウントのみ行えます" }, { status: 403 });
  }

  const { monthlyHours, companyAmount, talentAmount } = await req.json();
  const hours = Number(monthlyHours);
  const cAmount = Number(companyAmount);
  if (!Number.isFinite(hours) || hours <= 0 || !Number.isFinite(cAmount) || cAmount <= 0) {
    return NextResponse.json({ error: "月間稼働時間・企業支払額は正しい数値で入力してください" }, { status: 400 });
  }
  const tAmount = Number.isFinite(Number(talentAmount)) && Number(talentAmount) > 0 ? Number(talentAmount) : standardTalentAmount(cAmount);

  const existing = await prisma.engagement.findUnique({ where: { matchId: params.matchId } });
  if (existing && (existing.status === "active" || existing.status === "completed")) {
    return NextResponse.json({ error: "この案件は既に契約が成立しています" }, { status: 409 });
  }

  const engagement = existing
    ? await prisma.engagement.update({
        where: { matchId: params.matchId },
        data: { monthlyHours: hours, companyAmount: cAmount, talentAmount: tAmount, status: "proposed" },
      })
    : await prisma.engagement.create({
        data: { matchId: params.matchId, monthlyHours: hours, companyAmount: cAmount, talentAmount: tAmount, status: "proposed" },
      });

  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "engagement.propose",
    targetType: "Engagement",
    targetId: engagement.id,
    metadata: { matchId: params.matchId, monthlyHours: hours, companyAmount: cAmount, talentAmount: tAmount },
  });

  return NextResponse.json({ ok: true, engagement: { status: engagement.status, monthlyHours: engagement.monthlyHours, companyAmount: engagement.companyAmount, talentAmount: engagement.talentAmount } });
}
