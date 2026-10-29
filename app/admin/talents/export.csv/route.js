import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { buildTalentsCsv, nameOrEmailWhere, TALENT_EXPORT_INCLUDE } from "@/lib/adminExport";

// GET /admin/talents/export.csv?q=...
// 認証必須(admin)。人材一覧を検索条件に応じてCSV出力する。
// 列の組み立ては lib/adminExport.js に集約していて、エクスポート画面の
// 一括ダウンロード(ZIP)にも同じものが入る。
export async function GET(req) {
  const admin = await requireRole("admin");
  if (!admin) return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const talents = await prisma.talent.findMany({
    where: nameOrEmailWhere(searchParams.get("q")),
    orderBy: { createdAt: "desc" },
    include: TALENT_EXPORT_INCLUDE,
  });

  return csvResponse(buildTalentsCsv(talents), "talents.csv");
}
