import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/auditLog";
import { logError } from "@/lib/errorLog";
import { normalizeBankAccount, maskAccountNumber } from "@/lib/bankAccount";

// 報酬の振込先口座。本人(role=talent)のみが登録・更新・削除できる。
// 口座番号は返すときに必ずマスクする(末尾3桁のみ)。フルの値はDBにのみ存在し、
// 実際の振込時に運営が参照する想定。

// GET /api/talent/bank-account — 自分の登録内容(口座番号はマスク)
export async function GET() {
  try {
    const user = await requireRole("talent");
    if (!user) return NextResponse.json({ error: "実務経験者アカウントでのログインが必要です" }, { status: 401 });
    if (!user.talentId) return NextResponse.json({ account: null });

    const account = await prisma.talentBankAccount.findUnique({ where: { talentId: user.talentId } });
    if (!account) return NextResponse.json({ account: null });

    return NextResponse.json({
      account: {
        bankName: account.bankName,
        branchName: account.branchName,
        accountType: account.accountType,
        accountNumberMasked: maskAccountNumber(account.accountNumber),
        accountHolder: account.accountHolder,
        updatedAt: account.updatedAt,
      },
    });
  } catch (e) {
    await logError("api/talent/bank-account", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/talent/bank-account — 登録・更新
// body: { bankName, branchName, accountType, accountNumber, accountHolder }
export async function PUT(req) {
  try {
    const user = await requireRole("talent");
    if (!user) return NextResponse.json({ error: "実務経験者アカウントでのログインが必要です" }, { status: 401 });
    if (!user.talentId) return NextResponse.json({ error: "先にプロフィールを作成してください" }, { status: 400 });

    const normalized = normalizeBankAccount(await req.json());
    if (!normalized.ok) return NextResponse.json({ error: normalized.error }, { status: 400 });

    const saved = await prisma.talentBankAccount.upsert({
      where: { talentId: user.talentId },
      update: normalized.value,
      create: { talentId: user.talentId, ...normalized.value },
    });
    // 口座情報はお金に直結するため、変更した事実を監査ログに残す(口座番号そのものは記録しない)。
    await logAudit({
      actorId: user.id, actorEmail: user.email, action: "talent.bankAccount.update",
      targetType: "Talent", targetId: user.talentId, metadata: { bankName: saved.bankName },
    });

    return NextResponse.json({
      ok: true,
      account: {
        bankName: saved.bankName,
        branchName: saved.branchName,
        accountType: saved.accountType,
        accountNumberMasked: maskAccountNumber(saved.accountNumber),
        accountHolder: saved.accountHolder,
        updatedAt: saved.updatedAt,
      },
    });
  } catch (e) {
    await logError("api/talent/bank-account", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/talent/bank-account — 登録の削除
export async function DELETE() {
  try {
    const user = await requireRole("talent");
    if (!user) return NextResponse.json({ error: "実務経験者アカウントでのログインが必要です" }, { status: 401 });
    if (!user.talentId) return NextResponse.json({ ok: true });

    await prisma.talentBankAccount.deleteMany({ where: { talentId: user.talentId } });
    await logAudit({
      actorId: user.id, actorEmail: user.email, action: "talent.bankAccount.delete",
      targetType: "Talent", targetId: user.talentId, metadata: {},
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    await logError("api/talent/bank-account", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
