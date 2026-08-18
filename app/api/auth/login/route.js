import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";

// POST /api/auth/login
// body: { email, password, expectedRole? }
//   expectedRole … "company" | "talent" を渡すと、そのロールのアカウントでなければ
//   エラーにする(企業用ログイン画面で人材アカウントを誤って使う、といった取り違えを防ぐ)。
// returns: { user: { id, email, role, companyId, talentId } }
export async function POST(req) {
  try {
    const { email, password, expectedRole } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "email, password は必須です" }, { status: 400 });
    }

    // ブルートフォース対策: IP単位で5回/15分、メールアドレス単位でも5回/15分
    const ip = getClientIp(req);
    const [ipLimit, emailLimit] = await Promise.all([
      checkRateLimit(`login:ip:${ip}`, 10, 15 * 60 * 1000),
      checkRateLimit(`login:email:${email.toLowerCase()}`, 5, 15 * 60 * 1000),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      return NextResponse.json({ error: "試行回数が多すぎます。しばらく時間を置いてから再度お試しください" }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      return NextResponse.json({ error: "メールアドレスまたはパスワードが正しくありません" }, { status: 401 });
    }

    if (expectedRole && user.role !== expectedRole) {
      const roleLabel = { company: "企業", talent: "実務経験者" };
      return NextResponse.json(
        { error: `このメールアドレスは${roleLabel[user.role] || user.role}アカウントとして登録されています。${roleLabel[expectedRole] || expectedRole}用のログイン画面ではログインできません。` },
        { status: 403 }
      );
    }

    const session = await createSessionToken(user.id);

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role, companyId: user.companyId, talentId: user.talentId },
    });
    res.cookies.set(SESSION_COOKIE, session.id, { ...SESSION_COOKIE_OPTIONS, expires: session.expiresAt });
    return res;
  } catch (e) {
    await logError("api/auth/login", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
