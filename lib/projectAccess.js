import { prisma } from "@/lib/prisma";

// 指定したprojectIdに、指定ユーザーが当事者(企業側 or 人材側)としてアクセスできるかを確認する。
// アクセス可能なら { project, myRole } を返し、不可なら null を返す。
export async function getProjectIfAuthorized(projectId, user) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      engagement: {
        include: {
          match: {
            include: {
              companySkillMap: { include: { company: { include: { user: true } } } },
              talentSkillMap: { include: { talent: { include: { user: true } } } },
            },
          },
        },
      },
    },
  });
  if (!project) return null;

  const companyUserId = project.engagement.match.companySkillMap.company.user?.id;
  const talentUserId = project.engagement.match.talentSkillMap.talent.user?.id;

  if (user.role === "company" && user.id === companyUserId) return { project, myRole: "company" };
  if (user.role === "talent" && user.id === talentUserId) return { project, myRole: "talent" };
  if (user.role === "admin") return { project, myRole: "admin" };
  return null;
}
