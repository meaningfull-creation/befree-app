import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { createZip, zipResponse } from "@/lib/zip";
import {
  buildTalentsCsv,
  buildCompaniesCsv,
  TALENT_EXPORT_INCLUDE,
  COMPANY_EXPORT_INCLUDE,
} from "@/lib/adminExport";

// 件数が多いと組み立てに時間がかかるため、関数タイムアウトに余裕を持たせる
export const maxDuration = 60;

// GET /admin/exports/all.zip
// 認証必須(admin)。人材と企業のCSVを1つのZIPにまとめて返す。
// 一覧ページのCSVと中身は同じで、検索条件は適用せず全件を出す
// (「一括ダウンロード」の用途なので、絞り込みたい場合は各一覧から個別に取る)。
export async function GET() {
  const admin = await requireRole("admin");
  if (!admin) return new Response("Forbidden", { status: 403 });

  const [talents, companies] = await Promise.all([
    prisma.talent.findMany({ orderBy: { createdAt: "desc" }, include: TALENT_EXPORT_INCLUDE }),
    prisma.company.findMany({ orderBy: { createdAt: "desc" }, include: COMPANY_EXPORT_INCLUDE }),
  ]);

  // ファイル名に日付を入れて、いつ時点のデータか後から分かるようにする
  const stamp = new Date().toISOString().slice(0, 10);
  const zip = createZip([
    { name: `talents_${stamp}.csv`, content: buildTalentsCsv(talents) },
    { name: `companies_${stamp}.csv`, content: buildCompaniesCsv(companies) },
  ]);

  return zipResponse(zip, `batterbox_export_${stamp}.zip`);
}
