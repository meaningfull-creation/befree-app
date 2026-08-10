import { NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/claude";
import { clampAxisScores } from "@/lib/axes";
import {
  buildDialogSystemPrompt,
  buildDialogNextQuestionPrompt,
  buildDialogScorePrompt,
  MAX_DIALOG_TURNS,
} from "@/lib/dialoguePrompts";

// POST /api/diagnosis/answer
// body: { companyForm, history: [{q, a}] }  … history は直近の回答まで含めた状態で渡す
// returns: { question, options } または { done: true, scores, summary }
export async function POST(req) {
  try {
    const { companyForm, history } = await req.json();
    if (!companyForm?.name || !Array.isArray(history)) {
      return NextResponse.json({ error: "companyForm and history are required" }, { status: 400 });
    }

    if (history.length < MAX_DIALOG_TURNS) {
      const result = await callClaudeJSON(
        buildDialogSystemPrompt(),
        buildDialogNextQuestionPrompt(companyForm, history)
      );
      return NextResponse.json({
        done: false,
        question: result.question,
        options: (result.options || []).slice(0, 3),
      });
    }

    const result = await callClaudeJSON(buildDialogSystemPrompt(), buildDialogScorePrompt(companyForm, history));
    const scores = clampAxisScores(result.scores, 100);
    return NextResponse.json({ done: true, scores, summary: result.summary || null });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
