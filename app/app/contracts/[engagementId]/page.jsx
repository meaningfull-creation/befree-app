import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AXES } from "@/lib/axes";
import { COLORS, FONT_DISPLAY, FONT_MONO, GlobalStyle } from "@/lib/theme";
import { redirect, notFound } from "next/navigation";
import PrintButton from "./PrintButton";

const AXIS_LABEL_BY_KEY = Object.fromEntries(AXES.map((a) => [a.key, a.label]));

async function getEngagement(id) {
  return prisma.engagement.findUnique({
    where: { id },
    include: {
      match: {
        include: {
          companySkillMap: { include: { company: { include: { user: true } } } },
          talentSkillMap: { include: { talent: { include: { user: true } } } },
        },
      },
      project: true,
    },
  });
}

// 契約内容確認書。企業・人材どちらの当事者、または管理者のみ閲覧できる。
// 「委託契約書を締結」という要望への対応だが、法的に有効な電子契約(電子署名等)ではなく、
// BATTER BOXプラットフォーム上で合意した契約条件を、両者がいつでも確認できる記録として
// 位置づけている(その旨を画面内にも明記している)。印刷・PDF保存を想定したレイアウト。
export default async function ContractConfirmationPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const engagement = await getEngagement(params.engagementId);
  if (!engagement) notFound();

  const company = engagement.match.companySkillMap.company;
  const talent = engagement.match.talentSkillMap.talent;
  const isParty =
    (user.role === "company" && user.id === company.user?.id) ||
    (user.role === "talent" && user.id === talent.user?.id) ||
    user.role === "admin";
  if (!isParty) redirect("/app");

  const targetAxisLabel = engagement.project?.targetAxis ? AXIS_LABEL_BY_KEY[engagement.project.targetAxis] : null;

  // 人材(乙)には自身の受取額のみを表示する。企業がBATTER BOXに支払う金額(手数料込み)は
  // 乙側の契約条件ではないため、乙の確認書には記載しない。
  const viewerIsTalent = user.role === "talent";

  return (
    <div className="app-root">
      <GlobalStyle />
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <a href="/app" className="btn-ghost">← アプリに戻る</a>
          <PrintButton style={{ border: "none", background: COLORS.teal, color: COLORS.onAccent, cursor: "pointer" }}>
            このページを印刷 / PDF保存
          </PrintButton>
        </div>

        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "40px 44px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: COLORS.faint, letterSpacing: "0.1em", marginBottom: 8 }}>BATTER BOX</div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: 0 }}>業務委託契約 内容確認書</h1>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.muted, marginBottom: 28 }}>
            <span>確認書番号: {engagement.id.slice(0, 8).toUpperCase()}</span>
            <span>発行日: {new Date().toLocaleDateString("ja-JP")}</span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <tbody>
              {[
                ["甲(委託者)", company.name],
                ["乙(受託者)", talent.name],
                ["契約形態", "業務委託契約(準委任)"],
                ["対象課題", targetAxisLabel || "—"],
                ["契約開始日", engagement.startDate ? new Date(engagement.startDate).toLocaleDateString("ja-JP") : "—"],
                ["月間稼働時間", engagement.monthlyHours ? `${engagement.monthlyHours}時間 / 月` : "—"],
                ["月額報酬(乙の受取額)", engagement.talentAmount != null ? `¥${engagement.talentAmount.toLocaleString()}` : "—"],
                ...(viewerIsTalent ? [] : [["月額(甲がBATTER BOXに支払う額)", engagement.companyAmount != null ? `¥${engagement.companyAmount.toLocaleString()}` : "—"]]),
                ["支払方法", "請求書ベースでの月次精算(BATTER BOX経由)"],
                ["契約ステータス", engagement.status === "active" ? "成立・進行中" : engagement.status === "completed" ? "完了" : engagement.status],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "10px 12px", color: COLORS.muted, width: "42%", verticalAlign: "top" }}>{label}</td>
                  <td style={{ padding: "10px 12px", fontFamily: label.includes("月額") || label.includes("時間") ? FONT_MONO : "inherit" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 28, padding: "14px 16px", background: COLORS.surfaceRaised, borderRadius: 8, fontSize: 11.5, color: COLORS.muted, lineHeight: 1.8 }}>
            本確認書は、BATTER BOXプラットフォーム上で甲乙間の契約条件が確認・合意されたことを記録するものです。
            電子署名等による法的な契約締結を代替するものではありません。正式な契約書面が必要な場合は、
            別途書面での契約締結をご検討ください。詳細な取引条件は、BATTER BOX利用規約に準じます。
          </div>
        </div>
      </div>
    </div>
  );
}
