import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";

const TOKEN_TTL_MS = 1000 * 60 * 60; // 1時間

// POST /api/auth/forgot-password
// body: { email }
// 常に { ok: true } を返す(メールアドレスの存在有無を外部から推測させないため)。
//
// 注意: 現状メール送信サービスは未連携。リセットリンクはサーバーのコンソールログにのみ出力される。
// 本番運用前に、Resend/SendGrid等のメールプロバイダを lib/mailer.js のような形で連携してください。
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
      // TODO: 実際のメール送信に置き換える。現状はログ出力のみ。
      console.log(`[password reset] ${email} -> /reset-password?token=${token.id} (1時間有効)`);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    await logError("api/auth/forgot-password", e);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
