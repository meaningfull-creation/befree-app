import { NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/claude";
import { buildDialogSystemPrompt, buildDialogNextQuestionPrompt } from "@/lib/dialoguePrompts";

// POST /api/diagnosis/start
// body: { companyForm: { name, industry, headcount, phase, revenue } }
// returns: { question, options }
export async function POST(req) {
  try {
    const { companyForm } = await req.json();
    if (!companyForm?.name) {
      return NextResponse.json({ error: "companyForm.name is required" }, { status: 400 });
    }

    const result = await callClaudeJSON(
      buildDialogSystemPrompt(),
      buildDialogNextQuestionPrompt(companyForm, [])
    );

    return NextResponse.json({
      question: result.question,
      options: (result.options || []).slice(0, 3),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
