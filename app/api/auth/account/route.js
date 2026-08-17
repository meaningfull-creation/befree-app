import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/passwordHash";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";

// PATCH /api/auth/account
// 認証必須(全ロール共通)。email・newPasswordのどちらか一方または両方を渡す。
// 変更には必ず現在のパスワード(currentPassword)の確認が必要。
// body: { currentPassword, email?, newPassword? }
export async function PATCH(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

    const { currentPassword, email, newPassword } = await req.json();
    if (!currentPassword) {
      return NextResponse.json({ error: "現在のパスワードを入力してください" }, { status: 400 });
    }
    if (!email?.trim() && !newPassword) {
      return NextResponse.json({ error: "変更する項目がありません" }, { status: 400 });
    }

    const rl = await checkRateLimit(`account-update:${user.id}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "試行回数が多すぎます。しばらく時間を置いてから再度お試しください" }, { status: 429 });
    }

    const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!verifyPassword(currentPassword, fullUser.passwordHash, fullUser.passwordSalt)) {
      return NextResponse.json({ error: "現在のパスワードが正しくありません" }, { status: 401 });
    }

    const data = {};
    if (email?.trim() && email.trim() !== fullUser.email) {
      const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
      if (existing) {
        return NextResponse.json({ error: "このメールアドレスは既に使用されています" }, { status: 409 });
      }
      data.email = email.trim();
    }
    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json({ error: "新しいパスワードは8文字以上にしてください" }, { status: 400 });
      }
      const { hash, salt } = hashPassword(newPassword);
      data.passwordHash = hash;
      data.passwordSalt = salt;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: true, email: fullUser.email });
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data });

    // パスワードを変更した場合は、他の端末のセッションも含めて全て失効させる(現在のセッションも含む→再ログインが必要)
    if (newPassword) {
      await prisma.session.deleteMany({ where: { userId: user.id } });
    }

    return NextResponse.json({ ok: true, email: updated.email, requiresRelogin: !!newPassword });
  } catch (e) {
    await logError("api/auth/account", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
