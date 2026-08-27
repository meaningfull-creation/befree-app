import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";
import { scoreMatch } from "@/lib/matching";
import { getAxisWeightMultipliers } from "@/lib/axisPerformance";

export const dynamic = "force-dynamic";

// 「契約は企業側から提案する」という新しい流れに合わせ、企業が提案したものの
// まだ人材が回答していない契約(Engagement.status === "proposed")を一覧できるようにしている。
async function getPendingContracts() {
  return prisma.engagement.findMany({
    where: { status: "proposed" },
    include: {
      match: {
        include: {
          companySkillMap: { include: { company: true } },
          talentSkillMap: { include: { talent: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function getMatrix() {
  const [companies, talents, axisWeightMultipliers] = await Promise.all([
    prisma.company.findMany({ include: { skillMaps: { orderBy: { createdAt: "desc" }, take: 1 } } }),
    prisma.talent.findMany({ include: { skillMaps: { orderBy: { createdAt: "desc" }, take: 1 } } }),
    getAxisWeightMultipliers(),
  ]);

  const talentPool = talents
    .filter((t) => t.skillMaps.length > 0)
    .map((t) => ({ id: t.id, name: t.name, axisScores: t.skillMaps[0].axisScores, phases: t.skillMaps[0].phases || [] }));

  return companies
    .filter((c) => c.skillMaps.length > 0)
    .map((c) => {
      const sm = c.skillMaps[0];
      const ranked = talentPool
        .map((t) => ({ ...t, match: scoreMatch(sm.axisScores, t.axisScores, c.phase, t.phases, 6, axisWeightMultipliers) }))
        .sort((a, b) => b.match - a.match)
        .slice(0, 3);
      return { id: c.id, name: c.name, phase: c.phase, top: ranked };
    });
}

export default async function MatchesPage() {
  const [rows, pendingContracts] = await Promise.all([getMatrix(), getPendingContracts()]);

  return (
    <AdminShell current="matches">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>マッチング</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px" }}>
        DBにある企業・人材の最新スキルマップ同士を、その場でscoreMatch()にかけた結果です(BeFree_マッチングロジック設計.md準拠 — 設計思想はBATTER BOXでも同じです)。企業ごとの上位3名を表示しています。
      </p>

      {pendingContracts.length > 0 && (
        <div className="admin-card" style={{ borderColor: COLORS.teal, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.teal, marginBottom: 4 }}>人材の回答待ちの契約提案({pendingContracts.length}件)</div>
          <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>
            企業から契約条件が提案され、人材側の承諾/辞退の回答をまだ待っている状態です。運営からの操作は不要ですが、状況把握のために表示しています。
          </p>
          <table>
            <thead>
              <tr><th>企業</th><th>人材</th><th>月間稼働</th><th>企業支払額</th></tr>
            </thead>
            <tbody>
              {pendingContracts.map((e) => (
                <tr key={e.id}>
                  <td><a href={`/admin/companies/${e.match.companySkillMap.company.id}`}>{e.match.companySkillMap.company.name}</a></td>
                  <td><a href={`/admin/talents/${e.match.talentSkillMap.talent.id}`}>{e.match.talentSkillMap.talent.name}</a></td>
                  <td style={{ fontFamily: FONT_MONO }}>{e.monthlyHours}h</td>
                  <td style={{ fontFamily: FONT_MONO }}>¥{e.companyAmount?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 0 && (
        <div className="admin-card" style={{ color: COLORS.muted, textAlign: "center" }}>
          診断済みの企業がまだありません。
        </div>
      )}

      {rows.map((r) => (
        <div key={r.id} className="admin-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <a href={`/admin/companies/${r.id}`} style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15 }}>
              {r.name}
            </a>
            <span className="admin-badge">{r.phase}</span>
          </div>
          <table>
            <thead>
              <tr><th>候補人材</th><th>適合度</th></tr>
            </thead>
            <tbody>
              {r.top.map((t) => (
                <tr key={t.id}>
                  <td><a href={`/admin/talents/${t.id}`}>{t.name}</a></td>
                  <td style={{ fontFamily: FONT_MONO, color: COLORS.teal }}>{t.match}%</td>
                </tr>
              ))}
              {r.top.length === 0 && (
                <tr><td colSpan={2} style={{ color: COLORS.muted, textAlign: "center", padding: 16 }}>候補人材がいません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </AdminShell>
  );
}
