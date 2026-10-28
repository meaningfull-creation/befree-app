import { NextResponse } from "next/server";
import { callClaudeJSON, callClaudeJSONStream, extractPartialString } from "@/lib/claude";
import { sseResponse } from "@/lib/sse";
import { normalizeAllocation, sanitizeGrowthAreas, sanitizeAxisNotes } from "@/lib/axes";
import { sanitizeIndustryFit } from "@/lib/industries";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { saveTalentProfile } from "@/lib/talentProfile";
import { logError } from "@/lib/errorLog";
import {
  buildTalentDialogSystemPrompt,
  buildTalentDialogNextQuestionPrompt,
  buildTalentDialogScorePrompt,
  MAX_TALENT_DIALOG_TURNS,
} from "@/lib/talentDialoguePrompts";

// AI呼び出しを含むため、Vercelの関数タイムアウトに余裕を持たせる
export const maxDuration = 60;

// POST /api/talent/dialogue/answer
// 認証は必須ではない(未ログインでも自己分析対話を進められる)。
// 実務経験者アカウントでログイン済みの場合のみ、最終ターンでその場でDB保存する。
// body: { talentForm, history: [{q,a,axis}] }
// returns: { question, options, axis, reflection } または
//          { done: true, scores, phases, bottlenecks, growthAreas, summary, talentId, talentSkillMapId }
export async function POST(req) {
  try {
    // ログイン判定とリクエストの読み取りは互いに独立なので同時に行う。
    // DBはネットワーク越し(Neon)なので、1往復でも直列に積むと体感に出る。
    const [user, body] = await Promise.all([getCurrentUser(), req.json()]);
    const isTalentUser = !!(user && user.role === "talent");

    const { talentForm, history } = body;
    if (!talentForm?.name || !Array.isArray(history)) {
      return NextResponse.json({ error: "talentForm and history are required" }, { status: 400 });
    }

    if (history.length < MAX_TALENT_DIALOG_TURNS) {
      // 質問1問は生成しながら流す。全文を待たずに文字が出ていくので、
      // 同じ秒数でも「止まっている」感じがなくなる。
      return sseResponse(async (send) => {
        let sentReflection = "";
        let sentQuestion = "";

        const result = await callClaudeJSONStream(
          buildTalentDialogSystemPrompt(),
          buildTalentDialogNextQuestionPrompt(talentForm, history),
          700,
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
        );

        send("done", {
          done: false,
          question: result.question,
          options: (result.options || []).slice(0, 4),
          axis: result.axis || null,
          reflection: result.reflection || null,
        });
      });
    }

    // 最終スコアリング。10軸のscores・phases・bottlenecks・growthAreas・summaryを一度に
    // 出力させるため応答が大きくなる。対話ターンが多いほど入力も長くなるため余裕を持たせる。
    const result = await callClaudeJSON(buildTalentDialogSystemPrompt(), buildTalentDialogScorePrompt(talentForm, history), 4500, { fast: true }); // モバイル利用が中心の人材側は速度を優先
    // 配点制: AIの出力は合計がずれるので、合計ちょうど100点に正規化してから保存する
    const scores = normalizeAllocation(result.scores);
    const phases = Array.isArray(result.phases) ? result.phases : [];
    const bottlenecks = Array.isArray(result.bottlenecks) ? result.bottlenecks : [];
    const growthAreas = sanitizeGrowthAreas(result.growthAreas);
    const industryFit = sanitizeIndustryFit(result.industryFit);
    // 採点根拠は全10軸のキーを保証したうえで、空の軸は落として保存する
    const allNotes = sanitizeAxisNotes(result.evidence);
    const axisEvidence = Object.fromEntries(Object.entries(allNotes).filter(([, v]) => v));

    let talentId = isTalentUser ? user.talentId : null;
    let talentSkillMapId = null;
    let talentStatus = "approved"; // 新規作成時のDBデフォルトと合わせている(現段階は自動承認運用)
    if (isTalentUser) {
      try {
        // 通常は対話開始時(/api/talent/dialogue/start)に作成済みなので、ここは更新になる。
        // 開始時の保存に失敗していた場合や、対話の途中でログインした場合はここで作られる。
        talentId = await saveTalentProfile(prisma, user, talentForm);
        const skillMap = await prisma.talentSkillMap.create({
          data: { talentId, axisScores: scores, phases, bottlenecks, growthAreas, industryFit, axisEvidence, summary: result.summary || null },
        });
        talentSkillMapId = skillMap.id;
        const talent = await prisma.talent.findUnique({ where: { id: talentId }, select: { status: true } });
        talentStatus = talent?.status ?? talentStatus;
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
      industryFit,
      axisEvidence,
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
