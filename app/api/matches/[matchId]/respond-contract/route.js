import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMatchIfAuthorized } from "@/lib/matchAccess";
import { logAudit } from "@/lib/auditLog";
import { sendEmail } from "@/lib/mailer";
import { getSiteUrl } from "@/lib/siteUrl";

// POST /api/matches/[matchId]/respond-contract
// 認証必須(role=talent、そのマッチングの人材側当事者のみ)。
// 企業から提案された契約条件に対して、承諾または辞退の回答をする。
// body: { accept: boolean }
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getMatchIfAuthorized(params.matchId, user);
  if (!authorized) return NextResponse.json({ error: "アクセス権がありません" }, { status: 403 });
  if (authorized.myRole !== "talent") {
    return NextResponse.json({ error: "契約提案への回答は実務経験者アカウントのみ行えます" }, { status: 403 });
  }

  const { accept } = await req.json();
  const engagement = await prisma.engagement.findUnique({ where: { matchId: params.matchId } });
  if (!engagement || engagement.status !== "proposed") {
    return NextResponse.json({ error: "回答できる契約提案が見つかりません" }, { status: 404 });
  }

  if (!accept) {
    // 辞退した場合は提案自体を削除し、企業側が改めて条件を提案し直せるようにする
    await prisma.engagement.delete({ where: { id: engagement.id } });
    await logAudit({
      actorId: user.id, actorEmail: user.email, action: "engagement.decline",
      targetType: "Engagement", targetId: engagement.id, metadata: { matchId: params.matchId },
    });
    await notifyCompany(authorized, "declined");
    return NextResponse.json({ ok: true, accepted: false });
  }

  const { project } = await prisma.$transaction(async (tx) => {
    const updated = await tx.engagement.update({
      where: { id: engagement.id },
      data: { status: "active", startDate: new Date() },
    });
    await tx.match.update({ where: { id: params.matchId }, data: { status: "accepted" } });
    await tx.capacity.upsert({
      where: { talentId: authorized.match.talentSkillMap.talentId },
      update: { currentCommittedHours: { increment: engagement.monthlyHours || 0 } },
      create: { talentId: authorized.match.talentSkillMap.talentId, currentCommittedHours: engagement.monthlyHours || 0 },
    });

    // 契約成立と同時に、企業⇄人材で共有するプロジェクトを自動作成する。
    // 対象課題(targetAxis)は、企業の最新スキルマップで最もスコアが低い(深刻な)軸を引き継ぐ。
    const axisEntries = Object.entries(authorized.match.companySkillMap.axisScores || {});
    const worstAxis = axisEntries.length ? axisEntries.sort((a, b) => a[1] - b[1])[0][0] : null;
    const project = await tx.project.create({
      data: {
        engagementId: updated.id,
        name: `${authorized.match.companySkillMap.company.name} × ${authorized.match.talentSkillMap.talent.name}`,
        targetAxis: worstAxis,
        status: "active",
      },
    });

    return { engagement: updated, project };
  });

  await logAudit({
    actorId: user.id, actorEmail: user.email, action: "engagement.accept",
    targetType: "Engagement", targetId: engagement.id, metadata: { matchId: params.matchId, projectId: project.id },
  });
  await notifyCompany(authorized, "accepted");

  return NextResponse.json({ ok: true, accepted: true, engagementId: engagement.id, projectId: project.id });
}

// 企業へ、人材の回答(承諾/辞退)をメールで通知する。送信失敗時も本体の処理は継続済みなので握りつぶす。
async function notifyCompany(authorized, result) {
  try {
    const companyUser = authorized.match.companySkillMap.company.user;
    const talentName = authorized.match.talentSkillMap.talent.name;
    if (!companyUser?.email) return;
    if (result === "accepted") {
      await sendEmail({
        to: companyUser.email,
        subject: `【BATTER BOX】${talentName}さんが契約を承諾しました`,
        text: `${talentName}さんが契約条件を承諾し、契約が成立しました。プロジェクト画面から進捗を共有できます。\n\nBATTER BOXにログインする:\n${getSiteUrl()}/app`,
      });
    } else {
      await sendEmail({
        to: companyUser.email,
        subject: `【BATTER BOX】${talentName}さんが契約提案を辞退しました`,
        text: `${talentName}さんが、ご提案いただいた契約条件を辞退されました。条件を見直して再度提案することができます。\n\nBATTER BOXにログインする:\n${getSiteUrl()}/app`,
      });
    }
  } catch (mailErr) {
    console.error("failed to send contract response email:", mailErr.message);
  }
}
