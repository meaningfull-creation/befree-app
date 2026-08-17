import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/projects
// 認証必須。ログイン中のアカウント(企業 or 人材)が当事者になっているプロジェクトを一覧で返す。
export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "company" && user.role !== "talent")) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const where =
    user.role === "company"
      ? { engagement: { match: { companySkillMap: { companyId: user.companyId || "" } } } }
      : { engagement: { match: { talentSkillMap: { talentId: user.talentId || "" } } } };

  const projects = await prisma.project.findMany({
    where,
    include: {
      engagement: {
        include: {
          match: {
            include: {
              companySkillMap: { include: { company: true } },
              talentSkillMap: { include: { talent: true } },
            },
          },
        },
      },
      tasks: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const result = projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    targetAxis: p.targetAxis,
    companyName: p.engagement.match.companySkillMap.company.name,
    talentName: p.engagement.match.talentSkillMap.talent.name,
    taskCount: p.tasks.length,
    doneTaskCount: p.tasks.filter((t) => t.status === "done").length,
    createdAt: p.createdAt,
  }));

  return NextResponse.json({ projects: result });
}
