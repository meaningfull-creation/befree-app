import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";
import { AXES } from "@/lib/axes";
import { scoreMatch } from "@/lib/matching";
import { getAxisWeightMultipliers } from "@/lib/axisPerformance";
import { recordMatchAction, acceptMatchAction, declineMatchAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

async function getTalent(id) {
  return prisma.talent.findUnique({
    where: { id },
    include: { skillMaps: { orderBy: { createdAt: "desc" } }, capacity: true },
  });
}

async function getTopCompanies(talentScores, talentPhases) {
  const [companies, axisWeightMultipliers] = await Promise.all([
    prisma.company.findMany({
      include: { skillMaps: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    getAxisWeightMultipliers(),
  ]);
  return companies
    .filter((c) => c.skillMaps.length > 0)
    .map((c) => {
      const sm = c.skillMaps[0];
      return {
        ...c,
        companySkillMapId: sm.id,
        match: scoreMatch(sm.axisScores, talentScores, c.phase, talentPhases || [], 6, axisWeightMultipliers),
      };
    })
    .sort((a, b) => b.match - a.match)
    .slice(0, 5);
}

async function RecordedMatches({ talentId, skillMapIds }) {
  const matches = await prisma.match.findMany({
    where: { talentSkillMapId: { in: skillMapIds } },
    include: { companySkillMap: { include: { company: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (matches.length === 0) {
    return <p style={{ color: COLORS.muted, fontSize: 13 }}>まだ記録された提案はありません。</p>;
  }

  return (
    <table>
      <thead>
        <tr><th>企業</th><th>適合度</th><th>ステータス</th><th></th></tr>
      </thead>
      <tbody>
        {matches.map((m) => (
          <tr key={m.id}>
            <td><a href={`/admin/companies/${m.companySkillMap.company.id}`}>{m.companySkillMap.company.name}</a></td>
            <td style={{ fontFamily: FONT_MONO, color: COLORS.teal }}>{m.matchScore}%</td>
            <td>
              <span className="admin-badge">
                {m.status === "proposed" ? "提案中" : m.status === "accepted" ? "契約済み" : "見送り"}
              </span>
            </td>
            <td>
              {m.status === "proposed" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <form action={acceptMatchAction} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <input type="hidden" name="matchId" value={m.id} />
                    <input type="hidden" name="redirectPath" value={`/admin/talents/${talentId}`} />
                    <input className="admin-input" type="number" name="monthlyHours" defaultValue={10} title="月の稼働時間(h)" />
                    <input className="admin-input" style={{ width: 100 }} type="number" name="companyAmount" placeholder="企業請求額" title="企業へ請求する月額(円)" />
                    <input className="admin-input" style={{ width: 100 }} type="number" name="talentAmount" placeholder="人材支払額" title="人材へ支払う月額(円)。標準料率: 企業請求額の60%(BeFreeの取り分40%で確定)" />
                    <button type="submit" className="admin-btn">契約にする</button>
                  </form>
                  <form action={declineMatchAction}>
                    <input type="hidden" name="matchId" value={m.id} />
                    <input type="hidden" name="redirectPath" value={`/admin/talents/${talentId}`} />
                    <button type="submit" className="admin-btn-muted">見送る</button>
                  </form>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function TalentDetailPage({ params }) {
  const talent = await getTalent(params.id);
  if (!talent) {
    return (
      <AdminShell current="talents">
        <p style={{ color: COLORS.muted }}>人材が見つかりませんでした。</p>
      </AdminShell>
    );
  }

  const latest = talent.skillMaps[0];
  const topCompanies = latest ? await getTopCompanies(latest.axisScores, latest.phases) : [];

  return (
    <AdminShell current="talents">
      <a href="/admin/talents" style={{ fontSize: 12.5, color: COLORS.muted }}>← 人材一覧に戻る</a>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "10px 0 4px" }}>{talent.name}</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px" }}>
        {[talent.title, talent.industry, talent.years].filter(Boolean).join(" / ")}
      </p>

      {talent.capacity && (
        <div className="admin-card">
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>稼働状況</div>
          <span className="admin-badge">
            現在 {talent.capacity.currentCommittedHours}h / 上限 {talent.capacity.maxConcurrentEngagements}社まで同時受託可
          </span>
        </div>
      )}

      <div className="admin-card">
        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>最新のスキルマップ</div>
        {latest ? (
          <>
            <table>
              <thead>
                <tr><th>軸</th><th>スコア(0〜30・高いほど強み)</th></tr>
              </thead>
              <tbody>
                {AXES.map((a) => (
                  <tr key={a.key}>
                    <td>{a.label}</td>
                    <td style={{ fontFamily: FONT_MONO, color: latest.axisScores[a.key] >= 20 ? COLORS.teal : COLORS.text }}>
                      {latest.axisScores[a.key]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {latest.summary && (
              <p style={{ fontSize: 13, color: COLORS.text, marginTop: 14, lineHeight: 1.7 }}>{latest.summary}</p>
            )}
            {Array.isArray(latest.phases) && latest.phases.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {latest.phases.map((p) => <span key={p} className="admin-badge">{p}</span>)}
              </div>
            )}
          </>
        ) : (
          <p style={{ color: COLORS.muted, fontSize: 13 }}>まだ解析が完了していません。</p>
        )}
      </div>

      {latest && (
        <div className="admin-card">
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>記録済みの提案</div>
          <RecordedMatches talentId={talent.id} skillMapIds={talent.skillMaps.map((s) => s.id)} />
        </div>
      )}

      {latest && (
        <div className="admin-card">
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>
            マッチング候補(現時点のリアルタイム計算 上位5社)。契約時の標準料率は「人材支払額 = 企業請求額 × 60%」です(BeFreeの取り分40%で確定)。
          </div>
          <table>
            <thead>
              <tr><th>企業名</th><th>フェーズ</th><th>適合度</th><th></th></tr>
            </thead>
            <tbody>
              {topCompanies.map((c) => (
                <tr key={c.id}>
                  <td><a href={`/admin/companies/${c.id}`}>{c.name}</a></td>
                  <td style={{ color: COLORS.muted }}>{c.phase}</td>
                  <td style={{ fontFamily: FONT_MONO, color: COLORS.teal }}>{c.match}%</td>
                  <td>
                    <form action={recordMatchAction}>
                      <input type="hidden" name="companySkillMapId" value={c.companySkillMapId} />
                      <input type="hidden" name="talentSkillMapId" value={latest.id} />
                      <input type="hidden" name="matchScore" value={c.match} />
                      <input type="hidden" name="redirectPath" value={`/admin/talents/${talent.id}`} />
                      <button type="submit" className="admin-btn">提案として記録</button>
                    </form>
                  </td>
                </tr>
              ))}
              {topCompanies.length === 0 && (
                <tr><td colSpan={4} style={{ color: COLORS.muted, textAlign: "center", padding: 20 }}>候補企業がいません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
