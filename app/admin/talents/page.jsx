import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";
import { reviewTalentAction, adminDeleteTalentAction } from "@/lib/actions";
import DeleteRowButton from "../_components/DeleteRowButton";
import { talentDisplayName } from "@/lib/talentProfile";
import { nameOrEmailWhere } from "@/lib/adminExport";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

async function getTalents(q, page) {
  // 氏名がまだ空の方(アカウント作成だけで離脱)も探せるよう、メールアドレスでも検索する。
  // CSVダウンロードと同じ条件を使う(以前は一覧だけメール検索に対応していて結果がずれていた)。
  const where = nameOrEmailWhere(q);
  const [talents, total, pendingCount, incompleteCount, accountOnlyCount] = await Promise.all([
    prisma.talent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        skillMaps: { orderBy: { createdAt: "desc" }, take: 1 },
        capacity: true,
        // 氏名が空の行は、メールアドレスが唯一の手がかりになる
        user: { select: { email: true } },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.talent.count({ where }),
    prisma.talent.count({ where: { ...where, status: "pending" } }),
    // 経歴入力は終えたがAI対話を完了していない方(スキルマップがまだ無い・氏名はある)
    prisma.talent.count({ where: { ...where, skillMaps: { none: {} }, NOT: { name: "" } } }),
    // アカウント作成だけで離脱した方(氏名すら入っていない)
    prisma.talent.count({ where: { ...where, name: "" } }),
  ]);
  return { talents, total, pendingCount, incompleteCount, accountOnlyCount };
}

// 一覧の「登録状況」。どこまで進んだかを1列で見分けられるようにする。
function registrationStage(talent) {
  if (talent.skillMaps.length > 0) return { label: "完了", highlight: false };
  if (!talent.name) return { label: "アカウントのみ", highlight: true };
  return { label: "入力途中", highlight: true };
}

function bestAxis(axisScores) {
  if (!axisScores) return null;
  const entries = Object.entries(axisScores);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0];
}

const STATUS_LABEL = { pending: "審査中", approved: "承認済み", rejected: "却下" };

export default async function TalentsPage({ searchParams }) {
  const q = searchParams?.q?.trim() || "";
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const { talents, total, pendingCount, incompleteCount, accountOnlyCount } = await getTalents(q, page);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qsFor = (p) => `?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${p}`;

  return (
    <AdminShell current="talents">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>人材一覧</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 20px" }}>
        {total}名が登録されています。
        {accountOnlyCount > 0 && <span style={{ color: COLORS.amber }}>うち{accountOnlyCount}名はアカウント作成のみ(経歴が未入力)です。</span>}
        {incompleteCount > 0 && <span style={{ color: COLORS.amber }}>うち{incompleteCount}名はAI対話が未完了(入力途中)です。</span>}
        {pendingCount > 0 && <span style={{ color: COLORS.amber }}>審査中が{pendingCount}件あります。</span>}
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <form method="get" style={{ display: "flex", gap: 8 }}>
          <input className="admin-input" type="text" name="q" placeholder="氏名・メールアドレスで検索" defaultValue={q} style={{ minWidth: 220 }} />
          <button type="submit" className="admin-btn-muted">検索</button>
          {q && <a href="/admin/talents" className="admin-btn-muted" style={{ display: "inline-block" }}>クリア</a>}
        </form>
        <a href={`/admin/talents/export.csv${q ? `?q=${encodeURIComponent(q)}` : ""}`} className="admin-btn-muted" style={{ display: "inline-block" }}>
          CSVダウンロード
        </a>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>氏名</th>
              <th>メールアドレス</th>
              <th>登録状況</th>
              <th>直近の役職</th>
              <th>経験年数</th>
              <th>最大の強み軸</th>
              <th>稼働状況</th>
              <th>審査状況</th>
              <th>登録日</th>
              <th></th>
              <th style={{ textAlign: "right" }}>削除</th>
            </tr>
          </thead>
          <tbody>
            {talents.map((t) => {
              const sm = t.skillMaps[0];
              const b = sm ? bestAxis(sm.axisScores) : null;
              const stage = registrationStage(t);
              const displayName = talentDisplayName(t.name);
              return (
                <tr key={t.id}>
                  <td>
                    <a href={`/admin/talents/${t.id}`} style={t.name ? undefined : { color: COLORS.muted }}>{displayName}</a>
                  </td>
                  <td style={{ fontFamily: FONT_MONO, fontSize: 12, color: COLORS.muted }}>{t.user?.email || "—"}</td>
                  <td>
                    <span className="admin-badge" style={stage.highlight ? { color: COLORS.amber } : undefined}>{stage.label}</span>
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
                    <div style={{ display: "flex", gap: 6 }}>
                      {t.status !== "approved" && (
                        <form action={reviewTalentAction}>
                          <input type="hidden" name="talentId" value={t.id} />
                          <input type="hidden" name="status" value="approved" />
                          <input type="hidden" name="redirectPath" value="/admin/talents" />
                          <button type="submit" className="admin-btn">承認</button>
                        </form>
                      )}
                      {t.status !== "rejected" && (
                        <form action={reviewTalentAction}>
                          <input type="hidden" name="talentId" value={t.id} />
                          <input type="hidden" name="status" value="rejected" />
                          <input type="hidden" name="redirectPath" value="/admin/talents" />
                          <button type="submit" className="admin-btn-muted">却下</button>
                        </form>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex" }}>
                      <DeleteRowButton
                        action={adminDeleteTalentAction}
                        idName="talentId"
                        id={t.id}
                        name={displayName}
                        kindLabel="人材"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {talents.length === 0 && (
              <tr>
                <td colSpan={9} style={{ color: COLORS.muted, textAlign: "center", padding: 30 }}>
                  {q ? "該当する人材が見つかりませんでした" : "まだ人材が登録されていません"}
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
