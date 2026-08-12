import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/messages/threads
// 認証必須。ログイン中のユーザー(企業 or 人材)が当事者になっているMatchのうち、
// 会話が始まっている(メッセージが1件以上ある)ものを一覧で返す。
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "company" && user.role !== "talent")) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    let matches = [];
    if (user.role === "company" && user.companyId) {
      matches = await prisma.match.findMany({
        where: { companySkillMap: { companyId: user.companyId }, messages: { some: {} } },
        include: {
          talentSkillMap: { include: { talent: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (user.role === "talent" && user.talentId) {
      matches = await prisma.match.findMany({
        where: { talentSkillMap: { talentId: user.talentId }, messages: { some: {} } },
        include: {
          companySkillMap: { include: { company: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    const threads = matches.map((m) => ({
      matchId: m.id,
      counterpartName: user.role === "company" ? m.talentSkillMap.talent.name : m.companySkillMap.company.name,
      lastMessage: m.messages[0] ? { body: m.messages[0].body, createdAt: m.messages[0].createdAt } : null,
    }));

    return NextResponse.json({ threads });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
