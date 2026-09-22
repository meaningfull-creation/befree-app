import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectIfAuthorized } from "@/lib/projectAccess";
import { sendEmail, renderBrandEmail } from "@/lib/mailer";
import { getSiteUrl } from "@/lib/siteUrl";

// POST /api/projects/[id]/comments
// body: { body }
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "company" && user.role !== "talent")) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const authorized = await getProjectIfAuthorized(params.id, user);
  if (!authorized) return NextResponse.json({ error: "このプロジェクトへのアクセス権がありません" }, { status: 403 });

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "本文は必須です" }, { status: 400 });

  const comment = await prisma.projectComment.create({
    data: { projectId: params.id, authorRole: user.role, body: body.trim() },
  });

  // 相手側(企業⇄人材)へメールで通知する。送信失敗しても投稿自体は成功として扱う。
  try {
    const match = authorized.project.engagement.match;
    const recipientUser = user.role === "company" ? match.talentSkillMap.talent.user : match.companySkillMap.company.user;
    const senderName = user.role === "company" ? match.companySkillMap.company.name : match.talentSkillMap.talent.name;
    if (recipientUser?.email) {
      const preview = body.trim().length > 200 ? `${body.trim().slice(0, 200)}…` : body.trim();
      await sendEmail({
        to: recipientUser.email,
        subject: `【BATTER BOX】${senderName}さんからプロジェクトに要望・フィードバックが届いています`,
        text: `${senderName}さんがプロジェクト「${authorized.project.name}」に要望・フィードバックを投稿しました。\n\n「${preview}」\n\n確認する:\n${getSiteUrl()}/app?project=${params.id}`,
        html: renderBrandEmail({
          heading: "要望・フィードバックが届きました",
          paragraphs: [`${senderName}さんが、プロジェクト「${authorized.project.name}」に投稿しました。`],
          quote: preview,
          ctaLabel: "プロジェクトを開いて確認する",
          ctaUrl: `${getSiteUrl()}/app?project=${params.id}`,
        }),
      });
    }
  } catch (mailErr) {
    console.error("failed to send project comment email:", mailErr.message);
  }

  return NextResponse.json({ comment });
}
