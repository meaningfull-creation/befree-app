import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AXES } from "@/lib/axes";
import { rankCandidates, scoreMatch } from "@/lib/matching";
import { getActiveEngagementCountByTalent, isTalentAvailable } from "@/lib/capacity";
import { getAxisWeightMultipliers } from "@/lib/axisPerformance";

const AXIS_LABEL_BY_KEY = Object.fromEntries(AXES.map((a) => [a.key, a.label]));
const REDIAGNOSIS_INTERVAL_DAYS = 90; // 「3ヶ月後に再診断」という利用フローに合わせた目安

function daysBetween(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function summarizeProject(p, viewerRole) {
  const doneTasks = p.tasks.filter((t) => t.status === "done").length;
  const kpiOnTrack = p.kpis.filter((k) => k.targetValue != null && k.currentValue != null && k.currentValue >= k.targetValue).length;
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    targetAxisLabel: p.targetAxis ? AXIS_LABEL_BY_KEY[p.targetAxis] : null,
    currentMonthGoal: p.currentMonthGoal,
    counterpartName: viewerRole === "company" ? p.engagement.match.talentSkillMap.talent.name : p.engagement.match.companySkillMap.company.name,
    taskCount: p.tasks.length,
    doneTaskCount: doneTasks,
    kpiCount: p.kpis.length,
    kpiOnTrackCount: kpiOnTrack,
  };
}

// GET /api/dashboard
// 認証必須。企業/人材それぞれのダッシュボードに必要な情報(スコア・進行中プロジェクト・
// 推奨マッチ・次回再診断の目安等)を1回のリクエストで集約して返す。
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  if (user.role === "company") {
    if (!user.companyId) return NextResponse.json({ role: "company", hasData: false });

    const [company, latestSkillMap, projects, axisWeightMultipliers, activeCountByTalent] = await Promise.all([
      prisma.company.findUnique({ where: { id: user.companyId } }),
      prisma.companySkillMap.findFirst({ where: { companyId: user.companyId }, orderBy: { createdAt: "desc" } }),
      prisma.project.findMany({
        where: { engagement: { match: { companySkillMap: { companyId: user.companyId } } }, status: "active" },
        include: {
          engagement: { include: { match: { include: { companySkillMap: { include: { company: true } }, talentSkillMap: { include: { talent: true } } } } } },
          tasks: true,
          kpis: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      getAxisWeightMultipliers(),
      getActiveEngagementCountByTalent(),
    ]);

    if (!latestSkillMap) return NextResponse.json({ role: "company", hasData: false });

    const talents = await prisma.talent.findMany({
      where: { status: "approved" },
      include: { skillMaps: { orderBy: { createdAt: "desc" }, take: 1 }, capacity: true },
    });
    const pool = talents
      .filter((t) => t.skillMaps.length > 0 && isTalentAvailable(t, activeCountByTalent))
      .map((t) => ({ id: t.id, name: t.name, role: t.title, axisScores: t.skillMaps[0].axisScores, phaseTags: t.skillMaps[0].phases || [] }));
    const topMatches = rankCandidates(pool, (t) => scoreMatch(latestSkillMap.axisScores, t.axisScores, company.phase, t.phaseTags, 6, axisWeightMultipliers)).slice(0, 2);

    const daysSince = daysBetween(new Date(latestSkillMap.createdAt), new Date());

    return NextResponse.json({
      role: "company",
      hasData: true,
      companyName: company.name,
      overallScore: Math.round(AXES.reduce((s, a) => s + (latestSkillMap.axisScores[a.key] || 0), 0) / AXES.length),
      topIssues: (latestSkillMap.topIssueDetails || []).map((i) => ({ ...i, axisLabel: AXIS_LABEL_BY_KEY[i.axisKey] || i.axisKey })),
      topMatches: topMatches.map((t) => ({ id: t.id, name: t.name, role: t.role, match: t.match })),
      projects: projects.map((p) => summarizeProject(p, "company")),
      diagnosedAt: latestSkillMap.createdAt,
      daysSinceDiagnosis: daysSince,
      rediagnosisRecommended: daysSince >= REDIAGNOSIS_INTERVAL_DAYS,
      rediagnosisIntervalDays: REDIAGNOSIS_INTERVAL_DAYS,
    });
  }

  if (user.role === "talent") {
    if (!user.talentId) return NextResponse.json({ role: "talent", hasData: false });

    const [talent, latestSkillMap, projects, axisWeightMultipliers] = await Promise.all([
      prisma.talent.findUnique({ where: { id: user.talentId } }),
      prisma.talentSkillMap.findFirst({ where: { talentId: user.talentId }, orderBy: { createdAt: "desc" } }),
      prisma.project.findMany({
        where: { engagement: { match: { talentSkillMap: { talentId: user.talentId } } }, status: "active" },
        include: {
          engagement: { include: { match: { include: { companySkillMap: { include: { company: true } }, talentSkillMap: { include: { talent: true } } } } } },
          tasks: true,
          kpis: true,
          workLogs: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      getAxisWeightMultipliers(),
    ]);

    if (!latestSkillMap) return NextResponse.json({ role: "talent", hasData: false });

    const ratings = await prisma.talentRating.findMany({
      where: { project: { engagement: { match: { talentSkillMap: { talentId: user.talentId } } } } },
    });
    const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10 : null;

    const companies = await prisma.company.findMany({ include: { skillMaps: { orderBy: { createdAt: "desc" }, take: 1 } } });
    const pool = companies
      .filter((c) => c.skillMaps.length > 0)
      .map((c) => ({ id: c.id, name: c.name, phase: c.phase, axisScores: c.skillMaps[0].axisScores }));
    const topMatches = rankCandidates(pool, (c) => scoreMatch(c.axisScores, latestSkillMap.axisScores, c.phase, latestSkillMap.phases || [], 6, axisWeightMultipliers)).slice(0, 2);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyHours = projects.reduce((sum, p) => sum + p.workLogs.filter((w) => new Date(w.loggedAt) >= monthStart).reduce((s, w) => s + w.hours, 0), 0);
    const upcomingTasks = projects.flatMap((p) =>
      p.tasks.filter((t) => t.status !== "done").map((t) => ({ ...t, projectName: p.name, companyName: p.engagement.match.companySkillMap.company.name }))
    );

    return NextResponse.json({
      role: "talent",
      hasData: true,
      talentName: talent.name,
      status: talent.status,
      scores: latestSkillMap.axisScores,
      bottlenecks: latestSkillMap.bottlenecks,
      topMatches: topMatches.map((c) => ({ id: c.id, name: c.name, phase: c.phase, match: c.match })),
      projects: projects.map((p) => summarizeProject(p, "talent")),
      monthlyHours: Math.round(monthlyHours * 10) / 10,
      upcomingTasks: upcomingTasks.slice(0, 6),
      avgRating,
      ratingCount: ratings.length,
    });
  }

  return NextResponse.json({ error: "unsupported role" }, { status: 400 });
}
