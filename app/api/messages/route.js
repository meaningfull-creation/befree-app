import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMatchIfAuthorized } from "@/lib/matchAccess";
import { sendEmail, renderBrandEmail } from "@/lib/mailer";
import { getSiteUrl } from "@/lib/siteUrl";

// GET /api/messages?matchId=...
// 認証必須。呼び出し元がそのMatchの当事者(企業側/人材側/管理者)であることを確認してから返す。
export async function GET(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

    const matchId = new URL(req.url).searchParams.get("matchId");
    if (!matchId) return NextResponse.json({ error: "matchId is required" }, { status: 400 });

    const authorized = await getMatchIfAuthorized(matchId, user);
    if (!authorized) return NextResponse.json({ error: "このメッセージへのアクセス権がありません" }, { status: 403 });

    // スレッドを開いた時点で、相手からの未読メッセージを既読にする
    await prisma.message.updateMany({
      where: { matchId, readAt: null, NOT: { senderId: user.id } },
      data: { readAt: new Date() },
    });

    const messages = await prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      counterpartName: authorized.counterpartName,
      myRole: authorized.myRole,
      messages: messages.map((m) => ({ id: m.id, senderRole: m.senderRole, body: m.body, createdAt: m.createdAt, mine: m.senderId === user.id })),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/messages
// body: { matchId, body }
export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "company" && user.role !== "talent")) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const { matchId, body } = await req.json();
    if (!matchId || !body?.trim()) {
      return NextResponse.json({ error: "matchId, body は必須です" }, { status: 400 });
    }

    const authorized = await getMatchIfAuthorized(matchId, user);
    if (!authorized) return NextResponse.json({ error: "このメッセージへのアクセス権がありません" }, { status: 403 });

    const message = await prisma.message.create({
      data: { matchId, senderId: user.id, senderRole: user.role, body: body.trim() },
    });

    // 新着メッセージを、相手(受信側)の登録メールアドレスに通知する。
    // 通知メールの送信に失敗しても、メッセージの送信自体は成功として扱う(致命的ではないため)。
    try {
      const isSenderCompany = user.role === "company";
      const recipientUser = isSenderCompany
        ? authorized.match.talentSkillMap.talent.user
        : authorized.match.companySkillMap.company.user;
      const senderName = isSenderCompany
        ? authorized.match.companySkillMap.company.name
        : authorized.match.talentSkillMap.talent.name;

      if (recipientUser?.email) {
        const preview = body.trim().length > 140 ? `${body.trim().slice(0, 140)}…` : body.trim();
        await sendEmail({
          to: recipientUser.email,
          subject: `【BATTER BOX】${senderName}さんから新しいメッセージが届いています`,
          text: `${senderName}さんから新しいメッセージが届いています。\n\n「${preview}」\n\nBATTER BOXにログインして返信する:\n${getSiteUrl()}/app`,
          html: renderBrandEmail({
            heading: "新しいメッセージが届いています",
            paragraphs: [`${senderName}さんからメッセージが届きました。`],
            quote: preview,
            ctaLabel: "ログインして返信する",
            ctaUrl: `${getSiteUrl()}/app`,
          }),
        });
      }
    } catch (mailErr) {
      console.error("failed to send message notification email:", mailErr.message);
    }

    return NextResponse.json({ message: { id: message.id, senderRole: message.senderRole, body: message.body, createdAt: message.createdAt, mine: true } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
