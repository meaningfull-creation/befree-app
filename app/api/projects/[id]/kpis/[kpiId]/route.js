import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectIfAuthorized } from "@/lib/projectAccess";

// PATCH /api/projects/[id]/kpis/[kpiId]
// body: { currentValue }
export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getProjectIfAuthorized(params.id, user);
  if (!authorized) return NextResponse.json({ error: "このプロジェクトへのアクセス権がありません" }, { status: 403 });

  const { currentValue } = await req.json();
  const kpi = await prisma.projectKPI.update({
    where: { id: params.kpiId },
    data: { currentValue: currentValue != null ? Number(currentValue) : null },
  });
  return NextResponse.json({ kpi });
}
