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
          years: t.years,
          photoUpdatedAt: t.photoUpdatedAt, // 顔写真の有無(画像本体は /api/talents/[id]/photo から取得)
          experiencedFunctions: t.experiencedFunctions || [],
          workStyleTags: t.workStyleTags || [],
          axis: (sm.bottlenecks && sm.bottlenecks[0]) || "",
          bottleneckTags: sm.bottlenecks || [],
          reason: t.bio,
          axisScores: sm.axisScores,
          phaseTags: sm.phases || [],
          talentSkillMapId: sm.id,
        };
      });

    // まず全員をスコア順に並べ、通常はマッチ度30%以上のみ提案する。
    // 登録人材がまだ少ない時期は全員が30%未満になり「候補ゼロ」となり得るため、
    // その場合は上位3名を「参考(適合度は低め)」として返す(lowMatchFallback: true)。
    // UI側でその旨を正直に表示する — 高く見せかけるのではなく、少ない中での相対順位だと伝える。
    const ranked = rankCandidates(pool, (t) =>
      scoreMatch(companyScores, t.axisScores, companyPhase, t.phaseTags, 6, axisWeightMultipliers)
    , 0);
    const above = ranked.filter((c) => c.match >= 30);
    const lowMatchFallback = above.length === 0 && ranked.length > 0;
    const picked = above.length > 0 ? above : ranked.slice(0, 3);

    const candidates = picked.map((c) => ({
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

    return NextResponse.json({ candidates, lowMatchFallback });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
