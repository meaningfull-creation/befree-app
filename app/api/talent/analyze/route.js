import { NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/claude";
import { clampAxisScores } from "@/lib/axes";
import { buildTalentSystemPrompt, buildTalentAnalysisPrompt } from "@/lib/talentPrompts";

// POST /api/talent/analyze
// body: { talentForm: { name, title, years, summary } }
// returns: { scores, phases, bottlenecks, summary }
export async function POST(req) {
  try {
    const { talentForm } = await req.json();
    if (!talentForm?.name) {
      return NextResponse.json({ error: "talentForm.name is required" }, { status: 400 });
    }

    const result = await callClaudeJSON(buildTalentSystemPrompt(), buildTalentAnalysisPrompt(talentForm));
    const scores = clampAxisScores(result.scores, 30);

    return NextResponse.json({
      scores,
      phases: Array.isArray(result.phases) ? result.phases : [],
      bottlenecks: Array.isArray(result.bottlenecks) ? result.bottlenecks : [],
      summary: result.summary || null,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
