import { NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/claude";
import { logError } from "@/lib/errorLog";
import { buildTalentDialogSystemPrompt, buildTalentDialogNextQuestionPrompt } from "@/lib/talentDialoguePrompts";

// AI呼び出しを含むため、Vercelの関数タイムアウトに余裕を持たせる
export const maxDuration = 60;

// POST /api/talent/dialogue/start
// 認証は必須ではない(未ログインの/joinフローでも使えるようにするため)。
// body: { talentForm }
// returns: { question, options, axis, reflection }
export async function POST(req) {
  try {
    const { talentForm } = await req.json();
    if (!talentForm?.name) {
      return NextResponse.json({ error: "talentForm.name is required" }, { status: 400 });
    }

    const result = await callClaudeJSON(
      buildTalentDialogSystemPrompt(),
      buildTalentDialogNextQuestionPrompt(talentForm, []),
      700,
      { fast: true } // 対話の1問は高速モデルで返し、体感速度を優先する
    );

    return NextResponse.json({
      question: result.question,
      options: (result.options || []).slice(0, 4),
      axis: result.axis || null,
      reflection: result.reflection || null,
    });
  } catch (e) {
    await logError("api/talent/dialogue/start", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
