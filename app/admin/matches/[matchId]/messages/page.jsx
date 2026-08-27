import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function getMatchWithMessages(matchId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      companySkillMap: { include: { company: true } },
      talentSkillMap: { include: { talent: true } },
    },
  });
  if (!match) return null;
  const messages = await prisma.message.findMany({ where: { matchId }, orderBy: { createdAt: "asc" } });
  return { match, messages };
}

export default async function AdminMatchMessagesPage({ params }) {
  const data = await getMatchWithMessages(params.matchId);
  if (!data) notFound();
  const { match, messages } = data;
  const company = match.companySkillMap.company;
  const talent = match.talentSkillMap.talent;

  return (
    <AdminShell current="messages">
      <a href="/admin/messages" className="admin-btn-muted" style={{ display: "inline-block", marginBottom: 16, marginRight: 8 }}>← メッセージ一覧に戻る</a>
      <a href={`/admin/companies/${company.id}`} className="admin-btn-muted" style={{ display: "inline-block", marginBottom: 16 }}>企業ページを見る</a>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>{company.name} × {talent.name}</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px" }}>
        {messages.length}件のメッセージ(読み取り専用・運営はここから送信できません)。
      </p>

      {messages.length === 0 && (
        <div className="admin-card" style={{ color: COLORS.muted, textAlign: "center" }}>まだメッセージはありません。</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m) => (
          <div key={m.id} className="admin-card" style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="admin-badge">{m.senderRole === "company" ? company.name : talent.name}</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: COLORS.muted }}>
                {new Date(m.createdAt).toLocaleString("ja-JP")}
              </span>
            </div>
            <p style={{ fontSize: 13, color: COLORS.text, margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{m.body}</p>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
