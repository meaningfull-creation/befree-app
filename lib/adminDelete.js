import { prisma } from "@/lib/prisma";

// 企業・人材の削除は、関連するレコード(診断履歴・マッチング・契約・プロジェクト・
// 請求書・メッセージ・ログインアカウント等)を外部キー制約に違反しない順序(子→親)で
// 削除してから、最後に本体を削除する。すべて単一のトランザクションで実行し、
// 途中で失敗した場合は何も削除されない状態に戻す。

// 企業を削除する。サンプルデータの整理を主目的とした、取り消せない操作。
export async function deleteCompanyCascade(companyId) {
  const skillMaps = await prisma.companySkillMap.findMany({ where: { companyId }, select: { id: true } });
  const skillMapIds = skillMaps.map((s) => s.id);

  const matches = skillMapIds.length
    ? await prisma.match.findMany({ where: { companySkillMapId: { in: skillMapIds } }, select: { id: true } })
    : [];
  const matchIds = matches.map((m) => m.id);

  const engagements = matchIds.length
    ? await prisma.engagement.findMany({ where: { matchId: { in: matchIds } }, select: { id: true } })
    : [];
  const engagementIds = engagements.map((e) => e.id);

  const projects = engagementIds.length
    ? await prisma.project.findMany({ where: { engagementId: { in: engagementIds } }, select: { id: true } })
    : [];
  const projectIds = projects.map((p) => p.id);

  const diagnosisSessions = await prisma.diagnosisSession.findMany({ where: { companyId }, select: { id: true } });
  const sessionIds = diagnosisSessions.map((s) => s.id);

  const user = await prisma.user.findUnique({ where: { companyId }, select: { id: true } });

  await prisma.$transaction([
    prisma.projectTask.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.projectKPI.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.workLog.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.projectComment.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.talentRating.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.project.deleteMany({ where: { id: { in: projectIds } } }),
    prisma.engagementOutcome.deleteMany({ where: { engagementId: { in: engagementIds } } }),
    prisma.invoice.deleteMany({ where: { engagementId: { in: engagementIds } } }),
    prisma.payout.deleteMany({ where: { engagementId: { in: engagementIds } } }),
    prisma.engagement.deleteMany({ where: { id: { in: engagementIds } } }),
    prisma.message.deleteMany({ where: { matchId: { in: matchIds } } }),
    prisma.match.deleteMany({ where: { id: { in: matchIds } } }),
    prisma.companySkillMap.deleteMany({ where: { companyId } }),
    prisma.diagnosisTurn.deleteMany({ where: { sessionId: { in: sessionIds } } }),
    prisma.diagnosisSession.deleteMany({ where: { companyId } }),
    ...(user ? [prisma.session.deleteMany({ where: { userId: user.id } }), prisma.user.delete({ where: { id: user.id } })] : []),
    prisma.company.delete({ where: { id: companyId } }),
  ]);
}

// 人材を削除する。サンプルデータの整理を主目的とした、取り消せない操作。
export async function deleteTalentCascade(talentId) {
  const skillMaps = await prisma.talentSkillMap.findMany({ where: { talentId }, select: { id: true } });
  const skillMapIds = skillMaps.map((s) => s.id);

  const matches = skillMapIds.length
    ? await prisma.match.findMany({ where: { talentSkillMapId: { in: skillMapIds } }, select: { id: true } })
    : [];
  const matchIds = matches.map((m) => m.id);

  const engagements = matchIds.length
    ? await prisma.engagement.findMany({ where: { matchId: { in: matchIds } }, select: { id: true } })
    : [];
  const engagementIds = engagements.map((e) => e.id);

  const projects = engagementIds.length
    ? await prisma.project.findMany({ where: { engagementId: { in: engagementIds } }, select: { id: true } })
    : [];
  const projectIds = projects.map((p) => p.id);

  const user = await prisma.user.findUnique({ where: { talentId }, select: { id: true } });

  await prisma.$transaction([
    prisma.projectTask.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.projectKPI.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.workLog.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.projectComment.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.talentRating.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.project.deleteMany({ where: { id: { in: projectIds } } }),
    prisma.engagementOutcome.deleteMany({ where: { engagementId: { in: engagementIds } } }),
    prisma.invoice.deleteMany({ where: { engagementId: { in: engagementIds } } }),
    prisma.payout.deleteMany({ where: { engagementId: { in: engagementIds } } }),
    prisma.engagement.deleteMany({ where: { id: { in: engagementIds } } }),
    prisma.message.deleteMany({ where: { matchId: { in: matchIds } } }),
    prisma.match.deleteMany({ where: { id: { in: matchIds } } }),
    prisma.talentSkillMap.deleteMany({ where: { talentId } }),
    prisma.capacity.deleteMany({ where: { talentId } }),
    ...(user ? [prisma.session.deleteMany({ where: { userId: user.id } }), prisma.user.delete({ where: { id: user.id } })] : []),
    prisma.talent.delete({ where: { id: talentId } }),
  ]);
}
