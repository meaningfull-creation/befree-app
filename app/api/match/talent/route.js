import { NextResponse } from "next/server";
import { rankCandidates, scoreMatch } from "@/lib/matching";
import { prisma } from "@/lib/prisma";
import { AXES } from "@/lib/axes";
import { requireRole } from "@/lib/auth";
import { getAxisWeightMultipliers } from "@/lib/axisPerformance";

const AXIS_LABEL_BY_KEY = Object.fromEntries(AXES.map((a) => [a.key, a.label]));

// POST /api/match/talent
// 認証必須(role=talent)。body: { talentScores, talentPhases }
// returns: { candidates: [{ id, name, phase, bottleneck, reason, match }] }  match降順
export async function POST(req) {
  try {
    const user = await requireRole("talent");
    if (!user) {
      return NextResponse.json({ error: "実務経験者アカウントでのログインが必要です" }, { status: 401 });
    }

    const { talentScores, talentPhases } = await req.json();
    if (!talentScores) {
      return NextResponse.json({ error: "talentScores is required" }, { status: 400 });
    }

    // 各企業の最新スキルマップを取得(スキルマップは診断のたびに新規作成する設計のため、直近1件を使う)
    const [companies, axisWeightMultipliers] = await Promise.all([
      prisma.company.findMany({
        include: { skillMaps: { orderBy: { createdAt: "desc" }, take: 1 } },
      }),
      getAxisWeightMultipliers(),
    ]);

    const pool = companies
      .filter((c) => c.skillMaps.length > 0)
      .map((c) => {
        const sm = c.skillMaps[0];
        const axisEntries = Object.entries(sm.axisScores || {});
        const worst = axisEntries.sort((a, b) => a[1] - b[1])[0];
        return {
          id: c.id,
          name: c.name,
          phase: c.phase,
          industry: c.industry,
          headcount: c.headcount,
          revenue: c.revenue,
          bottleneck: worst ? AXIS_LABEL_BY_KEY[worst[0]] || worst[0] : "",
          reason: sm.summary,
          // メッセージを送る前に企業の課題を確認できるよう、診断結果の課題TOP3も返す
          topIssues: (sm.topIssueDetails || []).map((i) => ({
            axisLabel: AXIS_LABEL_BY_KEY[i.axisKey] || i.axisKey,
            currentState: i.currentState,
            priority: i.priority,
          })),
          companyScores: sm.axisScores,
          companySkillMapId: sm.id,
        };
      });

    // 通常はマッチ度30%以上のみ。登録企業がまだ少なく全滅する場合は
    // 上位3社を「参考(適合度は低め)」として返す(lowMatchFallback: true)。
    const ranked = rankCandidates(pool, (c) =>
      scoreMatch(c.companyScores, talentScores, c.phase, talentPhases || [], 6, axisWeightMultipliers)
    , 0);
    const above = ranked.filter((c) => c.match >= 30);
    const lowMatchFallback = above.length === 0 && ranked.length > 0;
    const candidates = above.length > 0 ? above : ranked.slice(0, 3);

    return NextResponse.json({ candidates, lowMatchFallback });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
