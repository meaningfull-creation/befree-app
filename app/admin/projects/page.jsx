import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";

export const dynamic = "force-dynamic";

async function getProjects() {
  return prisma.project.findMany({
    include: {
      engagement: {
        include: {
          match: {
            include: {
              companySkillMap: { include: { company: true } },
              talentSkillMap: { include: { talent: true } },
            },
          },
        },
      },
      tasks: true,
      kpis: true,
      rating: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

const STATUS_LABEL = { active: "進行中", completed: "完了", paused: "一時停止" };

export default async function AdminProjectsPage() {
  const projects = await getProjects();

  return (
    <AdminShell current="projects">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>プロジェクト</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px" }}>
        {projects.length}件のプロジェクトがあります。個別のメッセージ内容は、企業ページ・人材ページから該当のマッチングを開くと確認できます。
      </p>

      {projects.length === 0 && (
        <div className="admin-card" style={{ color: COLORS.muted, textAlign: "center" }}>まだプロジェクトはありません。</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {projects.map((p) => {
          const doneTasks = p.tasks.filter((t) => t.status === "done").length;
          const kpiOnTrack = p.kpis.filter((k) => k.targetValue != null && k.currentValue != null && k.currentValue >= k.targetValue).length;
          const company = p.engagement.match.companySkillMap.company;
          const talent = p.engagement.match.talentSkillMap.talent;
          return (
            <div key={p.id} className="admin-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                  <span className="admin-badge" style={{ marginLeft: 10 }}>{STATUS_LABEL[p.status] || p.status}</span>
                </div>
                <span style={{ fontSize: 12, color: COLORS.muted }}>
                  <a href={`/admin/companies/${company.id}`} style={{ color: COLORS.text }}>{company.name}</a>
                  {" × "}
                  <a href={`/admin/talents/${talent.id}`} style={{ color: COLORS.text }}>{talent.name}</a>
                </span>
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12.5, color: COLORS.muted, marginBottom: p.rating ? 10 : 0 }}>
                <span>タスク: {doneTasks}/{p.tasks.length}完了</span>
                <span>KPI: {kpiOnTrack}/{p.kpis.length}達成</span>
                {p.currentMonthGoal && <span>今月の目標: {p.currentMonthGoal}</span>}
              </div>
              {p.rating && (
                <div style={{ fontSize: 12.5, color: COLORS.amber }}>
                  企業からの評価: {"★".repeat(p.rating.rating)}{"☆".repeat(5 - p.rating.rating)}
                  {p.rating.comment && <span style={{ color: COLORS.muted, marginLeft: 8 }}>「{p.rating.comment}」</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
