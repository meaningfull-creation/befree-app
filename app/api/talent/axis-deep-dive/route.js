import { NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/claude";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AXES } from "@/lib/axes";
import { logError } from "@/lib/errorLog";
import {
  buildTalentDialogSystemPrompt,
  buildTalentAxisDeepDivePrompt,
  buildTalentAxisDeepDiveSummaryPrompt,
} from "@/lib/talentDialoguePrompts";

const MAX_DEEP_DIVE_TURNS = 3; // 深掘りは短く3問まで
const AXIS_LABEL_BY_KEY = Object.fromEntries(AXES.map((a) => [a.key, a.label]));

// POST /api/talent/axis-deep-dive
// 認証は必須ではない(未ログインの/joinフローでも使えるようにするため)。
// 実務経験者アカウントでログイン済み、かつtalentSkillMapIdが渡された場合のみ、
// 深掘り結果(更新後のスコア・分析コメント)をDBに反映する。
// body: { talentForm, axisKey, currentScore, currentNote, history: [{q,a}], talentSkillMapId? }
export async function POST(req) {
  try {
    const { talentForm, axisKey, currentScore, currentNote, history, talentSkillMapId } = await req.json();
    const axisLabel = AXIS_LABEL_BY_KEY[axisKey];
    if (!talentForm?.name || !axisLabel || !Array.isArray(history)) {
      return NextResponse.json({ error: "talentForm, axisKey, history are required" }, { status: 400 });
    }

    if (history.length < MAX_DEEP_DIVE_TURNS) {
      const result = await callClaudeJSON(
        buildTalentDialogSystemPrompt(),
        buildTalentAxisDeepDivePrompt(talentForm, axisLabel, currentNote, history),
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
      buildTalentDialogSystemPrompt(),
      buildTalentAxisDeepDiveSummaryPrompt(talentForm, axisLabel, currentScore, currentNote, history),
      500
    );
    const newScore = Number.isFinite(Number(result.score)) ? Math.max(0, Math.min(30, Math.round(Number(result.score)))) : currentScore;
    const newNote = typeof result.note === "string" ? result.note.slice(0, 300) : currentNote;

    if (talentSkillMapId) {
      try {
        const user = await getCurrentUser();
        if (user?.role === "talent" && user.talentId) {
          const skillMap = await prisma.talentSkillMap.findUnique({ where: { id: talentSkillMapId } });
          if (skillMap && skillMap.talentId === user.talentId) {
            await prisma.talentSkillMap.update({
              where: { id: talentSkillMapId },
              data: { axisScores: { ...skillMap.axisScores, [axisKey]: newScore } },
            });
          }
        }
      } catch (persistErr) {
        console.error("failed to persist talent axis deep-dive result:", persistErr.message);
      }
    }

    return NextResponse.json({ done: true, score: newScore, note: newNote });
  } catch (e) {
    await logError("api/talent/axis-deep-dive", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
