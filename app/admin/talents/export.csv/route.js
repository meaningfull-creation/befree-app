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

// GET /admin/talents/export.csv?q=...
// 認証必須(admin)。人材一覧を検索条件に応じてCSV出力する。
export async function GET(req) {
  const admin = await requireRole("admin");
  if (!admin) return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const where = q ? { name: { contains: q, mode: "insensitive" } } : {};

  const talents = await prisma.talent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { skillMaps: { orderBy: { createdAt: "desc" }, take: 1 }, capacity: true },
  });

  let csv = "\uFEFF";
  csv += toCsvRow(["氏名", "役職", "業種経験", "実務経験年数", "審査状況", "稼働(現在h)", "稼働上限(社)", "最新解析日", "登録日"]);
  for (const t of talents) {
    const sm = t.skillMaps[0];
    csv += toCsvRow([
      t.name, t.title, t.industry, t.years, t.status,
      t.capacity?.currentCommittedHours ?? "",
      t.capacity?.maxConcurrentEngagements ?? "",
      sm ? new Date(sm.createdAt).toLocaleDateString("ja-JP") : "",
      new Date(t.createdAt).toLocaleDateString("ja-JP"),
    ]);
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="talents.csv"`,
    },
  });
}
