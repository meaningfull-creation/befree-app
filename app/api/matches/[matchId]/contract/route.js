import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMatchIfAuthorized } from "@/lib/matchAccess";

// GET /api/matches/[matchId]/contract
// 認証必須。契約は企業側から提案する設計になっている(/propose-contract, /respond-contract参照)。
// このエンドポイントは、メッセージ画面が現在の契約状態(未提案/提案中/成立済み)を
// 表示するための状態取得専用(以前の「双方が意向を示す」方式を置き換えた)。
export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getMatchIfAuthorized(params.matchId, user);
  if (!authorized) return NextResponse.json({ error: "アクセス権がありません" }, { status: 403 });

  const engagement = await prisma.engagement.findUnique({
    where: { matchId: params.matchId },
    include: { project: true },
  });

  return NextResponse.json({
    myRole: authorized.myRole,
    matchStatus: authorized.match.status,
    engagement: engagement
      ? {
          id: engagement.id,
          status: engagement.status,
          monthlyHours: engagement.monthlyHours,
          companyAmount: engagement.companyAmount,
          talentAmount: engagement.talentAmount,
          startDate: engagement.startDate,
        }
      : null,
    projectId: engagement?.project?.id || null,
  });
}
