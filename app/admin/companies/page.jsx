import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS } from "@/lib/adminTheme";

export const dynamic = "force-dynamic";

async function getCompanies() {
  return prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: { skillMaps: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
}

function worstAxis(axisScores) {
  if (!axisScores) return null;
  const entries = Object.entries(axisScores);
  if (!entries.length) return null;
  return entries.sort((a, b) => a[1] - b[1])[0];
}

export default async function CompaniesPage() {
  const companies = await getCompanies();

  return (
    <AdminShell current="companies">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>企業一覧</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px" }}>{companies.length}社が登録されています。</p>

      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>会社名</th>
              <th>フェーズ</th>
              <th>従業員数</th>
              <th>最優先ボトルネック</th>
              <th>診断日</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => {
              const sm = c.skillMaps[0];
              const w = sm ? worstAxis(sm.axisScores) : null;
              return (
                <tr key={c.id}>
                  <td>
                    <a href={`/admin/companies/${c.id}`}>{c.name}</a>
                  </td>
                  <td>{c.phase || "—"}</td>
                  <td>{c.headcount || "—"}</td>
                  <td>{w ? <span className="admin-badge">{w[0]}: {w[1]}</span> : "未診断"}</td>
                  <td style={{ color: COLORS.muted }}>{new Date(c.createdAt).toLocaleDateString("ja-JP")}</td>
                </tr>
              );
            })}
            {companies.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: COLORS.muted, textAlign: "center", padding: 30 }}>
                  まだ企業が登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
