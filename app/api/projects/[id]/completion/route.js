import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectIfAuthorized } from "@/lib/projectAccess";
import { logAudit } from "@/lib/auditLog";
import { sendEmail, renderBrandEmail } from "@/lib/mailer";
import { getSiteUrl } from "@/lib/siteUrl";

// POST /api/projects/[id]/completion
// プロジェクト(=契約)の完了フロー。3つのアクションを1エンドポイントで扱う。
//
//   request (人材のみ) … 作業が終わったことを企業に報告する。Project.completionRequestedAt が入り、
//                        企業側に「完了確認待ち」として表示される。契約状態はまだ変わらない。
//   approve (企業のみ) … 報告内容を確認し、完了を承認する。Project と Engagement の両方が completed になり、
//                        人材の稼働上限(Capacity.currentCommittedHours)が解放される。
//   reject  (企業のみ) … まだ完了ではないとして差し戻す。理由は要望・フィードバック欄に残る。
//
// body: { action: "request" | "approve" | "reject", note?: string }
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getProjectIfAuthorized(params.id, user);
  if (!authorized) return NextResponse.json({ error: "このプロジェクトへのアクセス権がありません" }, { status: 403 });

  const { project, myRole } = authorized;
  const { action, note } = await req.json();
  const trimmedNote = typeof note === "string" ? note.trim().slice(0, 2000) : "";

  if (project.completedAt || project.status === "completed") {
    return NextResponse.json({ error: "このプロジェクトは既に完了しています" }, { status: 409 });
  }

  if (action === "request") {
    if (myRole !== "talent") {
      return NextResponse.json({ error: "完了報告は実務経験者アカウントのみ行えます" }, { status: 403 });
    }
    if (project.completionRequestedAt) {
      return NextResponse.json({ error: "既に完了報告済みです。企業の確認をお待ちください" }, { status: 409 });
    }
    const updated = await prisma.project.update({
      where: { id: params.id },
      data: {
        completionRequestedAt: new Date(),
        completionNote: trimmedNote || null,
        completionRejectedAt: null,
      },
    });
    await logAudit({
      actorId: user.id, actorEmail: user.email, action: "project.completion.request",
      targetType: "Project", targetId: params.id, metadata: {},
    });
    await notifyCounterpart(authorized, "request", trimmedNote);
    return NextResponse.json({ ok: true, project: publicFields(updated) });
  }

  if (action === "approve" || action === "reject") {
    if (myRole !== "company") {
      return NextResponse.json({ error: "完了の確認は企業アカウントのみ行えます" }, { status: 403 });
    }
    if (!project.completionRequestedAt) {
      return NextResponse.json({ error: "確認できる完了報告がありません" }, { status: 409 });
    }

    if (action === "reject") {
      const updated = await prisma.project.update({
        where: { id: params.id },
        data: { completionRequestedAt: null, completionRejectedAt: new Date() },
      });
      // 差し戻しの理由は、企業⇄人材が共有している「要望・フィードバック」に残して経緯を追えるようにする。
      if (trimmedNote) {
        await prisma.projectComment.create({
          data: { projectId: params.id, authorRole: "company", body: `【完了の差し戻し】${trimmedNote}` },
        });
      }
      await logAudit({
        actorId: user.id, actorEmail: user.email, action: "project.completion.reject",
        targetType: "Project", targetId: params.id, metadata: {},
      });
      await notifyCounterpart(authorized, "reject", trimmedNote);
      return NextResponse.json({ ok: true, project: publicFields(updated) });
    }

    // approve — プロジェクトと契約をまとめて完了にし、人材の稼働枠を解放する
    const engagement = project.engagement;
    const talentId = project.engagement.match.talentSkillMap.talentId;
    const hours = engagement.monthlyHours || 0;
    const ops = [
      prisma.project.update({
        where: { id: params.id },
        data: { status: "completed", completedAt: new Date() },
      }),
      prisma.engagement.update({ where: { id: engagement.id }, data: { status: "completed" } }),
    ];
    // 稼働枠の解放は、契約がactiveだった場合のみ(二重解放を防ぐ)。
    if (engagement.status === "active" && hours > 0) {
      ops.push(
        prisma.capacity.updateMany({
          where: { talentId },
          data: { currentCommittedHours: { decrement: hours } },
        })
      );
    }
    const [updated] = await prisma.$transaction(ops);
    // decrementが負に振り切れた場合の保険(過去の手動編集などで整合が崩れているケース)
    await prisma.capacity.updateMany({ where: { talentId, currentCommittedHours: { lt: 0 } }, data: { currentCommittedHours: 0 } });

    await logAudit({
      actorId: user.id, actorEmail: user.email, action: "project.completion.approve",
      targetType: "Project", targetId: params.id, metadata: { engagementId: engagement.id },
    });
    await notifyCounterpart(authorized, "approve", trimmedNote);
    return NextResponse.json({ ok: true, project: publicFields(updated) });
  }

  return NextResponse.json({ error: "不正なactionです" }, { status: 400 });
}

function publicFields(p) {
  return {
    status: p.status,
    completionRequestedAt: p.completionRequestedAt,
    completionNote: p.completionNote,
    completionRejectedAt: p.completionRejectedAt,
    completedAt: p.completedAt,
  };
}

// 相手側(企業⇄人材)へメールで通知する。送信に失敗しても本体の処理は済んでいるので握りつぶす。
async function notifyCounterpart(authorized, action, note) {
  try {
    const { project } = authorized;
    const match = project.engagement.match;
    const companyUser = match.companySkillMap.company.user;
    const talentUser = match.talentSkillMap.talent.user;
    const companyName = match.companySkillMap.company.name;
    const talentName = match.talentSkillMap.talent.name;
    const url = `${getSiteUrl()}/app?project=${project.id}`;

    const mails = {
      request: {
        to: companyUser?.email,
        subject: `【BATTER BOX】${talentName}さんから完了報告が届きました`,
        heading: "完了報告が届きました",
        paragraphs: [
          `${talentName}さんが、プロジェクト「${project.name}」の作業完了を報告しました。`,
          "内容をご確認のうえ、問題なければ「完了を承認する」を押してください。承認すると契約が完了となります。まだ続きがある場合は差し戻すこともできます。",
        ],
        ctaLabel: "内容を確認する",
      },
      approve: {
        to: talentUser?.email,
        subject: `【BATTER BOX】${companyName}が完了を承認しました`,
        heading: "契約が完了しました",
        paragraphs: [
          `${companyName}が、プロジェクト「${project.name}」の完了を承認しました。`,
          "お疲れさまでした。稼働枠が解放され、次の案件を受けられる状態になりました。",
        ],
        ctaLabel: "プロジェクトを開く",
      },
      reject: {
        to: talentUser?.email,
        subject: `【BATTER BOX】${companyName}から完了報告が差し戻されました`,
        heading: "完了報告が差し戻されました",
        paragraphs: [
          `${companyName}が、プロジェクト「${project.name}」の完了報告を差し戻しました。`,
          "残っている対応を進めたうえで、改めて完了を報告してください。",
        ],
        ctaLabel: "プロジェクトを開く",
      },
    };

    const m = mails[action];
    if (!m?.to) return;
    const quote = note || null;
    await sendEmail({
      to: m.to,
      subject: m.subject,
      text: `${m.paragraphs.join("\n\n")}${quote ? `\n\n「${quote}」` : ""}\n\n${m.ctaLabel}:\n${url}`,
      html: renderBrandEmail({
        heading: m.heading,
        paragraphs: m.paragraphs,
        quote,
        ctaLabel: m.ctaLabel,
        ctaUrl: url,
      }),
    });
  } catch (mailErr) {
    console.error("failed to send project completion email:", mailErr.message);
  }
}
