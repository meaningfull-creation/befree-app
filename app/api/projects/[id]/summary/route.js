import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectIfAuthorized } from "@/lib/projectAccess";
import { generateProjectReview } from "@/lib/projectAI";
import { logError } from "@/lib/errorLog";

// POST /api/projects/[id]/summary
// 認証必須。現在のタスク・KPI・稼働ログ・コメントから、AIがレビュー(進捗サマリー/月次レビュー)を生成する。
// 生成結果は保存しない(都度、最新の状態から生成する on-demand 方式)。
export async function POST(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

    const authorized = await getProjectIfAuthorized(params.id, user);
    if (!authorized) return NextResponse.json({ error: "このプロジェクトへのアクセス権がありません" }, { status: 403 });

    const { project } = authorized;
    const [tasks, kpis, workLogs, comments] = await Promise.all([
      prisma.projectTask.findMany({ where: { projectId: params.id } }),
      prisma.projectKPI.findMany({ where: { projectId: params.id } }),
      prisma.workLog.findMany({ where: { projectId: params.id }, orderBy: { loggedAt: "desc" } }),
      prisma.projectComment.findMany({ where: { projectId: params.id }, orderBy: { createdAt: "asc" } }),
    ]);

    const projectForPrompt = {
      name: project.name,
      targetAxisLabel: project.targetAxis,
      currentMonthGoal: project.currentMonthGoal,
      monthlyHours: project.engagement?.monthlyHours,
    };

    const review = await generateProjectReview({ project: projectForPrompt, tasks, kpis, workLogs, comments });
    if (!review) {
      return NextResponse.json({ error: "AIレビューの生成に失敗しました。もう一度お試しください。" }, { status: 502 });
    }

    return NextResponse.json({ review });
  } catch (e) {
    await logError("api/projects/[id]/summary", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
