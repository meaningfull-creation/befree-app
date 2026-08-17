import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectIfAuthorized } from "@/lib/projectAccess";

// POST /api/projects/[id]/comments
// body: { body }
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "company" && user.role !== "talent")) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const authorized = await getProjectIfAuthorized(params.id, user);
  if (!authorized) return NextResponse.json({ error: "このプロジェクトへのアクセス権がありません" }, { status: 403 });

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "本文は必須です" }, { status: 400 });

  const comment = await prisma.projectComment.create({
    data: { projectId: params.id, authorRole: user.role, body: body.trim() },
  });
  return NextResponse.json({ comment });
}
