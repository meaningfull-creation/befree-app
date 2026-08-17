import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectIfAuthorized } from "@/lib/projectAccess";

const VALID_STATUSES = ["todo", "in_progress", "done"];

// PATCH /api/projects/[id]/tasks/[taskId]
// body: { status }
export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getProjectIfAuthorized(params.id, user);
  if (!authorized) return NextResponse.json({ error: "このプロジェクトへのアクセス権がありません" }, { status: 403 });

  const { status } = await req.json();
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: "不正なstatusです" }, { status: 400 });

  const task = await prisma.projectTask.update({ where: { id: params.taskId }, data: { status } });
  return NextResponse.json({ task });
}
