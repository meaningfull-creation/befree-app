import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMatchIfAuthorized } from "@/lib/matchAccess";

// POST /api/matches/[matchId]/ready
// 認証必須。企業側/人材側どちらの当事者も呼べる。
// 「メッセージのやり取りの後、具体的にどう進めるか分からない」という声を受けて追加した機能。
// 自分の役割の readyAt を記録し、双方が意向を示した状態(bothReady)を運営が見つけやすくする。
// 実際の契約化(Engagement作成)は、これまで通り運営が admin 画面から行う(いきなり自動契約はしない)。
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getMatchIfAuthorized(params.matchId, user);
  if (!authorized) return NextResponse.json({ error: "アクセス権がありません" }, { status: 403 });
  if (authorized.myRole === "admin") {
    return NextResponse.json({ error: "この操作は企業・人材アカウントのみ行えます" }, { status: 403 });
  }

  const field = authorized.myRole === "company" ? "companyReadyAt" : "talentReadyAt";
  const updated = await prisma.match.update({
    where: { id: params.matchId },
    data: { [field]: new Date() },
  });

  return NextResponse.json({
    ok: true,
    companyReady: !!updated.companyReadyAt,
    talentReady: !!updated.talentReadyAt,
    bothReady: !!updated.companyReadyAt && !!updated.talentReadyAt,
  });
}

// GET /api/matches/[matchId]/ready
// 現在の意向表明状況・契約/プロジェクトの有無を返す。メッセージ画面のステータス表示に使う。
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
    companyReady: !!authorized.match.companyReadyAt,
    talentReady: !!authorized.match.talentReadyAt,
    bothReady: !!authorized.match.companyReadyAt && !!authorized.match.talentReadyAt,
    matchStatus: authorized.match.status,
    hasEngagement: !!engagement,
    projectId: engagement?.project?.id || null,
  });
}
