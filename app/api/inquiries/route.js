import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";
import { sendEmail } from "@/lib/mailer";
import { getSiteUrl } from "@/lib/siteUrl";

// POST /api/inquiries
// 認証不要(公開の問い合わせフォームから送信)。
// body: { name, email, companyName?, message }
export async function POST(req) {
  try {
    const { name, email, companyName, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "お名前・メールアドレス・お問い合わせ内容は必須です" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 });
    }

    const ip = getClientIp(req);
    const rl = await checkRateLimit(`contact:ip:${ip}`, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "送信が集中しています。しばらく時間を置いてから再度お試しください" }, { status: 429 });
    }

    await prisma.inquiry.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        companyName: companyName?.trim() || null,
        message: message.trim(),
      },
    });

    // 運営(全管理者アカウント)へ新着問い合わせを通知する。送信失敗しても受付自体は成功として扱う。
    try {
      const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { email: true } });
      if (admins.length > 0) {
        const preview = message.trim().length > 300 ? `${message.trim().slice(0, 300)}…` : message.trim();
        await Promise.all(
          admins.map((a) =>
            sendEmail({
              to: a.email,
              subject: `【BATTER BOX】新しいお問い合わせが届いています(${name.trim()}様)`,
              text: `新しいお問い合わせが届きました。\n\nお名前: ${name.trim()}\nメールアドレス: ${email.trim()}\n会社名: ${companyName?.trim() || "(未記入)"}\n\n内容:\n${preview}\n\n管理画面で確認する:\n${getSiteUrl()}/admin/inquiries`,
            })
          )
        );
      }
    } catch (mailErr) {
      console.error("failed to send inquiry notification email:", mailErr.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    await logError("api/inquiries", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
