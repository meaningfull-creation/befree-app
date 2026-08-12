import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { logError } from "@/lib/errorLog";

// POST /api/auth/reset-password
// body: { token, password }
export async function POST(req) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: "token, password は必須です" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "パスワードは8文字以上にしてください" }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { id: token } });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "リンクの有効期限が切れているか、無効です。もう一度お試しください" }, { status: 400 });
    }

    const { hash, salt } = hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash: hash, passwordSalt: salt } }),
      prisma.passwordResetToken.update({ where: { id: token }, data: { usedAt: new Date() } }),
      // パスワード変更を機に、既存の全セッションを失効させる(乗っ取られていた場合の保険)
      prisma.session.deleteMany({ where: { userId: resetToken.userId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    await logError("api/auth/reset-password", e);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
