import { NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/claude";
import { clampAxisScores, sanitizeGrowthAreas } from "@/lib/axes";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/errorLog";
import {
  buildTalentDialogSystemPrompt,
  buildTalentDialogNextQuestionPrompt,
  buildTalentDialogScorePrompt,
  MAX_TALENT_DIALOG_TURNS,
} from "@/lib/talentDialoguePrompts";

// POST /api/talent/dialogue/answer
// 認証は必須ではない(未ログインでも自己分析対話を進められる)。
// 実務経験者アカウントでログイン済みの場合のみ、最終ターンでその場でDB保存する。
// body: { talentForm, history: [{q,a,axis}] }
// returns: { question, options, axis, reflection } または
//          { done: true, scores, phases, bottlenecks, growthAreas, summary, talentId, talentSkillMapId }
export async function POST(req) {
  try {
    const user = await getCurrentUser();
    const isTalentUser = !!(user && user.role === "talent");

    const { talentForm, history } = await req.json();
    if (!talentForm?.name || !Array.isArray(history)) {
      return NextResponse.json({ error: "talentForm and history are required" }, { status: 400 });
    }

    if (history.length < MAX_TALENT_DIALOG_TURNS) {
      const result = await callClaudeJSON(
        buildTalentDialogSystemPrompt(),
        buildTalentDialogNextQuestionPrompt(talentForm, history),
        700
      );
      return NextResponse.json({
        done: false,
        question: result.question,
        options: (result.options || []).slice(0, 4),
        axis: result.axis || null,
        reflection: result.reflection || null,
      });
    }

    // 最終スコアリング。10軸のscores・phases・bottlenecks・growthAreas・summaryを一度に
    // 出力させるため応答が大きくなる。対話ターンが多いほど入力も長くなるため余裕を持たせる。
    const result = await callClaudeJSON(buildTalentDialogSystemPrompt(), buildTalentDialogScorePrompt(talentForm, history), 3500);
    const scores = clampAxisScores(result.scores, 30);
    const phases = Array.isArray(result.phases) ? result.phases : [];
    const bottlenecks = Array.isArray(result.bottlenecks) ? result.bottlenecks : [];
    const growthAreas = sanitizeGrowthAreas(result.growthAreas);
    const experiencedFunctions = Array.isArray(talentForm.experiencedFunctions) ? talentForm.experiencedFunctions : [];
    const workStyleTags = Array.isArray(talentForm.workStyleTags) ? talentForm.workStyleTags : [];
    const valueTags = Array.isArray(talentForm.valueTags) ? talentForm.valueTags : [];

    let talentId = isTalentUser ? user.talentId : null;
    let talentSkillMapId = null;
    let talentStatus = "pending";
    if (isTalentUser) {
      try {
        if (talentId) {
          const skillMap = await prisma.talentSkillMap.create({
            data: { talentId, axisScores: scores, phases, bottlenecks, growthAreas, summary: result.summary || null },
          });
          const updated = await prisma.talent.update({
            where: { id: talentId },
            data: {
              title: talentForm.title,
              industry: talentForm.industry || null,
              years: talentForm.years,
              bio: talentForm.summary || null,
              experiencedFunctions,
              workStyleTags,
              valueTags,
              values: talentForm.values || null,
            },
          });
          talentSkillMapId = skillMap.id;
          talentStatus = updated.status;
        } else {
          const talent = await prisma.talent.create({
            data: {
              name: talentForm.name,
              title: talentForm.title,
              industry: talentForm.industry || null,
              years: talentForm.years,
              bio: talentForm.summary || null,
              experiencedFunctions,
              workStyleTags,
              valueTags,
              values: talentForm.values || null,
              skillMaps: { create: [{ axisScores: scores, phases, bottlenecks, growthAreas, summary: result.summary || null }] },
              capacity: { create: { maxConcurrentEngagements: 3, currentCommittedHours: 0 } },
            },
            include: { skillMaps: true },
          });
          talentId = talent.id;
          talentSkillMapId = talent.skillMaps[0]?.id || null;
          talentStatus = talent.status;
          await prisma.user.update({ where: { id: user.id }, data: { talentId } });
        }
      } catch (persistErr) {
        console.error("failed to persist talent dialogue result:", persistErr.message);
      }
    }

    return NextResponse.json({
      done: true,
      scores,
      phases,
      bottlenecks,
      growthAreas,
      summary: result.summary || null,
      talentId,
      talentSkillMapId,
      talentStatus,
    });
  } catch (e) {
    await logError("api/talent/dialogue/answer", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
