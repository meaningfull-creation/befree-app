import { prisma } from "@/lib/prisma";

// 指定したmatchIdに、指定ユーザーが当事者(企業側 or 人材側)としてアクセスできるかを確認する。
// アクセス可能なら { match, counterpartName, myRole } を返し、不可なら null を返す。
export async function getMatchIfAuthorized(matchId, user) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      companySkillMap: { include: { company: { include: { user: true } } } },
      talentSkillMap: { include: { talent: { include: { user: true } } } },
    },
  });
  if (!match) return null;

  const companyUserId = match.companySkillMap.company.user?.id;
  const talentUserId = match.talentSkillMap.talent.user?.id;

  if (user.role === "company" && user.id === companyUserId) {
    return { match, counterpartName: match.talentSkillMap.talent.name, myRole: "company" };
  }
  if (user.role === "talent" && user.id === talentUserId) {
    return { match, counterpartName: match.companySkillMap.company.name, myRole: "talent" };
  }
  if (user.role === "admin") {
    return { match, counterpartName: `${match.companySkillMap.company.name} / ${match.talentSkillMap.talent.name}`, myRole: "admin" };
  }
  return null;
}
