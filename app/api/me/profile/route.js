import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/me/profile
// 認証必須。ログイン中のアカウントに既存のスキルマップがあれば返す(「マイページ」表示用)。
// 初回登録でまだ何も診断/解析していない場合は hasData: false を返す。
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  if (user.role === "company") {
    if (!user.companyId) return NextResponse.json({ role: "company", hasData: false });

    const [company, latest] = await Promise.all([
      prisma.company.findUnique({ where: { id: user.companyId } }),
      prisma.companySkillMap.findFirst({ where: { companyId: user.companyId }, orderBy: { createdAt: "desc" } }),
    ]);

    if (!latest) return NextResponse.json({ role: "company", hasData: false });

    return NextResponse.json({
      role: "company",
      hasData: true,
      companyForm: {
        name: company.name,
        industry: company.industry,
        headcount: company.headcount,
        fundingType: company.fundingType,
        phase: company.phase,
        revenue: company.revenue,
      },
      scores: latest.axisScores,
      axisNotes: latest.axisNotes,
      topIssueDetails: latest.topIssueDetails,
      summary: latest.summary,
      diagnosedAt: latest.createdAt,
      companySkillMapId: latest.id,
    });
  }

  if (user.role === "talent") {
    if (!user.talentId) return NextResponse.json({ role: "talent", hasData: false });

    const [talent, latest] = await Promise.all([
      prisma.talent.findUnique({ where: { id: user.talentId } }),
      prisma.talentSkillMap.findFirst({ where: { talentId: user.talentId }, orderBy: { createdAt: "desc" } }),
    ]);

    if (!latest) return NextResponse.json({ role: "talent", hasData: false });

    return NextResponse.json({
      role: "talent",
      hasData: true,
      talentId: talent.id,
      photoUpdatedAt: talent.photoUpdatedAt, // 顔写真の有無と、差し替え時のキャッシュ破棄に使う
      talentForm: {
        name: talent.name,
        title: talent.title,
        industry: talent.industry,
        years: talent.years,
        summary: talent.bio,
        // v5.4で自由記述をcareerHistoryに一本化。それ以前のデータはbioにしか入っていないため、
        // 未設定の場合はbioを初期値として見せる(保存時に両方へ書き込まれて揃う)。
        careerHistory: talent.careerHistory || talent.bio || "",
        experiencedFunctions: talent.experiencedFunctions || [],
        experiencedSubAreas: talent.experiencedSubAreas || [],
        workStyleTags: talent.workStyleTags || [],
        valueTags: talent.valueTags || [],
        values: talent.values,
      },
      status: talent.status,
      scores: latest.axisScores,
      phases: latest.phases,
      bottlenecks: latest.bottlenecks,
      growthAreas: latest.growthAreas,
      industryFit: latest.industryFit || [], // 経験を活かせる業界の候補
      axisEvidence: latest.axisEvidence || {}, // 軸ごとの採点根拠
      summary: latest.summary,
      diagnosedAt: latest.createdAt,
      talentSkillMapId: latest.id,
    });
  }

  return NextResponse.json({ error: "unsupported role" }, { status: 400 });
}
