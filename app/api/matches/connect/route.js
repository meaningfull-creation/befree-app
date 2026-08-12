import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { scoreMatch } from "@/lib/matching";
import { getAxisWeightMultipliers } from "@/lib/axisPerformance";

// POST /api/matches/connect
// 認証必須。企業ユーザーは { talentSkillMapId } を、実務経験者ユーザーは { companySkillMapId } を渡す。
// 呼び出し側の最新スキルマップと組み合わせてMatchを作成(既存なら再利用)し、メッセージスレッドの起点にする。
// returns: { matchId, counterpartName }
export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "company" && user.role !== "talent")) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const body = await req.json();
    const axisWeightMultipliers = await getAxisWeightMultipliers();

    let companySkillMapId, talentSkillMapId, matchScore, counterpartName;

    if (user.role === "company") {
      if (!user.companyId) return NextResponse.json({ error: "先に課題診断を完了してください" }, { status: 400 });
      talentSkillMapId = body.talentSkillMapId;
      if (!talentSkillMapId) return NextResponse.json({ error: "talentSkillMapId is required" }, { status: 400 });

      const [companySkillMap, talentSkillMap] = await Promise.all([
        prisma.companySkillMap.findFirst({ where: { companyId: user.companyId }, orderBy: { createdAt: "desc" } }),
        prisma.talentSkillMap.findUnique({ where: { id: talentSkillMapId }, include: { talent: true } }),
      ]);
      if (!companySkillMap || !talentSkillMap) {
        return NextResponse.json({ error: "スキルマップが見つかりません" }, { status: 404 });
      }
      if (talentSkillMap.talent.status !== "approved") {
        return NextResponse.json({ error: "この人材はまだ審査中です" }, { status: 403 });
      }
      companySkillMapId = companySkillMap.id;
      matchScore = scoreMatch(companySkillMap.axisScores, talentSkillMap.axisScores, user.company?.phase, talentSkillMap.phases || [], 6, axisWeightMultipliers);
      counterpartName = talentSkillMap.talent.name;
    } else {
      if (!user.talentId) return NextResponse.json({ error: "先にスキルマップを作成してください" }, { status: 400 });
      companySkillMapId = body.companySkillMapId;
      if (!companySkillMapId) return NextResponse.json({ error: "companySkillMapId is required" }, { status: 400 });

      const [talentSkillMap, companySkillMap] = await Promise.all([
        prisma.talentSkillMap.findFirst({ where: { talentId: user.talentId }, orderBy: { createdAt: "desc" } }),
        prisma.companySkillMap.findUnique({ where: { id: companySkillMapId }, include: { company: true } }),
      ]);
      if (!talentSkillMap || !companySkillMap) {
        return NextResponse.json({ error: "スキルマップが見つかりません" }, { status: 404 });
      }
      talentSkillMapId = talentSkillMap.id;
      matchScore = scoreMatch(companySkillMap.axisScores, talentSkillMap.axisScores, companySkillMap.company?.phase, talentSkillMap.phases || [], 6, axisWeightMultipliers);
      counterpartName = companySkillMap.company.name;
    }

    const match = await prisma.match.upsert({
      where: { companySkillMapId_talentSkillMapId: { companySkillMapId, talentSkillMapId } },
      update: {},
      create: { companySkillMapId, talentSkillMapId, matchScore, status: "proposed" },
    });

    return NextResponse.json({ matchId: match.id, counterpartName });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
