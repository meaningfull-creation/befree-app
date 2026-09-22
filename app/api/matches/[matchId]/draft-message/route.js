import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMatchIfAuthorized } from "@/lib/matchAccess";
import { generateOutreachMessage } from "@/lib/messageDraft";

// AI呼び出しを含むため、Vercelの関数タイムアウトに余裕を持たせる
export const maxDuration = 60;

// POST /api/matches/[matchId]/draft-message
// 認証必須(そのマッチの当事者)。まだメッセージが1件もないスレッドに対して、
// 最初のあいさつメッセージのAI下書きを生成して返す。
// 「メッセージを送る」ボタンの応答を速くするため、/api/matches/connect から
// 切り出して非同期に呼ばれる(画面遷移をブロックしない)。
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getMatchIfAuthorized(params.matchId, user);
  if (!authorized) return NextResponse.json({ error: "アクセス権がありません" }, { status: 403 });
  if (authorized.myRole === "admin") return NextResponse.json({ draftMessage: null });

  // 既に会話が始まっている場合は下書きを作らない(上書き防止)
  const existingMessageCount = await prisma.message.count({ where: { matchId: params.matchId } });
  if (existingMessageCount > 0) {
    return NextResponse.json({ draftMessage: null });
  }

  try {
    const draftMessage = await generateOutreachMessage({
      companySkillMap: authorized.match.companySkillMap,
      talentSkillMap: authorized.match.talentSkillMap,
      senderRole: authorized.myRole,
    });
    return NextResponse.json({ draftMessage });
  } catch (e) {
    return NextResponse.json({ draftMessage: null, error: e.message }, { status: 200 });
  }
}
