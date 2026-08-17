import { NextResponse } from "next/server";
import { rankCandidates, scoreMatch } from "@/lib/matching";
import { computeMatchBreakdown } from "@/lib/matchBreakdown";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getActiveEngagementCountByTalent, isTalentAvailable } from "@/lib/capacity";
import { getAxisWeightMultipliers } from "@/lib/axisPerformance";

// POST /api/match/company
// 認証必須(role=company)。body: { companyScores, companyPhase, companyIndustry }
// returns: { candidates: [{ id, name, role, axis, bottleneckTags, reason, match, breakdown }] }  match降順、稼働上限に達した人材は除外
export async function POST(req) {
  try {
    const user = await requireRole("company");
    if (!user) {
      return NextResponse.json({ error: "企業アカウントでのログインが必要です" }, { status: 401 });
    }

    const { companyScores, companyPhase, companyIndustry } = await req.json();
    if (!companyScores) {
      return NextResponse.json({ error: "companyScores is required" }, { status: 400 });
    }

    // 各人材の最新スキルマップを取得(スキルマップは履歴を残す設計のため、直近1件を使う)
    const [talents, activeCountByTalent, axisWeightMultipliers] = await Promise.all([
      prisma.talent.findMany({
        where: { status: "approved" },
        include: { skillMaps: { orderBy: { createdAt: "desc" }, take: 1 }, capacity: true },
      }),
      getActiveEngagementCountByTalent(),
      getAxisWeightMultipliers(),
    ]);

    const pool = talents
      .filter((t) => t.skillMaps.length > 0 && isTalentAvailable(t, activeCountByTalent))
      .map((t) => {
        const sm = t.skillMaps[0];
        return {
          id: t.id,
          name: t.name,
          role: t.title,
          industry: t.industry,
          axis: (sm.bottlenecks && sm.bottlenecks[0]) || "",
          bottleneckTags: sm.bottlenecks || [],
          reason: t.bio,
          axisScores: sm.axisScores,
          phaseTags: sm.phases || [],
          talentSkillMapId: sm.id,
        };
      });

    const candidates = rankCandidates(pool, (t) =>
      scoreMatch(companyScores, t.axisScores, companyPhase, t.phaseTags, 6, axisWeightMultipliers)
    ).map((c) => ({
      ...c,
      breakdown: computeMatchBreakdown({
        companyScores,
        talentScores: c.axisScores,
        companyPhase,
        companyIndustry,
        talentPhaseTags: c.phaseTags,
        talentIndustry: c.industry,
        isAvailable: true, // ここに到達している時点で足切りは通過済み
      }).breakdown,
    }));

    return NextResponse.json({ candidates });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
