import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logError } from "@/lib/errorLog";

// PATCH /api/talent/profile
// 認証必須(role=talent)。AI解析を経由せず、人材の基本情報だけを直接更新する。
// body: { name, title, industry, years, bio, experiencedFunctions, workStyleTags, valueTags, values }
export async function PATCH(req) {
  try {
    const user = await requireRole("talent");
    if (!user) {
      return NextResponse.json({ error: "実務経験者アカウントでのログインが必要です" }, { status: 401 });
    }
    if (!user.talentId) {
      return NextResponse.json({ error: "先にプロフィールを作成してください" }, { status: 400 });
    }

    const { name, title, industry, years, bio, experiencedFunctions, workStyleTags, valueTags, values } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "お名前は必須です" }, { status: 400 });
    }

    const talent = await prisma.talent.update({
      where: { id: user.talentId },
      data: {
        name: name.trim(), title, industry, years, bio,
        ...(experiencedFunctions !== undefined ? { experiencedFunctions } : {}),
        ...(workStyleTags !== undefined ? { workStyleTags } : {}),
        ...(valueTags !== undefined ? { valueTags } : {}),
        ...(values !== undefined ? { values } : {}),
      },
    });

    return NextResponse.json({ ok: true, talent });
  } catch (e) {
    await logError("api/talent/profile", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
