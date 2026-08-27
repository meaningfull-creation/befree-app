import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";
import { AXES } from "@/lib/axes";
import { scoreMatch } from "@/lib/matching";
import { getAxisWeightMultipliers } from "@/lib/axisPerformance";
import { recordMatchAction, acceptMatchAction, declineMatchAction, adjustCompanyScoreAction, adminUpdateCompanyAction, adminDeleteCompanyAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

async function getCompany(id) {
  return prisma.company.findUnique({
    where: { id },
    include: { skillMaps: { orderBy: { createdAt: "desc" } } },
  });
}

async function getDiagnosisTranscript(sessionId) {
  if (!sessionId) return null;
  return prisma.diagnosisSession.findUnique({
    where: { id: sessionId },
    include: { turns: { orderBy: { turnIndex: "asc" } } },
  });
}

async function getTopTalents(companyScores, companyPhase) {
  const [talents, axisWeightMultipliers] = await Promise.all([
    prisma.talent.findMany({
      include: { skillMaps: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    getAxisWeightMultipliers(),
  ]);
  return talents
    .filter((t) => t.skillMaps.length > 0)
    .map((t) => {
      const sm = t.skillMaps[0];
      return {
        ...t,
        talentSkillMapId: sm.id,
        match: scoreMatch(companyScores, sm.axisScores, companyPhase, sm.phases || [], 6, axisWeightMultipliers),
      };
    })
    .sort((a, b) => b.match - a.match)
    .slice(0, 5);
}

async function RecordedMatches({ companyId, skillMapIds }) {
  const matches = await prisma.match.findMany({
    where: { companySkillMapId: { in: skillMapIds } },
    include: { talentSkillMap: { include: { talent: true } }, engagement: true },
    orderBy: { createdAt: "desc" },
  });

  if (matches.length === 0) {
    return <p style={{ color: COLORS.muted, fontSize: 13 }}>まだ記録された提案はありません。</p>;
  }

  return (
    <table>
      <thead>
        <tr><th>人材</th><th>適合度</th><th>ステータス</th><th></th></tr>
      </thead>
      <tbody>
        {matches.map((m) => (
          <tr key={m.id}>
            <td><a href={`/admin/talents/${m.talentSkillMap.talent.id}`}>{m.talentSkillMap.talent.name}</a></td>
            <td style={{ fontFamily: FONT_MONO, color: COLORS.teal }}>{m.matchScore}%</td>
            <td>
              <span className="admin-badge">
                {m.status === "proposed" ? "提案中" : m.status === "accepted" ? "契約済み" : "見送り"}
              </span>
              {m.status === "proposed" && m.companyReadyAt && m.talentReadyAt && (
                <span className="admin-badge" style={{ color: COLORS.teal, marginLeft: 6 }}>双方合意済み・要対応</span>
              )}
            </td>
            <td>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <a href={`/admin/matches/${m.id}/messages`} className="admin-btn-muted" style={{ display: "inline-block" }}>メッセージを見る</a>
                {m.status === "proposed" && (
                  <>
                    <form action={acceptMatchAction} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input type="hidden" name="matchId" value={m.id} />
                      <input type="hidden" name="redirectPath" value={`/admin/companies/${companyId}`} />
                      <input className="admin-input" type="number" name="monthlyHours" defaultValue={10} title="月の稼働時間(h)" />
                      <input className="admin-input" style={{ width: 100 }} type="number" name="companyAmount" placeholder="企業請求額" title="企業へ請求する月額(円)" />
                      <input className="admin-input" style={{ width: 100 }} type="number" name="talentAmount" placeholder="人材支払額" title="人材へ支払う月額(円)。標準料率: 企業請求額の60%(BATTER BOXの取り分40%で確定)" />
                      <button type="submit" className="admin-btn">契約にする</button>
                    </form>
                    <form action={declineMatchAction}>
                      <input type="hidden" name="matchId" value={m.id} />
                      <input type="hidden" name="redirectPath" value={`/admin/companies/${companyId}`} />
                      <button type="submit" className="admin-btn-muted">見送る</button>
                    </form>
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function CompanyDetailPage({ params }) {
  const company = await getCompany(params.id);
  if (!company) {
    return (
      <AdminShell current="companies">
        <p style={{ color: COLORS.muted }}>企業が見つかりませんでした。</p>
      </AdminShell>
    );
  }

  const latest = company.skillMaps[0];
  const topTalents = latest ? await getTopTalents(latest.axisScores, company.phase) : [];
  const transcript = latest ? await getDiagnosisTranscript(latest.diagnosisSessionId) : null;

  return (
    <AdminShell current="companies">
      <a href="/admin/companies" style={{ fontSize: 12.5, color: COLORS.muted }}>← 企業一覧に戻る</a>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "10px 0 4px" }}>{company.name}</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px" }}>
        {[company.industry, company.phase, company.headcount, company.revenue].filter(Boolean).join(" / ")}
      </p>

      <div className="admin-card">
        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>基本情報の編集(表記ミスの修正等)</div>
        <form action={adminUpdateCompanyAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="hidden" name="companyId" value={company.id} />
          <input type="hidden" name="redirectPath" value={`/admin/companies/${company.id}`} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input className="admin-input" name="name" defaultValue={company.name} placeholder="会社名" required style={{ flex: 1, minWidth: 180 }} />
            <input className="admin-input" name="industry" defaultValue={company.industry || ""} placeholder="業種" style={{ flex: 1, minWidth: 160 }} />
            <input className="admin-input" name="headcount" defaultValue={company.headcount || ""} placeholder="従業員数" style={{ width: 120 }} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select className="admin-input" name="fundingType" defaultValue={company.fundingType || ""} style={{ width: 200 }}>
              <option value="">外部資本の有無(未設定)</option>
              <option value="independent">外部資本なし</option>
              <option value="vc">外部資本あり</option>
            </select>
            <input className="admin-input" name="phase" defaultValue={company.phase || ""} placeholder="成長段階/資金調達フェーズ" style={{ flex: 1, minWidth: 180 }} />
            <input className="admin-input" name="revenue" defaultValue={company.revenue || ""} placeholder="年商" style={{ width: 140 }} />
          </div>
          <div>
            <button type="submit" className="admin-btn">保存する</button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>最新の課題スキルマップ(スコアは手動調整可能)</div>
        {latest ? (
          <>
            <table>
              <thead>
                <tr><th>軸</th><th>スコア(0〜100・低いほど深刻)</th><th>分析コメント</th><th>調整</th></tr>
              </thead>
              <tbody>
                {AXES.map((a) => (
                  <tr key={a.key}>
                    <td>{a.label}</td>
                    <td style={{ fontFamily: FONT_MONO, color: latest.axisScores[a.key] < 40 ? COLORS.amber : COLORS.text }}>
                      {latest.axisScores[a.key]}
                    </td>
                    <td style={{ color: COLORS.muted, fontSize: 12.5 }}>{latest.axisNotes?.[a.key] || "—"}</td>
                    <td>
                      <form action={adjustCompanyScoreAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="hidden" name="skillMapId" value={latest.id} />
                        <input type="hidden" name="axisKey" value={a.key} />
                        <input type="hidden" name="redirectPath" value={`/admin/companies/${companyId}`} />
                        <input className="admin-input" style={{ width: 60 }} type="number" min="0" max="100" name="newScore" defaultValue={latest.axisScores[a.key]} />
                        <button type="submit" className="admin-btn-muted">保存</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {latest.summary && (
              <p style={{ fontSize: 13, color: COLORS.text, marginTop: 14, lineHeight: 1.7 }}>{latest.summary}</p>
            )}
            <p style={{ fontSize: 11, color: COLORS.faint, marginTop: 10 }}>
              AIの診断が明らかに実態とずれている場合の是正用です。変更は監査ログに記録されます。
            </p>
          </>
        ) : (
          <p style={{ color: COLORS.muted, fontSize: 13 }}>まだ診断が完了していません。</p>
        )}
      </div>

      {transcript && (
        <div className="admin-card">
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>
            対話ログ(全{transcript.turns.length}問・{transcript.status === "completed" ? "完了" : "進行中"})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {transcript.turns.map((t, i) => (
              <div key={t.id} style={{ borderLeft: `2px solid ${COLORS.border}`, paddingLeft: 12 }}>
                <div style={{ fontSize: 12.5, color: COLORS.text, marginBottom: 4 }}>
                  <span style={{ fontFamily: FONT_MONO, color: COLORS.muted, marginRight: 6 }}>Q{i + 1}</span>
                  {t.question}
                </div>
                <div style={{ fontSize: 12.5, color: COLORS.teal }}>
                  <span style={{ fontFamily: FONT_MONO, color: COLORS.muted, marginRight: 6 }}>A{i + 1}</span>
                  {t.answer || "(未回答)"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {latest && (
        <div className="admin-card">
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>記録済みの提案</div>
          <RecordedMatches companyId={company.id} skillMapIds={company.skillMaps.map((s) => s.id)} />
        </div>
      )}

      {latest && (
        <div className="admin-card">
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>
            マッチング候補(現時点のリアルタイム計算 上位5名)。契約時の標準料率は「人材支払額 = 企業請求額 × 60%」です(BATTER BOXの取り分40%で確定)。
          </div>
          <table>
            <thead>
              <tr><th>氏名</th><th>役職</th><th>適合度</th><th></th></tr>
            </thead>
            <tbody>
              {topTalents.map((t) => (
                <tr key={t.id}>
                  <td><a href={`/admin/talents/${t.id}`}>{t.name}</a></td>
                  <td style={{ color: COLORS.muted }}>{t.title}</td>
                  <td style={{ fontFamily: FONT_MONO, color: COLORS.teal }}>{t.match}%</td>
                  <td>
                    <form action={recordMatchAction}>
                      <input type="hidden" name="companySkillMapId" value={latest.id} />
                      <input type="hidden" name="talentSkillMapId" value={t.talentSkillMapId} />
                      <input type="hidden" name="matchScore" value={t.match} />
                      <input type="hidden" name="redirectPath" value={`/admin/companies/${company.id}`} />
                      <button type="submit" className="admin-btn">提案として記録</button>
                    </form>
                  </td>
                </tr>
              ))}
              {topTalents.length === 0 && (
                <tr><td colSpan={4} style={{ color: COLORS.muted, textAlign: "center", padding: 20 }}>候補人材がいません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-card" style={{ borderColor: COLORS.amber }}>
        <div style={{ fontSize: 12, color: COLORS.amber, marginBottom: 8 }}>危険な操作</div>
        <p style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 12, lineHeight: 1.7 }}>
          この企業と、紐づく診断履歴・マッチング・契約・プロジェクト・請求書・ログインアカウントをすべて削除します。取り消せません。
          サンプルデータの整理を目的とした操作です。実際の顧客データには使用しないでください。
        </p>
        <form action={adminDeleteCompanyAction} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="hidden" name="companyId" value={company.id} />
          <input type="hidden" name="expectedName" value={company.name} />
          <input className="admin-input" name="confirmText" placeholder={`確認のため「${company.name}」と入力`} style={{ minWidth: 220 }} />
          <button type="submit" className="admin-btn-muted" style={{ borderColor: COLORS.amber, color: COLORS.amber }}>この企業を完全に削除する</button>
        </form>
      </div>
    </AdminShell>
  );
}
