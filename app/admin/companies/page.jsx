import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";
import { adminDeleteCompanyAction } from "@/lib/actions";
import DeleteRowButton from "../_components/DeleteRowButton";
import { companyDisplayName } from "@/lib/companyProfile";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

async function getCompanies(q, page) {
  // 会社名がまだ空の企業(アカウント作成だけで離脱)も探せるよう、メールアドレスでも検索する
  const where = q
    ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { user: { email: { contains: q, mode: "insensitive" } } }] }
    : {};
  const [companies, total, incompleteCount, accountOnlyCount] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        skillMaps: { orderBy: { createdAt: "desc" }, take: 1 },
        // 会社名が空の行は、メールアドレスが唯一の手がかりになる
        user: { select: { email: true } },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.company.count({ where }),
    // 会社情報の入力は終えたが、AI課題診断をまだ完了していない企業(会社名はある)
    prisma.company.count({ where: { ...where, skillMaps: { none: {} }, NOT: { name: "" } } }),
    // アカウント作成だけで離脱した企業(会社名すら入っていない)
    prisma.company.count({ where: { ...where, name: "" } }),
  ]);
  return { companies, total, incompleteCount, accountOnlyCount };
}

// 一覧の「登録状況」。どこまで進んだかを1列で見分けられるようにする(人材一覧と同じ区分)。
function registrationStage(company) {
  if (company.skillMaps.length > 0) return { label: "完了", highlight: false };
  if (!company.name) return { label: "アカウントのみ", highlight: true };
  return { label: "入力途中", highlight: true };
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
  const { companies, total, incompleteCount, accountOnlyCount } = await getCompanies(q, page);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qsFor = (p) => `?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${p}`;

  return (
    <AdminShell current="companies">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>企業一覧</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 20px" }}>
        {total}社が登録されています。
        {accountOnlyCount > 0 && <span style={{ color: COLORS.amber }}>うち{accountOnlyCount}社はアカウント作成のみ(会社情報が未入力)です。</span>}
        {incompleteCount > 0 && <span style={{ color: COLORS.amber }}>うち{incompleteCount}社はAI課題診断が未完了(入力途中)です。</span>}
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <form method="get" style={{ display: "flex", gap: 8 }}>
          <input className="admin-input" type="text" name="q" placeholder="会社名・メールアドレスで検索" defaultValue={q} style={{ minWidth: 220 }} />
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
              <th>メールアドレス</th>
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
              const stage = registrationStage(c);
              const displayName = companyDisplayName(c.name);
              return (
                <tr key={c.id}>
                  <td>
                    <a href={`/admin/companies/${c.id}`} style={c.name ? undefined : { color: COLORS.muted }}>{displayName}</a>
                  </td>
                  <td style={{ fontFamily: FONT_MONO, fontSize: 12, color: COLORS.muted }}>{c.user?.email || "—"}</td>
                  <td>
                    <span className="admin-badge" style={stage.highlight ? { color: COLORS.amber } : undefined}>{stage.label}</span>
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
                        name={displayName}
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
