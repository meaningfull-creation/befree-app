import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logError } from "@/lib/errorLog";
import { sanitizeSubFunctions } from "@/lib/axes";

// PATCH /api/talent/profile
// 認証必須(role=talent)。AI解析を経由せず、人材の基本情報だけを直接更新する。
// body: { name, title, industry, years, careerHistory, experiencedFunctions, experiencedSubAreas, workStyleTags, valueTags, values }
// 職歴・実績の自由記述は careerHistory の1項目に統一した(v5.4)。
// bio は候補カードの紹介文・AI解析の入力として各所から参照されているため、同じ内容を書き込んで互換を保つ。
export async function PATCH(req) {
  try {
    const user = await requireRole("talent");
    if (!user) {
      return NextResponse.json({ error: "実務経験者アカウントでのログインが必要です" }, { status: 401 });
    }
    if (!user.talentId) {
      return NextResponse.json({ error: "先にプロフィールを作成してください" }, { status: 400 });
    }

    const { name, title, industry, years, careerHistory, experiencedFunctions, experiencedSubAreas, workStyleTags, valueTags, values } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "お名前は必須です" }, { status: 400 });
    }

    const talent = await prisma.talent.update({
      where: { id: user.talentId },
      data: {
        name: name.trim(), title, industry, years,
        // 自由記述は1項目。bioにも同じ内容を入れて、候補カード・AI解析側の参照を壊さない。
        ...(careerHistory !== undefined ? { careerHistory, bio: careerHistory } : {}),
        ...(experiencedFunctions !== undefined ? { experiencedFunctions } : {}),
        ...(experiencedSubAreas !== undefined ? { experiencedSubAreas: sanitizeSubFunctions(experiencedSubAreas) } : {}),
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
