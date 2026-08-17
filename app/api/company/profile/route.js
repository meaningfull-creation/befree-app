import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logError } from "@/lib/errorLog";

// PATCH /api/company/profile
// 認証必須(role=company)。AI課題診断を経由せず、企業の基本情報だけを直接更新する。
// body: { name, industry, headcount, phase, revenue }
export async function PATCH(req) {
  try {
    const user = await requireRole("company");
    if (!user) {
      return NextResponse.json({ error: "企業アカウントでのログインが必要です" }, { status: 401 });
    }
    if (!user.companyId) {
      return NextResponse.json({ error: "先に企業プロフィールを作成してください" }, { status: 400 });
    }

    const { name, industry, headcount, phase, revenue } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "会社名は必須です" }, { status: 400 });
    }

    const company = await prisma.company.update({
      where: { id: user.companyId },
      data: { name: name.trim(), industry, headcount, phase, revenue },
    });

    return NextResponse.json({ ok: true, company });
  } catch (e) {
    await logError("api/company/profile", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
