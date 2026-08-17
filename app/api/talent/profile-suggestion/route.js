import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { generateProfileSuggestions } from "@/lib/profileSuggestion";
import { logError } from "@/lib/errorLog";

// POST /api/talent/profile-suggestion
// 認証必須(role=talent)。都度生成する方式(保存はしない)。
export async function POST() {
  try {
    const user = await requireRole("talent");
    if (!user) return NextResponse.json({ error: "実務経験者アカウントでのログインが必要です" }, { status: 401 });
    if (!user.talentId) return NextResponse.json({ error: "先にスキルマップを作成してください" }, { status: 400 });

    const suggestions = await generateProfileSuggestions(user.talentId);
    if (!suggestions) {
      return NextResponse.json({ error: "改善案の生成に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ suggestions });
  } catch (e) {
    await logError("api/talent/profile-suggestion", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
