import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";
import { sendEmail, renderBrandEmail } from "@/lib/mailer";
import { getSiteUrl } from "@/lib/siteUrl";

const TOKEN_TTL_MS = 1000 * 60 * 60; // 1時間

// POST /api/auth/forgot-password
// body: { email }
// 常に { ok: true } を返す(メールアドレスの存在有無を外部から推測させないため)。
export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: "メールアドレスは必須です" }, { status: 400 });
    }

    const rl = await checkRateLimit(`forgot-password:${email.trim().toLowerCase()}`, 3, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "しばらく時間を置いてから再度お試しください" }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (user) {
      const token = await prisma.passwordResetToken.create({
        data: { userId: user.id, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
      });
      const resetUrl = `${getSiteUrl()}/reset-password?token=${token.id}`;
      try {
        await sendEmail({
          to: email.trim(),
          subject: "【BATTER BOX】パスワード再設定のご案内",
          text: `パスワード再設定のリクエストを受け付けました。\n\n以下のリンクから、新しいパスワードを設定してください(1時間有効です)。\n${resetUrl}\n\n心当たりがない場合は、このメールを無視してください。`,
          html: renderBrandEmail({
            heading: "パスワード再設定のご案内",
            paragraphs: [
              "パスワード再設定のリクエストを受け付けました。",
              "下のボタンから新しいパスワードを設定してください。リンクの有効期限は1時間です。",
            ],
            ctaLabel: "新しいパスワードを設定する",
            ctaUrl: resetUrl,
            footNote: "このメールに心当たりがない場合は、操作は不要です。そのまま破棄してください。",
          }),
        });
      } catch (mailErr) {
        console.error("failed to send password reset email:", mailErr.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    await logError("api/auth/forgot-password", e);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
