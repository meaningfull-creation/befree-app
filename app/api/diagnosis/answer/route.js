import { NextResponse } from "next/server";
import { callClaudeJSON, callClaudeJSONStream, extractPartialString } from "@/lib/claude";
import { sseResponse } from "@/lib/sse";
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

// AI呼び出しを含むため、Vercelの関数タイムアウトに余裕を持たせる
export const maxDuration = 60;

// POST /api/diagnosis/answer
// 認証は必須ではない(/api/diagnosis/start と同様、未ログインでも診断を進められる)。
// 企業アカウントでログイン済みの場合のみ、その場でDB保存する。
// body: { companyForm, history: [{q, a, axis}], companyId, sessionId, turnId }
//   turnId … 直前の質問(今回の回答が紐づくDiagnosisTurn)のid
// returns: { question, options, axis, turnId } または { done: true, scores, axisNotes, summary, companySkillMapId }
export async function POST(req) {
  try {
    // ログイン判定とリクエストの読み取りは互いに独立なので同時に行う。
    // DBはネットワーク越し(Neon)なので、1往復でも直列に積むと体感に出る。
    const [user, body] = await Promise.all([getCurrentUser(), req.json()]);
    const isCompanyUser = !!(user && user.role === "company");

    const { companyForm, history, sessionId, turnId } = body;
    if (!companyForm?.name || !Array.isArray(history)) {
      return NextResponse.json({ error: "companyForm and history are required" }, { status: 400 });
    }

    // 直前の質問に対する回答をDiagnosisTurnに保存する。
    // 保存を待ってからAIを呼ぶ必要はない(失敗しても対話は続ける方針)ので、
    // AI呼び出しと並行して走らせ、1往復ぶんの待ち時間を削る。
    const savedAnswer =
      turnId && history.length > 0
        ? prisma.diagnosisTurn
            .update({ where: { id: turnId }, data: { answer: history[history.length - 1]?.a ?? null } })
            .catch((persistErr) => console.error("failed to persist turn answer:", persistErr.message))
        : Promise.resolve();

    if (history.length < MAX_DIALOG_TURNS) {
      // 質問1問は生成しながら流す。全文を待たずに文字が出ていくので、
      // 同じ秒数でも「止まっている」感じがなくなる。
      return sseResponse(async (send) => {
        let sentReflection = "";
        let sentQuestion = "";

        const [result] = await Promise.all([
          callClaudeJSONStream(
            buildDialogSystemPrompt(),
            buildDialogNextQuestionPrompt(companyForm, history),
            700, // 質問1問分の小さな応答。体感速度を上げるため小さめに絞る
            { fast: true }, // 対話の1問は高速モデルで返し、体感速度を優先する
            (text) => {
              // 出来かけのJSONから、表示する2つの文字列だけを取り出して流す
              const r = extractPartialString(text, "reflection");
              if (r && typeof r.value === "string" && r.value !== sentReflection) {
                sentReflection = r.value;
                send("delta", { reflection: sentReflection });
              }
              const q = extractPartialString(text, "question");
              if (q && typeof q.value === "string" && q.value !== sentQuestion) {
                sentQuestion = q.value;
                send("delta", { question: sentQuestion });
              }
            }
          ),
          savedAnswer,
        ]);

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

        send("done", {
          done: false,
          question: result.question,
          options: (result.options || []).slice(0, 4),
          axis: result.axis || null,
          reflection: result.reflection || null,
          turnId: nextTurnId,
        });
      });
    }

    // 最終スコアリングは10軸のscores・axisNotes・topIssueDetails・summaryを一度に出力させるため、
    // 応答が大きくなる。対話ターン数が増えるほど入力(対話ログ)も長くなるため、余裕を持たせている。
    // ここは診断結果が出る直前の最後の待ちで、最も離脱が起きやすい。
    // 人材側の最終採点と同じく高速モデルを使う。
    const [result] = await Promise.all([
      callClaudeJSON(buildDialogSystemPrompt(), buildDialogScorePrompt(companyForm, history), 3500, { fast: true }),
      savedAnswer,
    ]);
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
