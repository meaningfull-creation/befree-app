import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { consumeLoginToken } from "@/lib/loginLink";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";

// POST /api/auth/continue
// body: { token }
// 「この続きはこちらから」メールのワンタイムリンクでログインする。
// GETではなくPOSTにしているのは、メールクライアントやセキュリティ製品のリンク先読みで
// トークンが勝手に消費されるのを防ぐため(/continue 画面のボタンから呼ばれる)。
export async function POST(req) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`continue:ip:${ip}`, 20, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "試行が集中しています。しばらく時間を置いてからお試しください" }, { status: 429 });
    }

    const { token } = await req.json();
    const userId = await consumeLoginToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: "このリンクは期限切れか、すでに使用済みです。パスワードでログインしてください" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.disabledAt) {
      return NextResponse.json({ error: "このアカウントは利用できません" }, { status: 403 });
    }

    const session = await createSessionToken(user.id);
    const res = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
    res.cookies.set(SESSION_COOKIE, session.id, { ...SESSION_COOKIE_OPTIONS, expires: session.expiresAt });
    return res;
  } catch (e) {
    await logError("api/auth/continue", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
