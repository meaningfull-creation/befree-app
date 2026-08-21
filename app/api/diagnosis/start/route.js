import { NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/claude";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/errorLog";
import { buildDialogSystemPrompt, buildDialogNextQuestionPrompt } from "@/lib/dialoguePrompts";

// POST /api/diagnosis/start
// 認証は必須ではない。ログイン前の訪問者でも診断を始められるようにするため
// (アカウント作成は診断結果が出た後にまとめて行う設計 — /api/diagnosis/claim 参照)。
// 企業アカウントでログイン済みの場合のみ、その場でCompany/DiagnosisSessionに永続化する。
// body: { companyForm: { name, industry, headcount, phase, revenue } }
// returns: { question, options, axis, companyId, sessionId, turnId }
export async function POST(req) {
  try {
    const user = await getCurrentUser();
    const isCompanyUser = !!(user && user.role === "company");

    const { companyForm } = await req.json();
    if (!companyForm?.name) {
      return NextResponse.json({ error: "companyForm.name is required" }, { status: 400 });
    }

    const result = await callClaudeJSON(
      buildDialogSystemPrompt(),
      buildDialogNextQuestionPrompt(companyForm, [])
    );

    // 診断開始時点でCompanyレコードを作成/更新し、対話セッション(DiagnosisSession)と
    // 1問目のターン(DiagnosisTurn)を保存する。同一アカウントでの再診断は、
    // 新しいCompanyを作らず既存のプロフィールを更新して使い回す。
    // 未ログインの場合はここでは何も永続化せず、クライアント側で結果を保持しておき、
    // アカウント作成時(/api/diagnosis/claim)にまとめて保存する。
    let companyId = isCompanyUser ? user.companyId : null;
    let sessionId = null;
    let turnId = null;
    if (isCompanyUser) {
      try {
        if (companyId) {
          await prisma.company.update({
            where: { id: companyId },
            data: {
              name: companyForm.name,
              industry: companyForm.industry,
              headcount: companyForm.headcount,
              phase: companyForm.phase,
              revenue: companyForm.revenue,
            },
          });
        } else {
          const company = await prisma.company.create({
            data: {
              name: companyForm.name,
              industry: companyForm.industry,
              headcount: companyForm.headcount,
              phase: companyForm.phase,
              revenue: companyForm.revenue,
            },
          });
          companyId = company.id;
          await prisma.user.update({ where: { id: user.id }, data: { companyId } });
        }

        const session = await prisma.diagnosisSession.create({
          data: { companyId, status: "in_progress" },
        });
        sessionId = session.id;

        const turn = await prisma.diagnosisTurn.create({
          data: {
            sessionId,
            turnIndex: 0,
            question: result.question,
            options: result.options || [],
          },
        });
        turnId = turn.id;
      } catch (persistErr) {
        // DB未接続でもAI対話自体は継続できるよう、永続化の失敗は握りつぶしてログのみ残す
        console.error("failed to persist company/session:", persistErr.message);
      }
    }

    return NextResponse.json({
      question: result.question,
      options: (result.options || []).slice(0, 3),
      axis: result.axis || null,
      companyId,
      sessionId,
      turnId,
    });
  } catch (e) {
    await logError("api/diagnosis/start", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
