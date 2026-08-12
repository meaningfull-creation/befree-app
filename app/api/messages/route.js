import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMatchIfAuthorized } from "@/lib/matchAccess";

// GET /api/messages?matchId=...
// 認証必須。呼び出し元がそのMatchの当事者(企業側/人材側/管理者)であることを確認してから返す。
export async function GET(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

    const matchId = new URL(req.url).searchParams.get("matchId");
    if (!matchId) return NextResponse.json({ error: "matchId is required" }, { status: 400 });

    const authorized = await getMatchIfAuthorized(matchId, user);
    if (!authorized) return NextResponse.json({ error: "このメッセージへのアクセス権がありません" }, { status: 403 });

    const messages = await prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      counterpartName: authorized.counterpartName,
      myRole: authorized.myRole,
      messages: messages.map((m) => ({ id: m.id, senderRole: m.senderRole, body: m.body, createdAt: m.createdAt, mine: m.senderId === user.id })),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/messages
// body: { matchId, body }
export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "company" && user.role !== "talent")) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const { matchId, body } = await req.json();
    if (!matchId || !body?.trim()) {
      return NextResponse.json({ error: "matchId, body は必須です" }, { status: 400 });
    }

    const authorized = await getMatchIfAuthorized(matchId, user);
    if (!authorized) return NextResponse.json({ error: "このメッセージへのアクセス権がありません" }, { status: 403 });

    const message = await prisma.message.create({
      data: { matchId, senderId: user.id, senderRole: user.role, body: body.trim() },
    });

    return NextResponse.json({ message: { id: message.id, senderRole: message.senderRole, body: message.body, createdAt: message.createdAt, mine: true } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
