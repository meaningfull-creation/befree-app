import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";

export const dynamic = "force-dynamic"; // 常に最新のDB状態を表示する

async function getCounts() {
  const [companies, talents, companySkillMaps, talentSkillMaps, matches, engagements, newInquiries] = await Promise.all([
    prisma.company.count(),
    prisma.talent.count(),
    prisma.companySkillMap.count(),
    prisma.talentSkillMap.count(),
    prisma.match.count(),
    prisma.engagement.count(),
    prisma.inquiry.count({ where: { status: "new" } }),
  ]);
  return { companies, talents, companySkillMaps, talentSkillMaps, matches, engagements, newInquiries };
}

function StatCard({ label, value }) {
  return (
    <div className="admin-card" style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>{label}</div>
      <div className="admin-stat-value">{value}</div>
    </div>
  );
}

export default async function AdminDashboard() {
  const c = await getCounts();

  return (
    <AdminShell current="dashboard">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>ダッシュボード</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px" }}>
        DBに保存されている企業・人材・マッチングの件数です。
      </p>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
        <StatCard label="登録企業数" value={c.companies} />
        <StatCard label="登録人材数" value={c.talents} />
        <StatCard label="企業スキルマップ(診断回数)" value={c.companySkillMaps} />
        <StatCard label="人材スキルマップ(解析回数)" value={c.talentSkillMaps} />
        <StatCard label="マッチング件数" value={c.matches} />
        <StatCard label="契約(伴走)件数" value={c.engagements} />
        <StatCard label="未対応の問い合わせ" value={c.newInquiries} />
      </div>

      <div className="admin-card" style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.8 }}>
        <span style={{ fontFamily: FONT_MONO, color: COLORS.amber }}>Note</span> —
        「マッチング」ページでは、Matchテーブルへの保存有無に関わらず、現在DBにある企業・人材の最新スキルマップ同士を
        その場で照合した結果を表示しています(scoreMatch()をリアルタイム実行)。実際に企業へ提案として送った記録は
        Matchテーブルへの保存を実装後、こちらの件数にも反映されます。
      </div>
    </AdminShell>
  );
}
