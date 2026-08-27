import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvRow(values) {
  return values.map(csvEscape).join(",") + "\r\n";
}

// GET /admin/companies/export.csv?q=...
// 認証必須(admin)。企業一覧を検索条件に応じてCSV出力する。
export async function GET(req) {
  const admin = await requireRole("admin");
  if (!admin) return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const where = q ? { name: { contains: q, mode: "insensitive" } } : {};

  const companies = await prisma.company.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { skillMaps: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  let csv = "\uFEFF"; // Excelで文字化けしないようUTF-8 BOMを付与
  csv += toCsvRow(["会社名", "業種", "従業員数", "外部資本の有無", "成長段階", "年商", "最新診断日", "総合スコア"]);
  for (const c of companies) {
    const sm = c.skillMaps[0];
    const avg = sm ? Math.round(Object.values(sm.axisScores).reduce((s, v) => s + v, 0) / Object.values(sm.axisScores).length) : "";
    csv += toCsvRow([
      c.name, c.industry, c.headcount,
      c.fundingType === "vc" ? "外部資本あり" : c.fundingType === "independent" ? "外部資本なし" : "",
      c.phase, c.revenue,
      sm ? new Date(sm.createdAt).toLocaleDateString("ja-JP") : "",
      avg,
    ]);
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="companies.csv"`,
    },
  });
}
