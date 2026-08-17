import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectIfAuthorized } from "@/lib/projectAccess";

// POST /api/projects/[id]/worklogs
// body: { description, hours }
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getProjectIfAuthorized(params.id, user);
  if (!authorized) return NextResponse.json({ error: "このプロジェクトへのアクセス権がありません" }, { status: 403 });

  const { description, hours } = await req.json();
  if (!description?.trim() || !hours) {
    return NextResponse.json({ error: "内容と稼働時間は必須です" }, { status: 400 });
  }

  const workLog = await prisma.workLog.create({
    data: { projectId: params.id, description: description.trim(), hours: Number(hours) },
  });
  return NextResponse.json({ workLog });
}
