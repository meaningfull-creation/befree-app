import { NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/claude";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AXES } from "@/lib/axes";
import { logError } from "@/lib/errorLog";
import { buildDialogSystemPrompt, buildAxisDeepDivePrompt, buildAxisDeepDiveSummaryPrompt } from "@/lib/dialoguePrompts";

const MAX_DEEP_DIVE_TURNS = 3; // 深掘りは短く3問まで
const AXIS_LABEL_BY_KEY = Object.fromEntries(AXES.map((a) => [a.key, a.label]));

// POST /api/diagnosis/axis-deep-dive
// 認証は必須ではない(未ログインの/diagnoseフローでも使えるようにするため)。
// 企業アカウントでログイン済み、かつcompanySkillMapIdが渡された場合のみ、
// 深掘り結果(更新後のスコア・分析コメント)をDBに反映する。
// body: { companyForm, axisKey, currentScore, currentNote, history: [{q,a}], companySkillMapId? }
export async function POST(req) {
  try {
    const { companyForm, axisKey, currentScore, currentNote, history, companySkillMapId } = await req.json();
    const axisLabel = AXIS_LABEL_BY_KEY[axisKey];
    if (!companyForm?.name || !axisLabel || !Array.isArray(history)) {
      return NextResponse.json({ error: "companyForm, axisKey, history are required" }, { status: 400 });
    }

    if (history.length < MAX_DEEP_DIVE_TURNS) {
      const result = await callClaudeJSON(
        buildDialogSystemPrompt(),
        buildAxisDeepDivePrompt(companyForm, axisLabel, currentNote, history),
        600
      );
      return NextResponse.json({
        done: false,
        question: result.question,
        options: (result.options || []).slice(0, 4),
        reflection: result.reflection || null,
      });
    }

    const result = await callClaudeJSON(
      buildDialogSystemPrompt(),
      buildAxisDeepDiveSummaryPrompt(companyForm, axisLabel, currentScore, currentNote, history),
      500
    );
    const newScore = Number.isFinite(Number(result.score)) ? Math.max(0, Math.min(100, Math.round(Number(result.score)))) : currentScore;
    const newNote = typeof result.note === "string" ? result.note.slice(0, 300) : currentNote;

    // ログイン中の企業アカウントかつ対象のスキルマップが自分のものである場合のみDBに反映する
    if (companySkillMapId) {
      try {
        const user = await getCurrentUser();
        if (user?.role === "company" && user.companyId) {
          const skillMap = await prisma.companySkillMap.findUnique({ where: { id: companySkillMapId } });
          if (skillMap && skillMap.companyId === user.companyId) {
            await prisma.companySkillMap.update({
              where: { id: companySkillMapId },
              data: {
                axisScores: { ...skillMap.axisScores, [axisKey]: newScore },
                axisNotes: { ...(skillMap.axisNotes || {}), [axisKey]: newNote },
              },
            });
          }
        }
      } catch (persistErr) {
        console.error("failed to persist axis deep-dive result:", persistErr.message);
      }
    }

    return NextResponse.json({ done: true, score: newScore, note: newNote });
  } catch (e) {
    await logError("api/diagnosis/axis-deep-dive", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
