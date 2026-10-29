import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { buildCompaniesCsv, nameOrEmailWhere, COMPANY_EXPORT_INCLUDE } from "@/lib/adminExport";

// GET /admin/companies/export.csv?q=...
// 認証必須(admin)。企業一覧を検索条件に応じてCSV出力する。
// 列の組み立ては lib/adminExport.js に集約していて、エクスポート画面の
// 一括ダウンロード(ZIP)にも同じものが入る。
export async function GET(req) {
  const admin = await requireRole("admin");
  if (!admin) return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const companies = await prisma.company.findMany({
    where: nameOrEmailWhere(searchParams.get("q")),
    orderBy: { createdAt: "desc" },
    include: COMPANY_EXPORT_INCLUDE,
  });

  return csvResponse(buildCompaniesCsv(companies), "companies.csv");
}
