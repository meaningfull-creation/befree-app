import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/messages/unread-count
// 認証必須。ログイン中のユーザー宛の未読メッセージ総数を返す。
// ナビゲーションの「メッセージ」バッジ表示に使う(クライアントが定期ポーリングする)。
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "company" && user.role !== "talent")) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const matchScope =
      user.role === "company"
        ? { companySkillMap: { companyId: user.companyId ?? "__none__" } }
        : { talentSkillMap: { talentId: user.talentId ?? "__none__" } };

    const count = await prisma.message.count({
      where: { readAt: null, NOT: { senderId: user.id }, match: matchScope },
    });

    return NextResponse.json({ count });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
