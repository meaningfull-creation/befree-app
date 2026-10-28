import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";

export const dynamic = "force-dynamic"; // 常に最新のDB状態を表示する

async function getCounts() {
  const [companies, talents, companiesIncomplete, talentsIncomplete, talentsAccountOnly, companySkillMaps, talentSkillMaps, matches, engagements, newInquiries, pendingContracts] = await Promise.all([
    prisma.company.count(),
    prisma.talent.count(),
    // 入力は始めたがAI対話(診断・自己分析)を終えていない数。
    // レコードは入力の冒頭で作られるので、登録数にはこの方々も含まれる。
    prisma.company.count({ where: { skillMaps: { none: {} } } }),
    prisma.talent.count({ where: { skillMaps: { none: {} }, NOT: { name: "" } } }),
    // 人材はアカウント作成の時点でレコードを作るため、経歴すら入れていない方もいる
    prisma.talent.count({ where: { name: "" } }),
    prisma.companySkillMap.count(),
    prisma.talentSkillMap.count(),
    prisma.match.count(),
    prisma.engagement.count(),
    prisma.inquiry.count({ where: { status: "new" } }),
    prisma.engagement.count({ where: { status: "proposed" } }),
  ]);
  return { companies, talents, companiesIncomplete, talentsIncomplete, talentsAccountOnly, companySkillMaps, talentSkillMaps, matches, engagements, newInquiries, pendingContracts };
}

function StatCard({ label, value, note }) {
  return (
    <div className="admin-card" style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>{label}</div>
      <div className="admin-stat-value">{value}</div>
      {note && <div style={{ fontSize: 11.5, color: COLORS.amber, marginTop: 6 }}>{note}</div>}
    </div>
  );
}

export default async function AdminDashboard() {
  const c = await getCounts();

  return (
    <AdminShell current="dashboard">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>ダッシュボード</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px" }}>
        DBに保存されている企業・人材・マッチングの件数です。人材はアカウント作成の時点、企業は会社情報の入力の時点で
        レコードを作るため、登録数にはAI対話をまだ終えていない方も含まれます(内訳を各カードに表示しています)。
      </p>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
        <StatCard label="登録企業数" value={c.companies} note={c.companiesIncomplete > 0 ? `うち${c.companiesIncomplete}社は入力途中` : null} />
        <StatCard
          label="登録人材数"
          value={c.talents}
          note={[
            c.talentsAccountOnly > 0 ? `うち${c.talentsAccountOnly}名はアカウントのみ` : null,
            c.talentsIncomplete > 0 ? `うち${c.talentsIncomplete}名は入力途中` : null,
          ].filter(Boolean).join(" / ") || null}
        />
        <StatCard label="企業スキルマップ(診断回数)" value={c.companySkillMaps} />
        <StatCard label="人材スキルマップ(解析回数)" value={c.talentSkillMaps} />
        <StatCard label="マッチング件数" value={c.matches} />
        <StatCard label="契約(伴走)件数" value={c.engagements} />
        <StatCard label="未対応の問い合わせ" value={c.newInquiries} />
        <StatCard label="人材の回答待ちの契約提案" value={c.pendingContracts} />
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
