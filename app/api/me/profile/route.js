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
        phase: company.phase,
        revenue: company.revenue,
      },
      scores: latest.axisScores,
      axisNotes: latest.axisNotes,
      topIssueDetails: latest.topIssueDetails,
      summary: latest.summary,
      diagnosedAt: latest.createdAt,
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
      talentForm: {
        name: talent.name,
        title: talent.title,
        industry: talent.industry,
        years: talent.years,
      },
      status: talent.status,
      scores: latest.axisScores,
      phases: latest.phases,
      bottlenecks: latest.bottlenecks,
      summary: latest.summary,
      diagnosedAt: latest.createdAt,
    });
  }

  return NextResponse.json({ error: "unsupported role" }, { status: 400 });
}
