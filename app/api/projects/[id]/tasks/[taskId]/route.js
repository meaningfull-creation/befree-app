import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectIfAuthorized } from "@/lib/projectAccess";

const VALID_STATUSES = ["todo", "in_progress", "done"];

async function authorize(params, user) {
  const authorized = await getProjectIfAuthorized(params.id, user);
  if (!authorized) return null;
  // taskが本当にこのプロジェクトのものかも確認する(別プロジェクトのtaskIdを指定した改ざん対策)
  const task = await prisma.projectTask.findUnique({ where: { id: params.taskId } });
  if (!task || task.projectId !== params.id) return null;
  return task;
}

// PATCH /api/projects/[id]/tasks/[taskId]
// body: { status? , title? } — ステータス変更(スワイプ/タップ)とタスク名のその場編集の両方に使う
export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const existing = await authorize(params, user);
  if (!existing) return NextResponse.json({ error: "このタスクへのアクセス権がありません" }, { status: 403 });

  const { status, title } = await req.json();
  const data = {};
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: "不正なstatusです" }, { status: 400 });
    data.status = status;
  }
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) return NextResponse.json({ error: "タスク名を入力してください" }, { status: 400 });
    data.title = title.trim().slice(0, 200);
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "変更内容がありません" }, { status: 400 });

  const task = await prisma.projectTask.update({ where: { id: params.taskId }, data });
  return NextResponse.json({ task });
}

// DELETE /api/projects/[id]/tasks/[taskId]
export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const existing = await authorize(params, user);
  if (!existing) return NextResponse.json({ error: "このタスクへのアクセス権がありません" }, { status: 403 });

  await prisma.projectTask.delete({ where: { id: params.taskId } });
  return NextResponse.json({ ok: true });
}
