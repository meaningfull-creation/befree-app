import { NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/claude";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AXES, TALENT_POINT_BUDGET, normalizeAllocation } from "@/lib/axes";
import { logError } from "@/lib/errorLog";
import {
  buildTalentDialogSystemPrompt,
  buildTalentAxisDeepDivePrompt,
  buildTalentAxisDeepDiveSummaryPrompt,
} from "@/lib/talentDialoguePrompts";

// AI呼び出しを含むため、Vercelの関数タイムアウトに余裕を持たせる
export const maxDuration = 60;

const MAX_DEEP_DIVE_TURNS = 5; // 初回対話が5問に短縮された分、項目ごとの深掘りをより充実させる
const AXIS_LABEL_BY_KEY = Object.fromEntries(AXES.map((a) => [a.key, a.label]));

// POST /api/talent/axis-deep-dive
// 認証は必須ではない(未ログインの/joinフローでも使えるようにするため)。
// 実務経験者アカウントでログイン済み、かつtalentSkillMapIdが渡された場合のみ、
// 深掘り結果(更新後のスコア・分析コメント)をDBに反映する。
// body: { talentForm, axisKey, currentScore, currentScores?, currentNote, history: [{q,a}], talentSkillMapId? }
export async function POST(req) {
  try {
    const { talentForm, axisKey, currentScore, currentScores, currentNote, history, talentSkillMapId } = await req.json();
    const axisLabel = AXIS_LABEL_BY_KEY[axisKey];
    if (!talentForm?.name || !axisLabel || !Array.isArray(history)) {
      return NextResponse.json({ error: "talentForm, axisKey, history are required" }, { status: 400 });
    }

    if (history.length < MAX_DEEP_DIVE_TURNS) {
      const result = await callClaudeJSON(
        buildTalentDialogSystemPrompt(),
        buildTalentAxisDeepDivePrompt(talentForm, axisLabel, currentNote, history),
        600,
        { fast: true }
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
      500,
      { fast: true }
    );
    // 配点制では1軸だけを動かすことはできない(合計100点のうちの取り分なので、
    // ある軸を厚くすれば他が薄くなる)。AIが出した希望値をその軸に当てはめてから
    // 全体を100点に正規化し、実際に確定した取り分を newScore として返す。
    const requested = Number.isFinite(Number(result.score)) ? Math.max(0, Math.min(TALENT_POINT_BUDGET, Math.round(Number(result.score)))) : currentScore;
    const newNote = typeof result.note === "string" ? result.note.slice(0, 300) : currentNote;

    // 深掘りの結果をその軸に当てはめ、10軸全体を合計100点に引き直す。
    // 1軸が厚くなれば他の軸は薄くなる(取り分の付け替え)。
    const applyTo = (base) => normalizeAllocation({ ...base, [axisKey]: requested });

    let nextScores = applyTo(currentScores && typeof currentScores === "object" ? currentScores : {});

    if (talentSkillMapId) {
      try {
        const user = await getCurrentUser();
        if (user?.role === "talent" && user.talentId) {
          const skillMap = await prisma.talentSkillMap.findUnique({ where: { id: talentSkillMapId } });
          if (skillMap && skillMap.talentId === user.talentId) {
            // 保存済みのスキルマップが正。クライアントが古い配分を持っていてもここで揃う
            nextScores = applyTo(skillMap.axisScores);
            await prisma.talentSkillMap.update({
              where: { id: talentSkillMapId },
              data: { axisScores: nextScores },
            });
          }
        }
      } catch (persistErr) {
        console.error("failed to persist talent axis deep-dive result:", persistErr.message);
      }
    }

    // score は当該軸の確定後の取り分。scores は10軸すべての新しい配分。
    return NextResponse.json({ done: true, score: nextScores[axisKey], scores: nextScores, note: newNote });
  } catch (e) {
    await logError("api/talent/axis-deep-dive", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
