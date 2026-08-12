import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";

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

    return NextResponse.json({ ok: true });
  } catch (e) {
    await logError("api/inquiries", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
