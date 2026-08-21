import { NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/claude";
import { clampAxisScores, sanitizeAxisNotes, sanitizeTopIssueDetails } from "@/lib/axes";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/errorLog";
import {
  buildDialogSystemPrompt,
  buildDialogNextQuestionPrompt,
  buildDialogScorePrompt,
  MAX_DIALOG_TURNS,
} from "@/lib/dialoguePrompts";

// POST /api/diagnosis/answer
// 認証は必須ではない(/api/diagnosis/start と同様、未ログインでも診断を進められる)。
// 企業アカウントでログイン済みの場合のみ、その場でDB保存する。
// body: { companyForm, history: [{q, a, axis}], companyId, sessionId, turnId }
//   turnId … 直前の質問(今回の回答が紐づくDiagnosisTurn)のid
// returns: { question, options, axis, turnId } または { done: true, scores, axisNotes, summary, companySkillMapId }
export async function POST(req) {
  try {
    const user = await getCurrentUser();
    const isCompanyUser = !!(user && user.role === "company");

    const { companyForm, history, sessionId, turnId } = await req.json();
    if (!companyForm?.name || !Array.isArray(history)) {
      return NextResponse.json({ error: "companyForm and history are required" }, { status: 400 });
    }

    // 直前の質問に対する回答をDiagnosisTurnに保存する
    if (turnId && history.length > 0) {
      const lastAnswer = history[history.length - 1]?.a;
      try {
        await prisma.diagnosisTurn.update({ where: { id: turnId }, data: { answer: lastAnswer ?? null } });
      } catch (persistErr) {
        console.error("failed to persist turn answer:", persistErr.message);
      }
    }

    if (history.length < MAX_DIALOG_TURNS) {
      const result = await callClaudeJSON(
        buildDialogSystemPrompt(),
        buildDialogNextQuestionPrompt(companyForm, history)
      );

      let nextTurnId = null;
      if (sessionId) {
        try {
          const turn = await prisma.diagnosisTurn.create({
            data: {
              sessionId,
              turnIndex: history.length,
              question: result.question,
              options: result.options || [],
            },
          });
          nextTurnId = turn.id;
        } catch (persistErr) {
          console.error("failed to persist next turn:", persistErr.message);
        }
      }

      return NextResponse.json({
        done: false,
        question: result.question,
        options: (result.options || []).slice(0, 3),
        axis: result.axis || null,
        turnId: nextTurnId,
      });
    }

    const result = await callClaudeJSON(buildDialogSystemPrompt(), buildDialogScorePrompt(companyForm, history));
    const scores = clampAxisScores(result.scores, 100);
    const axisNotes = sanitizeAxisNotes(result.axisNotes);
    const topIssueDetails = sanitizeTopIssueDetails(result.topIssueDetails);

    // 診断結果を永続化する(companyIdは /api/diagnosis/start で作成済みのCompanyを指す)。
    // 対話ログ(DiagnosisSession/DiagnosisTurn)は既にここまでの各ターンで保存済みなので、
    // ここではセッションを完了状態にし、スキルマップをセッションに紐づけるだけでよい。
    let companySkillMapId = null;
    if (isCompanyUser && user.companyId) {
      try {
        const skillMap = await prisma.companySkillMap.create({
          data: {
            companyId: user.companyId,
            diagnosisSessionId: sessionId || null,
            axisScores: scores,
            axisNotes,
            topIssueDetails,
            summary: result.summary || null,
          },
        });
        companySkillMapId = skillMap.id;
        if (sessionId) {
          await prisma.diagnosisSession.update({ where: { id: sessionId }, data: { status: "completed" } });
        }
      } catch (persistErr) {
        // DB未接続でもAI診断自体は継続できるよう、永続化の失敗は握りつぶしてログのみ残す
        console.error("failed to persist company skill map:", persistErr.message);
      }
    }

    return NextResponse.json({ done: true, scores, axisNotes, topIssueDetails, summary: result.summary || null, companySkillMapId });
  } catch (e) {
    await logError("api/diagnosis/answer", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
