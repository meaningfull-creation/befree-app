import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectIfAuthorized } from "@/lib/projectAccess";

// POST /api/projects/[id]/kpis
// body: { name, targetValue?, currentValue?, unit? }
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getProjectIfAuthorized(params.id, user);
  if (!authorized) return NextResponse.json({ error: "このプロジェクトへのアクセス権がありません" }, { status: 403 });

  const { name, targetValue, currentValue, unit } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "KPI名は必須です" }, { status: 400 });

  const kpi = await prisma.projectKPI.create({
    data: {
      projectId: params.id,
      name: name.trim(),
      targetValue: targetValue != null ? Number(targetValue) : null,
      currentValue: currentValue != null ? Number(currentValue) : null,
      unit: unit || null,
    },
  });
  return NextResponse.json({ kpi });
}
