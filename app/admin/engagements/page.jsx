import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";
import {
  recordOutcomeAction,
  updateEngagementStatusAction,
  issueInvoiceAction,
  updateInvoiceStatusAction,
  issuePayoutAction,
  updatePayoutStatusAction,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

async function getEngagements() {
  return prisma.engagement.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      match: {
        include: {
          companySkillMap: { include: { company: true } },
          talentSkillMap: { include: { talent: true } },
        },
      },
      outcomes: { orderBy: { recordedAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      payouts: { orderBy: { createdAt: "desc" } },
    },
  });
}

const STATUS_LABEL = { active: "進行中", paused: "一時停止", completed: "完了" };
const INVOICE_STATUS_LABEL = { draft: "下書き", sent: "送付済み", paid: "入金済み" };
const PAYOUT_STATUS_LABEL = { draft: "下書き", scheduled: "支払予定", paid: "支払済み" };

export default async function EngagementsPage() {
  const engagements = await getEngagements();

  return (
    <AdminShell current="engagements">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>契約(伴走)</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px" }}>
        {engagements.length}件の契約が成立しています。支払いフローは「企業 → BeFree → 人材」で、企業⇄BeFree・BeFree⇄人材の2本の業務委託契約として扱います。標準手数料率は40%(人材支払額は企業請求額の60%)で確定しています。B2B側の決済は、Stripe等の自動化ではなく請求書のやり取りによる運用を前提とします。
      </p>

      {engagements.length === 0 && (
        <div className="admin-card" style={{ color: COLORS.muted, textAlign: "center" }}>
          まだ契約が成立していません。
        </div>
      )}

      {engagements.map((e) => {
        const company = e.match.companySkillMap.company;
        const talent = e.match.talentSkillMap.talent;
        const margin = e.companyAmount != null && e.talentAmount != null ? e.companyAmount - e.talentAmount : null;
        return (
          <div key={e.id} className="admin-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div>
                <a href={`/admin/companies/${company.id}`} style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15 }}>
                  {company.name}
                </a>
                <span style={{ color: COLORS.muted, margin: "0 8px" }}>⇄ BeFree ⇄</span>
                <a href={`/admin/talents/${talent.id}`} style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15 }}>
                  {talent.name}
                </a>
              </div>
              <span className="admin-badge">{STATUS_LABEL[e.status] || e.status}</span>
            </div>

            <div style={{ display: "flex", gap: 24, fontSize: 12.5, color: COLORS.muted, marginBottom: 14, flexWrap: "wrap" }}>
              <span>月間稼働: <span style={{ color: COLORS.text, fontFamily: FONT_MONO }}>{e.monthlyHours}h</span></span>
              <span>契約形態: <span style={{ color: COLORS.text }}>業務委託(企業⇄BeFree / BeFree⇄人材の2本)</span></span>
              {e.companyAmount != null && (
                <span>企業への請求額(月): <span style={{ color: COLORS.text, fontFamily: FONT_MONO }}>¥{e.companyAmount.toLocaleString()}</span></span>
              )}
              {e.talentAmount != null && (
                <span>人材への支払額(月): <span style={{ color: COLORS.text, fontFamily: FONT_MONO }}>¥{e.talentAmount.toLocaleString()}</span></span>
              )}
              {margin != null && (
                <span>BeFreeの取り分(月): <span style={{ color: COLORS.amber, fontFamily: FONT_MONO }}>¥{margin.toLocaleString()}</span></span>
              )}
              <span>開始日: <span style={{ color: COLORS.text }}>{e.startDate ? new Date(e.startDate).toLocaleDateString("ja-JP") : "—"}</span></span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11.5, color: COLORS.muted, marginBottom: 6 }}>ステータス変更</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["active", "paused", "completed"].map((s) => (
                  <form action={updateEngagementStatusAction} key={s}>
                    <input type="hidden" name="engagementId" value={e.id} />
                    <input type="hidden" name="status" value={s} />
                    <input type="hidden" name="redirectPath" value="/admin/engagements" />
                    <button type="submit" className={e.status === s ? "admin-btn" : "admin-btn-muted"}>
                      {STATUS_LABEL[s]}
                    </button>
                  </form>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11.5, color: COLORS.muted, marginBottom: 8 }}>成果記録</div>
              {e.outcomes.length > 0 && (
                <table style={{ marginBottom: 12 }}>
                  <thead><tr><th>成果スコア</th><th>メモ</th><th>記録日</th></tr></thead>
                  <tbody>
                    {e.outcomes.map((o) => (
                      <tr key={o.id}>
                        <td style={{ fontFamily: FONT_MONO, color: COLORS.amber }}>{o.outcomeScore}</td>
                        <td style={{ color: COLORS.muted }}>{o.notes || "—"}</td>
                        <td style={{ color: COLORS.muted }}>{new Date(o.recordedAt).toLocaleDateString("ja-JP")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <form action={recordOutcomeAction} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input type="hidden" name="engagementId" value={e.id} />
                <input type="hidden" name="redirectPath" value="/admin/engagements" />
                <input className="admin-input" type="number" name="outcomeScore" placeholder="0-100" min={0} max={100} required />
                <input className="admin-input" style={{ width: 220 }} type="text" name="notes" placeholder="メモ(任意)" />
                <button type="submit" className="admin-btn">成果を記録</button>
              </form>
            </div>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 11.5, color: COLORS.muted, marginBottom: 8 }}>① 企業 → BeFree(請求)</div>
                {e.invoices.length > 0 && (
                  <table style={{ marginBottom: 10 }}>
                    <thead><tr><th>対象月</th><th>金額</th><th>状況</th><th></th></tr></thead>
                    <tbody>
                      {e.invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td>{inv.periodLabel}</td>
                          <td style={{ fontFamily: FONT_MONO, color: COLORS.text }}>¥{inv.amount.toLocaleString()}</td>
                          <td><span className="admin-badge">{INVOICE_STATUS_LABEL[inv.status]}</span></td>
                          <td>
                            {inv.status !== "paid" && (
                              <div style={{ display: "flex", gap: 6 }}>
                                {inv.status === "draft" && (
                                  <form action={updateInvoiceStatusAction}>
                                    <input type="hidden" name="invoiceId" value={inv.id} />
                                    <input type="hidden" name="status" value="sent" />
                                    <input type="hidden" name="redirectPath" value="/admin/engagements" />
                                    <button type="submit" className="admin-btn-muted">送付済み</button>
                                  </form>
                                )}
                                <form action={updateInvoiceStatusAction}>
                                  <input type="hidden" name="invoiceId" value={inv.id} />
                                  <input type="hidden" name="status" value="paid" />
                                  <input type="hidden" name="redirectPath" value="/admin/engagements" />
                                  <button type="submit" className="admin-btn">入金済み</button>
                                </form>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <form action={issueInvoiceAction} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <input type="hidden" name="engagementId" value={e.id} />
                  <input type="hidden" name="redirectPath" value="/admin/engagements" />
                  <input className="admin-input" style={{ width: 100 }} type="text" name="periodLabel" placeholder="2026年8月分" required />
                  <input className="admin-input" type="number" name="amount" placeholder="金額(円)" defaultValue={e.companyAmount || ""} required />
                  <button type="submit" className="admin-btn">請求書を発行</button>
                </form>
              </div>

              <div style={{ flex: 1, minWidth: 260, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 11.5, color: COLORS.muted, marginBottom: 8 }}>② BeFree → 人材(支払い)</div>
                {e.payouts.length > 0 && (
                  <table style={{ marginBottom: 10 }}>
                    <thead><tr><th>対象月</th><th>金額</th><th>状況</th><th></th></tr></thead>
                    <tbody>
                      {e.payouts.map((p) => (
                        <tr key={p.id}>
                          <td>{p.periodLabel}</td>
                          <td style={{ fontFamily: FONT_MONO, color: COLORS.text }}>¥{p.amount.toLocaleString()}</td>
                          <td><span className="admin-badge">{PAYOUT_STATUS_LABEL[p.status]}</span></td>
                          <td>
                            {p.status !== "paid" && (
                              <div style={{ display: "flex", gap: 6 }}>
                                {p.status === "draft" && (
                                  <form action={updatePayoutStatusAction}>
                                    <input type="hidden" name="payoutId" value={p.id} />
                                    <input type="hidden" name="status" value="scheduled" />
                                    <input type="hidden" name="redirectPath" value="/admin/engagements" />
                                    <button type="submit" className="admin-btn-muted">支払予定</button>
                                  </form>
                                )}
                                <form action={updatePayoutStatusAction}>
                                  <input type="hidden" name="payoutId" value={p.id} />
                                  <input type="hidden" name="status" value="paid" />
                                  <input type="hidden" name="redirectPath" value="/admin/engagements" />
                                  <button type="submit" className="admin-btn">支払済み</button>
                                </form>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <form action={issuePayoutAction} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <input type="hidden" name="engagementId" value={e.id} />
                  <input type="hidden" name="redirectPath" value="/admin/engagements" />
                  <input className="admin-input" style={{ width: 100 }} type="text" name="periodLabel" placeholder="2026年8月分" required />
                  <input className="admin-input" type="number" name="amount" placeholder="金額(円)" defaultValue={e.talentAmount || ""} required />
                  <button type="submit" className="admin-btn">支払いを起票</button>
                </form>
              </div>
            </div>
          </div>
        );
      })}
    </AdminShell>
  );
}
