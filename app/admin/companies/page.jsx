import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS } from "@/lib/adminTheme";
import { adminDeleteCompanyAction } from "@/lib/actions";
import DeleteRowButton from "../_components/DeleteRowButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

async function getCompanies(q, page) {
  const where = q ? { name: { contains: q, mode: "insensitive" } } : {};
  const [companies, total, incompleteCount] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { skillMaps: { orderBy: { createdAt: "desc" }, take: 1 } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.company.count({ where }),
    // 会社情報の入力は終えたが、AI課題診断をまだ完了していない企業。
    // Companyレコードは診断の開始時に作られるので、この一覧には入力途中の企業も並ぶ。
    prisma.company.count({ where: { ...where, skillMaps: { none: {} } } }),
  ]);
  return { companies, total, incompleteCount };
}

function worstAxis(axisScores) {
  if (!axisScores) return null;
  const entries = Object.entries(axisScores);
  if (!entries.length) return null;
  return entries.sort((a, b) => a[1] - b[1])[0];
}

export default async function CompaniesPage({ searchParams }) {
  const q = searchParams?.q?.trim() || "";
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const { companies, total, incompleteCount } = await getCompanies(q, page);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qsFor = (p) => `?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${p}`;

  return (
    <AdminShell current="companies">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>企業一覧</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 20px" }}>
        {total}社が登録されています。
        {incompleteCount > 0 && <span style={{ color: COLORS.amber }}>うち{incompleteCount}社はAI課題診断が未完了(入力途中)です。</span>}
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <form method="get" style={{ display: "flex", gap: 8 }}>
          <input className="admin-input" type="text" name="q" placeholder="会社名で検索" defaultValue={q} style={{ minWidth: 220 }} />
          <button type="submit" className="admin-btn-muted">検索</button>
          {q && <a href="/admin/companies" className="admin-btn-muted" style={{ display: "inline-block" }}>クリア</a>}
        </form>
        <a href={`/admin/companies/export.csv${q ? `?q=${encodeURIComponent(q)}` : ""}`} className="admin-btn-muted" style={{ display: "inline-block" }}>
          CSVダウンロード
        </a>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>会社名</th>
              <th>登録状況</th>
              <th>フェーズ</th>
              <th>従業員数</th>
              <th>最優先ボトルネック</th>
              <th>診断日</th>
              <th style={{ textAlign: "right" }}>削除</th>
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
                  <td>
                    {sm ? (
                      <span className="admin-badge">完了</span>
                    ) : (
                      <span className="admin-badge" style={{ color: COLORS.amber }}>入力途中</span>
                    )}
                  </td>
                  <td>{c.phase || "—"}</td>
                  <td>{c.headcount || "—"}</td>
                  <td>{w ? <span className="admin-badge">{w[0]}: {w[1]}</span> : "未診断"}</td>
                  <td style={{ color: COLORS.muted }}>{new Date(c.createdAt).toLocaleDateString("ja-JP")}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex" }}>
                      <DeleteRowButton
                        action={adminDeleteCompanyAction}
                        idName="companyId"
                        id={c.id}
                        name={c.name}
                        kindLabel="企業"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {companies.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: COLORS.muted, textAlign: "center", padding: 30 }}>
                  {q ? "該当する企業が見つかりませんでした" : "まだ企業が登録されていません"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
          <a href={qsFor(Math.max(1, page - 1))} className="admin-btn-muted" style={{ display: "inline-block", opacity: page === 1 ? 0.4 : 1, pointerEvents: page === 1 ? "none" : "auto" }}>前へ</a>
          <span style={{ fontSize: 13, color: COLORS.muted, alignSelf: "center" }}>{page} / {totalPages}</span>
          <a href={qsFor(Math.min(totalPages, page + 1))} className="admin-btn-muted" style={{ display: "inline-block", opacity: page === totalPages ? 0.4 : 1, pointerEvents: page === totalPages ? "none" : "auto" }}>次へ</a>
        </div>
      )}
    </AdminShell>
  );
}
