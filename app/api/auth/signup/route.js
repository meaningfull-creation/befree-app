import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";

// POST /api/auth/signup
// body: { email, password, role: "company" | "talent" }
// returns: { user: { id, email, role } }
export async function POST(req) {
  try {
    const { email, password, role } = await req.json();

    if (!email || !password || !["company", "talent"].includes(role)) {
      return NextResponse.json({ error: "email, password, role(company|talent) は必須です" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "パスワードは8文字以上にしてください" }, { status: 400 });
    }

    const ip = getClientIp(req);
    const rl = await checkRateLimit(`signup:ip:${ip}`, 10, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "登録が集中しています。しばらく時間を置いてから再度お試しください" }, { status: 429 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
    }

    const { hash, salt } = hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash: hash, passwordSalt: salt, role },
    });

    const session = await createSessionToken(user.id);

    const res = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
    res.cookies.set(SESSION_COOKIE, session.id, { ...SESSION_COOKIE_OPTIONS, expires: session.expiresAt });
    return res;
  } catch (e) {
    await logError("api/auth/signup", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
