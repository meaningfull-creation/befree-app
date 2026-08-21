import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { clampAxisScores, sanitizeAxisNotes, sanitizeTopIssueDetails } from "@/lib/axes";
import { logError } from "@/lib/errorLog";

// POST /api/diagnosis/claim
// 認証必須(role=company)。未ログインのまま /api/diagnosis/start・/api/diagnosis/answer を
// 進めて得た結果(companyForm・対話履歴・スコア等)を、アカウント作成の直後にまとめて保存する。
// 「情報入力→AI診断→結果確認→最後にアカウント作成」という一連の流れを成立させるための、
// いわば「未保存だった診断結果を今のアカウントに引き取る」処理。
// body: { companyForm, scores, axisNotes, topIssueDetails, summary, history }
export async function POST(req) {
  try {
    const user = await requireRole("company");
    if (!user) {
      return NextResponse.json({ error: "企業アカウントでのログインが必要です" }, { status: 401 });
    }

    const { companyForm, scores, axisNotes, topIssueDetails, summary, history } = await req.json();
    if (!companyForm?.name || !scores) {
      return NextResponse.json({ error: "companyForm, scores are required" }, { status: 400 });
    }

    // 新規作成直後のアカウントを想定しているが、念のため既存のCompanyがあれば使い回す
    // (同一アカウントで複数回claimを呼んでも二重作成しないため)。
    let companyId = user.companyId;
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

    // 対話履歴(history)があれば、DiagnosisSession/DiagnosisTurnとして事後保存する
    let sessionId = null;
    if (Array.isArray(history) && history.length > 0) {
      const session = await prisma.diagnosisSession.create({ data: { companyId, status: "completed" } });
      sessionId = session.id;
      await prisma.diagnosisTurn.createMany({
        data: history.map((h, i) => ({
          sessionId,
          turnIndex: i,
          question: h.q || "",
          options: [],
          answer: h.a || null,
        })),
      });
    }

    const skillMap = await prisma.companySkillMap.create({
      data: {
        companyId,
        diagnosisSessionId: sessionId,
        axisScores: clampAxisScores(scores, 100),
        axisNotes: sanitizeAxisNotes(axisNotes || {}),
        topIssueDetails: sanitizeTopIssueDetails(topIssueDetails || []),
        summary: summary || null,
      },
    });

    return NextResponse.json({ ok: true, companyId, companySkillMapId: skillMap.id });
  } catch (e) {
    await logError("api/diagnosis/claim", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
