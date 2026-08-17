import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectIfAuthorized } from "@/lib/projectAccess";
import { AXES } from "@/lib/axes";

const AXIS_LABEL_BY_KEY = Object.fromEntries(AXES.map((a) => [a.key, a.label]));

// GET /api/projects/[id]
// 認証必須。当事者(企業/人材/管理者)のみアクセス可能。
export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getProjectIfAuthorized(params.id, user);
  if (!authorized) return NextResponse.json({ error: "このプロジェクトへのアクセス権がありません" }, { status: 403 });

  const [tasks, kpis, workLogs, comments] = await Promise.all([
    prisma.projectTask.findMany({ where: { projectId: params.id }, orderBy: { createdAt: "asc" } }),
    prisma.projectKPI.findMany({ where: { projectId: params.id }, orderBy: { createdAt: "asc" } }),
    prisma.workLog.findMany({ where: { projectId: params.id }, orderBy: { loggedAt: "desc" } }),
    prisma.projectComment.findMany({ where: { projectId: params.id }, orderBy: { createdAt: "asc" } }),
  ]);

  const { project, myRole } = authorized;
  const company = project.engagement.match.companySkillMap.company;
  const talent = project.engagement.match.talentSkillMap.talent;

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      targetAxis: project.targetAxis,
      targetAxisLabel: project.targetAxis ? AXIS_LABEL_BY_KEY[project.targetAxis] : null,
      currentMonthGoal: project.currentMonthGoal,
      companyName: company.name,
      talentName: talent.name,
      monthlyHours: project.engagement.monthlyHours,
      createdAt: project.createdAt,
    },
    myRole,
    tasks,
    kpis,
    workLogs,
    comments,
  });
}

// PATCH /api/projects/[id]
// body: { currentMonthGoal?, status? }
export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getProjectIfAuthorized(params.id, user);
  if (!authorized) return NextResponse.json({ error: "このプロジェクトへのアクセス権がありません" }, { status: 403 });

  const { currentMonthGoal, status } = await req.json();
  const data = {};
  if (currentMonthGoal !== undefined) data.currentMonthGoal = currentMonthGoal;
  if (status !== undefined) data.status = status;

  const project = await prisma.project.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, project });
}
