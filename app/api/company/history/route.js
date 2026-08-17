import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

// GET /api/company/history
// 認証必須(role=company)。診断履歴を新しい順に返す(Before/After比較用)。
// returns: { history: [{ id, axisScores, summary, createdAt }] }
export async function GET() {
  const user = await requireRole("company");
  if (!user) return NextResponse.json({ error: "企業アカウントでのログインが必要です" }, { status: 401 });
  if (!user.companyId) return NextResponse.json({ history: [] });

  const history = await prisma.companySkillMap.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "desc" },
    select: { id: true, axisScores: true, summary: true, createdAt: true },
    take: 10,
  });

  return NextResponse.json({ history });
}
