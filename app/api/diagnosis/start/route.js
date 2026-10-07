import { NextResponse } from "next/server";
import { callClaudeJSONStream, extractPartialString } from "@/lib/claude";
import { sseResponse } from "@/lib/sse";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/errorLog";
import { buildDialogSystemPrompt, buildDialogNextQuestionPrompt } from "@/lib/dialoguePrompts";

// AI呼び出しを含むため、Vercelの関数タイムアウトに余裕を持たせる
export const maxDuration = 60;

// POST /api/diagnosis/start
// 認証は必須ではない。ログイン前の訪問者でも診断を始められるようにするため
// v6.8でアカウント作成が入力より前に移ったため、通常はログイン済みで呼ばれる。
// 未ログインでも対話自体は進むが、その場合は保存されない。
// 企業アカウントでログイン済みの場合のみ、その場でCompany/DiagnosisSessionに永続化する。
// body: { companyForm: { name, industry, headcount, phase, revenue } }
// 応答はSSE(text/event-stream)。delta で生成途中の文字列を流し、
// 最後に done で { question, options, axis, reflection, companyId, sessionId, turnId } を返す。
export async function POST(req) {
  try {
    // ログイン判定とリクエストの読み取りは互いに独立なので同時に行う。
    // DBはネットワーク越し(Neon)なので、1往復でも直列に積むと体感に出る。
    const [user, body] = await Promise.all([getCurrentUser(), req.json()]);
    const isCompanyUser = !!(user && user.role === "company");

    const { companyForm } = body;
    if (!companyForm?.name) {
      return NextResponse.json({ error: "companyForm.name is required" }, { status: 400 });
    }

    // 診断開始時点でCompanyレコードを作成/更新し、対話セッション(DiagnosisSession)を用意する。
    // 同一アカウントでの再診断は、新しいCompanyを作らず既存のプロフィールを更新して使い回す。
    // ここはAIの応答を必要としないので、1問目の生成と同時に走らせて待ち時間を重ねる。
    // 未ログインの場合は何も永続化せず、対話だけ進める。
    const prepareRecords = (async () => {
      if (!isCompanyUser) return { companyId: null, sessionId: null };
      try {
        let companyId = user.companyId;
        const profile = {
          name: companyForm.name,
          industry: companyForm.industry,
          headcount: companyForm.headcount,
          fundingType: companyForm.fundingType,
          phase: companyForm.phase,
          revenue: companyForm.revenue,
        };
        if (companyId) {
          await prisma.company.update({ where: { id: companyId }, data: profile });
        } else {
          const company = await prisma.company.create({ data: profile });
          companyId = company.id;
          await prisma.user.update({ where: { id: user.id }, data: { companyId } });
        }
        const session = await prisma.diagnosisSession.create({
          data: { companyId, status: "in_progress" },
        });
        return { companyId, sessionId: session.id };
      } catch (persistErr) {
        // DB未接続でもAI対話自体は継続できるよう、永続化の失敗は握りつぶしてログのみ残す
        console.error("failed to persist company/session:", persistErr.message);
        return { companyId: user.companyId ?? null, sessionId: null };
      }
    })();

    // 1問目は生成しながら流す。全文を待たずに文字が出ていくので、
    // 同じ秒数でも「止まっている」感じがなくなる。
    return sseResponse(async (send) => {
      let sentReflection = "";
      let sentQuestion = "";

      const [result, records] = await Promise.all([
        callClaudeJSONStream(
          buildDialogSystemPrompt(),
          buildDialogNextQuestionPrompt(companyForm, []),
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
        prepareRecords,
      ]);

      // 1問目のターンはAIの応答が確定してからでないと保存できない
      let turnId = null;
      if (records.sessionId) {
        try {
          const turn = await prisma.diagnosisTurn.create({
            data: {
              sessionId: records.sessionId,
              turnIndex: 0,
              question: result.question,
              options: result.options || [],
            },
          });
          turnId = turn.id;
        } catch (persistErr) {
          console.error("failed to persist first turn:", persistErr.message);
        }
      }

      send("done", {
        question: result.question,
        options: (result.options || []).slice(0, 4),
        axis: result.axis || null,
        reflection: result.reflection || null,
        companyId: records.companyId,
        sessionId: records.sessionId,
        turnId,
      });
    });
  } catch (e) {
    await logError("api/diagnosis/start", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
