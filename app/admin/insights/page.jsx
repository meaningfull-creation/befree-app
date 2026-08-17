import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";
import { AXES } from "@/lib/axes";
import { recomputeAxisPerformanceAction, overrideAxisWeightAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

async function getAxisPerformance() {
  const rows = await prisma.axisPerformance.findMany();
  const byKey = Object.fromEntries(rows.map((r) => [r.axisKey, r]));
  return AXES.map((a) => ({ ...a, perf: byKey[a.key] || null }));
}

async function getPhaseAverages() {
  const skillMaps = await prisma.companySkillMap.findMany({
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });
  // 企業ごとに最新1件だけ使う(同じ企業が複数回診断している場合の重複を避ける)
  const latestByCompany = {};
  for (const sm of skillMaps) {
    if (!latestByCompany[sm.companyId]) latestByCompany[sm.companyId] = sm;
  }
  const byPhase = {};
  for (const sm of Object.values(latestByCompany)) {
    const phase = sm.company.phase || "不明";
    if (!byPhase[phase]) byPhase[phase] = { count: 0, sums: Object.fromEntries(AXES.map((a) => [a.key, 0])) };
    byPhase[phase].count += 1;
    for (const a of AXES) byPhase[phase].sums[a.key] += sm.axisScores[a.key] || 0;
  }
  return Object.entries(byPhase).map(([phase, { count, sums }]) => ({
    phase,
    count,
    averages: Object.fromEntries(AXES.map((a) => [a.key, Math.round(sums[a.key] / count)])),
  }));
}

export default async function InsightsPage() {
  const [axisPerf, phaseAverages, outcomeCount] = await Promise.all([
    getAxisPerformance(),
    getPhaseAverages(),
    prisma.engagementOutcome.count(),
  ]);

  const worstAxisByPhase = phaseAverages.map((p) => {
    const worst = Object.entries(p.averages).sort((a, b) => a[1] - b[1])[0];
    const label = AXES.find((a) => a.key === worst?.[0])?.label;
    return { ...p, worstAxisLabel: label, worstScore: worst?.[1] };
  });

  return (
    <AdminShell current="insights">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>データ活用インサイト</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px" }}>
        蓄積された診断・マッチング・成果データから見えてくる傾向です。データが増えるほど精度が上がり、同じ仕組みを模倣しただけの競合には再現できない資産になります。
      </p>

      <div className="admin-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>軸ごとの学習係数(マッチング重み付けに反映)</div>
            <div style={{ fontSize: 11.5, color: COLORS.faint }}>
              成果記録(EngagementOutcome)の蓄積数: {outcomeCount}件。3件未満の軸は中立値(1.0)のままです。
            </div>
          </div>
          <form action={recomputeAxisPerformanceAction}>
            <input type="hidden" name="redirectPath" value="/admin/insights" />
            <button type="submit" className="admin-btn">学習係数を再計算する</button>
          </form>
        </div>
        <table>
          <thead>
            <tr><th>軸</th><th>サンプル数</th><th>平均成果スコア</th><th>学習係数</th><th>手動調整(人材推薦設定)</th></tr>
          </thead>
          <tbody>
            {axisPerf.map((a) => (
              <tr key={a.key}>
                <td>{a.label}</td>
                <td style={{ color: COLORS.muted }}>{a.perf?.sampleCount ?? 0}</td>
                <td style={{ color: COLORS.muted }}>{a.perf?.avgOutcomeScore != null ? Math.round(a.perf.avgOutcomeScore) : "—"}</td>
                <td style={{ fontFamily: FONT_MONO, color: a.perf && a.perf.weightMultiplier !== 1 ? COLORS.teal : COLORS.text }}>
                  {(a.perf?.weightMultiplier ?? 1).toFixed(2)}×
                </td>
                <td>
                  <form action={overrideAxisWeightAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="hidden" name="axisKey" value={a.key} />
                    <input type="hidden" name="redirectPath" value="/admin/insights" />
                    <input
                      className="admin-input"
                      style={{ width: 70 }}
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="1.5"
                      name="weightMultiplier"
                      defaultValue={(a.perf?.weightMultiplier ?? 1).toFixed(2)}
                      title="0.5〜1.5の範囲で手動設定できます"
                    />
                    <button type="submit" className="admin-btn-muted">設定</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 11, color: COLORS.faint, marginTop: 10 }}>
          手動設定した値は、「学習係数を再計算する」を押すと成果データに基づく自動計算値で上書きされます。
        </p>
      </div>

      <div className="admin-card">
        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>
          フェーズ別の平均スコア・最頻出ボトルネック(企業の最新診断ベース)
        </div>
        {worstAxisByPhase.length === 0 && (
          <p style={{ color: COLORS.muted, fontSize: 13 }}>まだ診断済みの企業がありません。</p>
        )}
        <table>
          <thead>
            <tr><th>事業フェーズ</th><th>診断済み企業数</th><th>最も深刻な傾向のある軸</th></tr>
          </thead>
          <tbody>
            {worstAxisByPhase.map((p) => (
              <tr key={p.phase}>
                <td>{p.phase}</td>
                <td style={{ color: COLORS.muted }}>{p.count}社</td>
                <td>
                  {p.worstAxisLabel && (
                    <span className="admin-badge" style={{ color: COLORS.amber }}>
                      {p.worstAxisLabel}(平均{p.worstScore})
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 11.5, color: COLORS.faint, marginTop: 12, lineHeight: 1.7 }}>
          この分布自体が、BATTER BOX独自の診断データから初めて得られる知見です。件数が増えるほど、業種・フェーズ特化の診断精度やAIプロンプトの改善にも活かせます。
        </p>
      </div>
    </AdminShell>
  );
}
