import { NextResponse } from "next/server";
import { callClaudeJSONStream, extractPartialString } from "@/lib/claude";
import { sseResponse } from "@/lib/sse";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { saveTalentProfile } from "@/lib/talentProfile";
import { logError } from "@/lib/errorLog";
import { buildTalentDialogSystemPrompt, buildTalentDialogNextQuestionPrompt } from "@/lib/talentDialoguePrompts";

// AI呼び出しを含むため、Vercelの関数タイムアウトに余裕を持たせる
export const maxDuration = 60;

// POST /api/talent/dialogue/start
// 認証は必須ではない(未ログインの/joinフローでも使えるようにするため)。
// 実務経験者アカウントでログイン済みの場合は、この時点でTalentレコードを作成/更新する。
// 以前は5問の対話が終わるまで作っていなかったため、途中離脱した方が
// 管理画面の人材一覧に一切現れなかった(v6.12で前倒し)。
// body: { talentForm }
// returns: { question, options, axis, reflection, talentId }
export async function POST(req) {
  try {
    // ログイン判定とリクエストの読み取りは互いに独立なので同時に行う。
    // DBはネットワーク越し(Neon)なので、1往復でも直列に積むと体感に出る。
    const [user, body] = await Promise.all([getCurrentUser(), req.json()]);
    const isTalentUser = !!(user && user.role === "talent");

    const { talentForm } = body;
    if (!talentForm?.name) {
      return NextResponse.json({ error: "talentForm.name is required" }, { status: 400 });
    }

    // 保存はAIの応答を必要としないので、1問目の生成と同時に走らせて待ち時間を重ねる。
    const persist = (async () => {
      if (!isTalentUser) return null;
      try {
        return await saveTalentProfile(prisma, user, talentForm);
      } catch (persistErr) {
        // DB未接続でも対話自体は続けられるよう、保存の失敗は握りつぶしてログのみ残す
        console.error("failed to persist talent profile:", persistErr.message);
        return user.talentId ?? null;
      }
    })();

    // 1問目も生成しながら流す。
    return sseResponse(async (send) => {
      let sentReflection = "";
      let sentQuestion = "";

      const [result, talentId] = await Promise.all([
        callClaudeJSONStream(
          buildTalentDialogSystemPrompt(),
          buildTalentDialogNextQuestionPrompt(talentForm, []),
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
        ),
        persist,
      ]);

      send("done", {
        question: result.question,
        options: (result.options || []).slice(0, 4),
        axis: result.axis || null,
        reflection: result.reflection || null,
        talentId,
      });
    });
  } catch (e) {
    await logError("api/talent/dialogue/start", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
