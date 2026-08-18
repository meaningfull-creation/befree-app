"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, deleteSessionToken, requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/auditLog";
import { generateMatchReason } from "@/lib/matchReason";
import { recomputeAxisPerformance } from "@/lib/axisPerformance";

async function ensureAdmin() {
  const admin = await requireRole("admin");
  if (!admin) throw new Error("管理者権限が必要です");
  return admin;
}

function audit(admin, action, targetType, targetId, metadata) {
  return logAudit({ actorId: admin.id, actorEmail: admin.email, action, targetType, targetId, metadata });
}

// 管理画面からのログアウト
export async function logoutAction() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  await deleteSessionToken(token);
  cookies().delete(SESSION_COOKIE);
  redirect("/login/admin");
}

// マッチング候補を「提案として記録」する(Match作成、既存なら更新)。
// reasonが未指定の場合、AIに両者のスキルマップから根拠文を生成させる(面白い要素: AIによるマッチング理由の自動生成)。
export async function recordMatchAction(formData) {
  const admin = await ensureAdmin();

  const companySkillMapId = formData.get("companySkillMapId");
  const talentSkillMapId = formData.get("talentSkillMapId");
  const matchScore = Number(formData.get("matchScore"));
  let reason = formData.get("reason") || null;
  const redirectPath = formData.get("redirectPath");

  if (!companySkillMapId || !talentSkillMapId) return;

  if (!reason) {
    reason = await generateMatchReason(companySkillMapId, talentSkillMapId, matchScore);
  }

  const match = await prisma.match.upsert({
    where: { companySkillMapId_talentSkillMapId: { companySkillMapId, talentSkillMapId } },
    update: { matchScore, reason },
    create: { companySkillMapId, talentSkillMapId, matchScore, reason, status: "proposed" },
  });

  await audit(admin, "match.record", "Match", match.id, { matchScore });

  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/admin/matches");
  revalidatePath("/admin");
}

// 提案(Match)を業務委託契約(Engagement)に格上げする。
// 支払いフローは 企業→BATTER BOX→人材 を前提とし、企業⇄BATTER BOX・BATTER BOX⇄人材の2本の業務委託契約として扱う。
// 契約成立と同時に、人材の稼働状況(Capacity.currentCommittedHours)にも加算する。
export async function acceptMatchAction(formData) {
  const admin = await ensureAdmin();

  const matchId = formData.get("matchId");
  const monthlyHours = Number(formData.get("monthlyHours")) || 10;
  const companyAmount = Number(formData.get("companyAmount")) || null;
  const talentAmount = Number(formData.get("talentAmount")) || null;
  const redirectPath = formData.get("redirectPath");

  if (!matchId) return;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      talentSkillMap: { include: { talent: true } },
      companySkillMap: { include: { company: true } },
    },
  });
  if (!match) return;

  const { engagement, project } = await prisma.$transaction(async (tx) => {
    const engagement = await tx.engagement.create({
      data: {
        matchId,
        startDate: new Date(),
        monthlyHours,
        contractType: "business_delegation",
        companyAmount,
        talentAmount,
        status: "active",
      },
    });
    await tx.match.update({ where: { id: matchId }, data: { status: "accepted" } });
    await tx.capacity.upsert({
      where: { talentId: match.talentSkillMap.talentId },
      update: { currentCommittedHours: { increment: monthlyHours } },
      create: { talentId: match.talentSkillMap.talentId, currentCommittedHours: monthlyHours },
    });

    // 契約成立と同時に、企業⇄人材で共有するプロジェクトを自動作成する。
    // 対象課題(targetAxis)は、企業の最新スキルマップで最もスコアが低い(深刻な)軸を引き継ぐ。
    const axisEntries = Object.entries(match.companySkillMap.axisScores || {});
    const worstAxis = axisEntries.length ? axisEntries.sort((a, b) => a[1] - b[1])[0][0] : null;
    const project = await tx.project.create({
      data: {
        engagementId: engagement.id,
        name: `${match.companySkillMap.company.name} × ${match.talentSkillMap.talent.name}`,
        targetAxis: worstAxis,
        status: "active",
      },
    });

    return { engagement, project };
  });

  await audit(admin, "match.accept", "Engagement", engagement.id, { matchId, monthlyHours, companyAmount, talentAmount });

  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/admin/matches");
  revalidatePath("/admin/engagements");
  revalidatePath("/admin");
}

// 提案(Match)を見送る
export async function declineMatchAction(formData) {
  const admin = await ensureAdmin();

  const matchId = formData.get("matchId");
  const redirectPath = formData.get("redirectPath");
  if (!matchId) return;

  await prisma.match.update({ where: { id: matchId }, data: { status: "declined" } });
  await audit(admin, "match.decline", "Match", matchId, {});

  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/admin/matches");
}

// 伴走終了後(または途中経過)の成果スコアを記録する
export async function recordOutcomeAction(formData) {
  const admin = await ensureAdmin();

  const engagementId = formData.get("engagementId");
  const outcomeScore = Number(formData.get("outcomeScore"));
  const notes = formData.get("notes") || null;
  const redirectPath = formData.get("redirectPath");

  if (!engagementId || Number.isNaN(outcomeScore)) return;

  const outcome = await prisma.engagementOutcome.create({
    data: { engagementId, outcomeScore, notes },
  });
  await audit(admin, "outcome.record", "EngagementOutcome", outcome.id, { engagementId, outcomeScore });

  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/admin/engagements");
}

// 契約のステータスを更新する(active | paused | completed)。
// activeから外れる場合は稼働時間を解放し、activeに戻す場合は再度加算する。
export async function updateEngagementStatusAction(formData) {
  const admin = await ensureAdmin();

  const engagementId = formData.get("engagementId");
  const status = formData.get("status");
  const redirectPath = formData.get("redirectPath");
  if (!engagementId || !status) return;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    include: { match: { include: { talentSkillMap: true } } },
  });
  if (!engagement) return;

  const wasActive = engagement.status === "active";
  const willBeActive = status === "active";
  const hours = engagement.monthlyHours || 0;
  const talentId = engagement.match.talentSkillMap.talentId;

  const ops = [prisma.engagement.update({ where: { id: engagementId }, data: { status } })];

  if (wasActive && !willBeActive) {
    ops.push(
      prisma.capacity.updateMany({
        where: { talentId },
        data: { currentCommittedHours: { decrement: hours } },
      })
    );
  } else if (!wasActive && willBeActive) {
    ops.push(
      prisma.capacity.upsert({
        where: { talentId },
        update: { currentCommittedHours: { increment: hours } },
        create: { talentId, currentCommittedHours: hours },
      })
    );
  }

  await prisma.$transaction(ops);
  await audit(admin, "engagement.status", "Engagement", engagementId, { from: engagement.status, to: status });

  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/admin/engagements");
}

// 人材の登録審査(承認/却下)。承認された人材だけがマッチング候補に表示される。
export async function reviewTalentAction(formData) {
  const admin = await ensureAdmin();

  const talentId = formData.get("talentId");
  const status = formData.get("status"); // "approved" | "rejected"
  const redirectPath = formData.get("redirectPath");
  if (!talentId || !["approved", "rejected"].includes(status)) return;

  await prisma.talent.update({ where: { id: talentId }, data: { status } });
  await audit(admin, "talent.review", "Talent", talentId, { status });

  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/admin/talents");
  revalidatePath("/admin");
}

// 企業→BATTER BOXへの請求書を発行する(決済導線の土台。実際の入金確認は未実装)。
export async function issueInvoiceAction(formData) {
  const admin = await ensureAdmin();

  const engagementId = formData.get("engagementId");
  const periodLabel = formData.get("periodLabel");
  const amount = Number(formData.get("amount"));
  const redirectPath = formData.get("redirectPath");

  if (!engagementId || !periodLabel || Number.isNaN(amount)) return;

  const invoice = await prisma.invoice.create({
    data: { engagementId, periodLabel, amount, status: "draft" },
  });
  await audit(admin, "invoice.issue", "Invoice", invoice.id, { engagementId, periodLabel, amount });

  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/admin/engagements");
}

// 請求書のステータスを更新する(draft | sent | paid)
export async function updateInvoiceStatusAction(formData) {
  const admin = await ensureAdmin();

  const invoiceId = formData.get("invoiceId");
  const status = formData.get("status");
  const redirectPath = formData.get("redirectPath");
  if (!invoiceId || !status) return;

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
  await audit(admin, "invoice.status", "Invoice", invoiceId, { status });

  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/admin/engagements");
}

// BATTER BOX→人材への支払いを起票する(企業からの入金確認後に実施する想定)。
export async function issuePayoutAction(formData) {
  const admin = await ensureAdmin();

  const engagementId = formData.get("engagementId");
  const periodLabel = formData.get("periodLabel");
  const amount = Number(formData.get("amount"));
  const redirectPath = formData.get("redirectPath");

  if (!engagementId || !periodLabel || Number.isNaN(amount)) return;

  const payout = await prisma.payout.create({
    data: { engagementId, periodLabel, amount, status: "draft" },
  });
  await audit(admin, "payout.issue", "Payout", payout.id, { engagementId, periodLabel, amount });

  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/admin/engagements");
}

// 支払いのステータスを更新する(draft | scheduled | paid)
export async function updatePayoutStatusAction(formData) {
  const admin = await ensureAdmin();

  const payoutId = formData.get("payoutId");
  const status = formData.get("status");
  const redirectPath = formData.get("redirectPath");
  if (!payoutId || !status) return;

  await prisma.payout.update({ where: { id: payoutId }, data: { status } });
  await audit(admin, "payout.status", "Payout", payoutId, { status });

  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/admin/engagements");
}

// 問い合わせのステータスを更新する(new | replied | closed)
export async function updateInquiryStatusAction(formData) {
  const admin = await ensureAdmin();

  const inquiryId = formData.get("inquiryId");
  const status = formData.get("status");
  const redirectPath = formData.get("redirectPath");
  if (!inquiryId || !status) return;

  await prisma.inquiry.update({ where: { id: inquiryId }, data: { status } });
  await audit(admin, "inquiry.status", "Inquiry", inquiryId, { status });

  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/admin/inquiries");
}

// 蓄積されたEngagementOutcomeから軸ごとの学習係数を再計算する(データ活用の核 — lib/learning.js参照)
export async function recomputeAxisPerformanceAction(formData) {
  const admin = await ensureAdmin();

  const performance = await recomputeAxisPerformance();
  const totalSamples = Object.values(performance).reduce((s, p) => s + p.sampleCount, 0);
  await audit(admin, "axisPerformance.recompute", null, null, { totalSamples });

  const redirectPath = formData?.get?.("redirectPath");
  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/admin/insights");
}

// 学習係数(AxisPerformance.weightMultiplier)を管理者が手動で上書きする(⑩人材推薦設定)。
// 自動再計算(recomputeAxisPerformanceAction)を実行すると、この手動値は上書きされる。
export async function overrideAxisWeightAction(formData) {
  const admin = await ensureAdmin();

  const axisKey = formData.get("axisKey");
  const weightMultiplier = Number(formData.get("weightMultiplier"));
  const redirectPath = formData.get("redirectPath");
  if (!axisKey || !Number.isFinite(weightMultiplier)) return;

  const clamped = Math.max(0.5, Math.min(1.5, weightMultiplier));
  await prisma.axisPerformance.upsert({
    where: { axisKey },
    update: { weightMultiplier: clamped },
    create: { axisKey, weightMultiplier: clamped, sampleCount: 0 },
  });
  await audit(admin, "axisPerformance.override", "AxisPerformance", axisKey, { weightMultiplier: clamped });

  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/admin/insights");
}

// 診断結果(CompanySkillMap)の軸スコアを管理者が手動調整する(⑩診断スコア調整)。
// AIの誤診断を是正する目的の緊急避難的な機能。変更は監査ログに残す。
export async function adjustCompanyScoreAction(formData) {
  const admin = await ensureAdmin();

  const skillMapId = formData.get("skillMapId");
  const axisKey = formData.get("axisKey");
  const newScore = Number(formData.get("newScore"));
  const redirectPath = formData.get("redirectPath");
  if (!skillMapId || !axisKey || !Number.isFinite(newScore)) return;

  const skillMap = await prisma.companySkillMap.findUnique({ where: { id: skillMapId } });
  if (!skillMap) return;

  const clamped = Math.max(0, Math.min(100, Math.round(newScore)));
  const updatedScores = { ...skillMap.axisScores, [axisKey]: clamped };

  await prisma.companySkillMap.update({ where: { id: skillMapId }, data: { axisScores: updatedScores } });
  await audit(admin, "companySkillMap.adjustScore", "CompanySkillMap", skillMapId, { axisKey, from: skillMap.axisScores[axisKey], to: clamped });

  if (redirectPath) revalidatePath(redirectPath);
}
