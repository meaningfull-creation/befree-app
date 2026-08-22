import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMatchIfAuthorized } from "@/lib/matchAccess";
import { AXES } from "@/lib/axes";

// GET /api/matches/[matchId]/context
// 認証必須。そのMatchの当事者(企業側/人材側/管理者)のみアクセス可能。
// 自分が人材の場合は相手企業のGrowth Map・課題を、自分が企業の場合は相手人材の経歴・スキルマップを返す。
// 「メッセージを受け取ったが、相手がどんな状況か分からず判断材料が少ない」という声を受けて追加。
export async function GET(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

    const authorized = await getMatchIfAuthorized(params.matchId, user);
    if (!authorized) return NextResponse.json({ error: "アクセス権がありません" }, { status: 403 });

    const { match, myRole } = authorized;
    const viewerRole = myRole === "admin" ? "company" : myRole; // 管理者には企業視点の情報を返す

    if (viewerRole === "talent") {
      const company = match.companySkillMap.company;
      const sm = match.companySkillMap;
      const topIssues = (sm.topIssueDetails || []).map((d) => ({
        ...d,
        axisLabel: AXES.find((a) => a.key === d.axisKey)?.label || d.axisKey,
      }));
      return NextResponse.json({
        role: "company",
        name: company.name,
        industry: company.industry,
        headcount: company.headcount,
        phase: company.phase,
        revenue: company.revenue,
        scores: sm.axisScores,
        axisNotes: sm.axisNotes,
        topIssues,
        summary: sm.summary,
      });
    }

    const talent = match.talentSkillMap.talent;
    const sm = match.talentSkillMap;
    return NextResponse.json({
      role: "talent",
      name: talent.name,
      title: talent.title,
      industry: talent.industry,
      years: talent.years,
      bio: talent.bio,
      scores: sm.axisScores,
      bottlenecks: sm.bottlenecks,
      phases: sm.phases,
      summary: sm.summary,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
