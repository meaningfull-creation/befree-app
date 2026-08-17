import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { scoreMatch } from "@/lib/matching";
import { getAxisWeightMultipliers } from "@/lib/axisPerformance";
import { generateOutreachMessage } from "@/lib/messageDraft";

// POST /api/matches/connect
// 認証必須。企業ユーザーは { talentSkillMapId } を、実務経験者ユーザーは { companySkillMapId } を渡す。
// 呼び出し側の最新スキルマップと組み合わせてMatchを作成(既存なら再利用)し、メッセージスレッドの起点にする。
// 初めての接続(まだメッセージが1件もない)場合、企業の課題内容を反映した初回メッセージの下書きも
// AIに生成させて返す(送信ボタンを押すだけで送れるようにするための下書き。実際の送信はユーザー操作が必要)。
// returns: { matchId, counterpartName, draftMessage }
export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "company" && user.role !== "talent")) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const body = await req.json();
    const axisWeightMultipliers = await getAxisWeightMultipliers();

    let companySkillMap, talentSkillMap, matchScore;

    if (user.role === "company") {
      if (!user.companyId) return NextResponse.json({ error: "先に課題診断を完了してください" }, { status: 400 });
      const talentSkillMapId = body.talentSkillMapId;
      if (!talentSkillMapId) return NextResponse.json({ error: "talentSkillMapId is required" }, { status: 400 });

      [companySkillMap, talentSkillMap] = await Promise.all([
        prisma.companySkillMap.findFirst({ where: { companyId: user.companyId }, orderBy: { createdAt: "desc" }, include: { company: true } }),
        prisma.talentSkillMap.findUnique({ where: { id: talentSkillMapId }, include: { talent: true } }),
      ]);
      if (!companySkillMap || !talentSkillMap) {
        return NextResponse.json({ error: "スキルマップが見つかりません" }, { status: 404 });
      }
      if (talentSkillMap.talent.status !== "approved") {
        return NextResponse.json({ error: "この人材はまだ審査中です" }, { status: 403 });
      }
      matchScore = scoreMatch(companySkillMap.axisScores, talentSkillMap.axisScores, companySkillMap.company?.phase, talentSkillMap.phases || [], 6, axisWeightMultipliers);
    } else {
      if (!user.talentId) return NextResponse.json({ error: "先にスキルマップを作成してください" }, { status: 400 });
      const companySkillMapId = body.companySkillMapId;
      if (!companySkillMapId) return NextResponse.json({ error: "companySkillMapId is required" }, { status: 400 });

      [talentSkillMap, companySkillMap] = await Promise.all([
        prisma.talentSkillMap.findFirst({ where: { talentId: user.talentId }, orderBy: { createdAt: "desc" }, include: { talent: true } }),
        prisma.companySkillMap.findUnique({ where: { id: companySkillMapId }, include: { company: true } }),
      ]);
      if (!talentSkillMap || !companySkillMap) {
        return NextResponse.json({ error: "スキルマップが見つかりません" }, { status: 404 });
      }
      matchScore = scoreMatch(companySkillMap.axisScores, talentSkillMap.axisScores, companySkillMap.company?.phase, talentSkillMap.phases || [], 6, axisWeightMultipliers);
    }

    const match = await prisma.match.upsert({
      where: { companySkillMapId_talentSkillMapId: { companySkillMapId: companySkillMap.id, talentSkillMapId: talentSkillMap.id } },
      update: {},
      create: { companySkillMapId: companySkillMap.id, talentSkillMapId: talentSkillMap.id, matchScore, status: "proposed" },
    });

    const counterpartName = user.role === "company" ? talentSkillMap.talent.name : companySkillMap.company.name;

    // 既にやり取りが始まっているスレッドには下書きを差し込まない(初回接続時のみ生成する)
    let draftMessage = null;
    const existingMessageCount = await prisma.message.count({ where: { matchId: match.id } });
    if (existingMessageCount === 0) {
      draftMessage = await generateOutreachMessage({ companySkillMap, talentSkillMap, senderRole: user.role });
    }

    return NextResponse.json({ matchId: match.id, counterpartName, draftMessage });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
