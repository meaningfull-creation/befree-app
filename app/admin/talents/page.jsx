import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS } from "@/lib/adminTheme";
import { reviewTalentAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

async function getTalents() {
  return prisma.talent.findMany({
    orderBy: { createdAt: "desc" },
    include: { skillMaps: { orderBy: { createdAt: "desc" }, take: 1 }, capacity: true },
  });
}

function bestAxis(axisScores) {
  if (!axisScores) return null;
  const entries = Object.entries(axisScores);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0];
}

const STATUS_LABEL = { pending: "審査中", approved: "承認済み", rejected: "却下" };

export default async function TalentsPage() {
  const talents = await getTalents();
  const pendingCount = talents.filter((t) => t.status === "pending").length;

  return (
    <AdminShell current="talents">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>人材一覧</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px" }}>
        {talents.length}名が登録されています。{pendingCount > 0 && <span style={{ color: COLORS.amber }}>審査中が{pendingCount}件あります。</span>}
      </p>

      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>氏名</th>
              <th>直近の役職</th>
              <th>経験年数</th>
              <th>最大の強み軸</th>
              <th>稼働状況</th>
              <th>審査状況</th>
              <th>登録日</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {talents.map((t) => {
              const sm = t.skillMaps[0];
              const b = sm ? bestAxis(sm.axisScores) : null;
              return (
                <tr key={t.id}>
                  <td>
                    <a href={`/admin/talents/${t.id}`}>{t.name}</a>
                  </td>
                  <td style={{ color: COLORS.muted }}>{t.title || "—"}</td>
                  <td style={{ color: COLORS.muted }}>{t.years || "—"}</td>
                  <td>{b ? <span className="admin-badge">{b[0]}: {b[1]}</span> : "未解析"}</td>
                  <td style={{ color: COLORS.muted }}>
                    {t.capacity ? `${t.capacity.currentCommittedHours}h / 上限${t.capacity.maxConcurrentEngagements}社` : "—"}
                  </td>
                  <td>
                    <span className="admin-badge" style={{ color: t.status === "pending" ? COLORS.amber : undefined }}>
                      {STATUS_LABEL[t.status] || t.status}
                    </span>
                  </td>
                  <td style={{ color: COLORS.muted }}>{new Date(t.createdAt).toLocaleDateString("ja-JP")}</td>
                  <td>
                    {t.status === "pending" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <form action={reviewTalentAction}>
                          <input type="hidden" name="talentId" value={t.id} />
                          <input type="hidden" name="status" value="approved" />
                          <input type="hidden" name="redirectPath" value="/admin/talents" />
                          <button type="submit" className="admin-btn">承認</button>
                        </form>
                        <form action={reviewTalentAction}>
                          <input type="hidden" name="talentId" value={t.id} />
                          <input type="hidden" name="status" value="rejected" />
                          <input type="hidden" name="redirectPath" value="/admin/talents" />
                          <button type="submit" className="admin-btn-muted">却下</button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {talents.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: COLORS.muted, textAlign: "center", padding: 30 }}>
                  まだ人材が登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
