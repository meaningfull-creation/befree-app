import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";
import { sendEmail, renderBrandEmail } from "@/lib/mailer";
import { issueLoginLink } from "@/lib/loginLink";

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

    // v6.8: アカウント作成を入力より前に移したので、ここで「続きはこちらから」メールを送る。
    // 登録した本人はこのレスポンスでそのままログイン済みになるため、このメールは
    // 「途中で間が空いた」「別の端末で続きをやる」ときの戻り道。
    // 送信に失敗しても登録自体は成立させる(メールはあくまで補助)。
    try {
      const continueUrl = await issueLoginLink(user.id);
      const isCompany = role === "company";
      const next = isCompany ? "会社情報の入力とAI課題診断" : "経歴の入力とAI自己分析";
      await sendEmail({
        to: email,
        subject: "【BATTER BOX】アカウントを作成しました",
        text: `BATTER BOXへのご登録ありがとうございます。\n\nこのあと${next}に進みます。\n途中で中断しても、下のリンクから同じアカウントで続きから再開できます(7日間有効・1回限り)。\n${continueUrl}\n\nログインID: ${email}\n\n※このリンクは第三者に共有しないでください。`,
        html: renderBrandEmail({
          heading: "アカウントを作成しました",
          paragraphs: [
            "BATTER BOXへのご登録ありがとうございます。",
            `このあと${next}に進みます。途中で中断しても、下のボタンから同じアカウントで続きから再開できます。`,
            "リンクの有効期限は7日間で、1回だけ使えます。",
          ],
          infoRows: [["ログインID", email]],
          ctaLabel: "続きから始める",
          ctaUrl: continueUrl,
          footNote: "このリンクは第三者に共有しないでください。心当たりがない場合はこのメールを破棄してください。",
        }),
      });
    } catch (mailErr) {
      console.error("failed to send signup email:", mailErr.message);
    }

    const res = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
    res.cookies.set(SESSION_COOKIE, session.id, { ...SESSION_COOKIE_OPTIONS, expires: session.expiresAt });
    return res;
  } catch (e) {
    await logError("api/auth/signup", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
