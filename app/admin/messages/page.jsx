import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

// 「企業・人材のDMを一元管理したい」との要望を受けて新設。
// メッセージが1件以上あるMatchを、最終メッセージの新しい順に一覧表示する。
// 件数規模がまだ大きくない前提で、並び替え・検索・ページングはアプリ側で行っている。
async function getThreads(q) {
  const matches = await prisma.match.findMany({
    where: { messages: { some: {} } },
    include: {
      companySkillMap: { include: { company: true } },
      talentSkillMap: { include: { talent: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      engagement: true,
      _count: { select: { messages: true } },
    },
  });

  let threads = matches.map((m) => ({
    matchId: m.id,
    companyName: m.companySkillMap.company.name,
    talentName: m.talentSkillMap.talent.name,
    messageCount: m._count.messages,
    lastMessage: m.messages[0] || null,
    matchStatus: m.status,
    contractProposed: m.engagement?.status === "proposed",
  }));

  if (q) {
    const needle = q.toLowerCase();
    threads = threads.filter((t) => t.companyName.toLowerCase().includes(needle) || t.talentName.toLowerCase().includes(needle));
  }

  threads.sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0));
  return threads;
}

const STATUS_LABEL = { proposed: "提案中", accepted: "契約済み", declined: "見送り" };

export default async function AdminMessagesPage({ searchParams }) {
  const q = searchParams?.q?.trim() || "";
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const allThreads = await getThreads(q);
  const total = allThreads.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const threads = allThreads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const qsFor = (p) => `?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${p}`;

  return (
    <AdminShell current="messages">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>メッセージ(DM)</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 20px" }}>
        {total}件のやり取りがあります。内容は読み取り専用で確認できます(運営から送信することはできません)。
      </p>

      <form method="get" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input className="admin-input" type="text" name="q" placeholder="企業名・氏名で検索" defaultValue={q} style={{ minWidth: 240 }} />
        <button type="submit" className="admin-btn-muted">検索</button>
        {q && <a href="/admin/messages" className="admin-btn-muted" style={{ display: "inline-block" }}>クリア</a>}
      </form>

      {threads.length === 0 && (
        <div className="admin-card" style={{ color: COLORS.muted, textAlign: "center" }}>
          {q ? "該当するやり取りが見つかりませんでした" : "まだメッセージのやり取りがありません"}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {threads.map((t) => (
          <a key={t.matchId} href={`/admin/matches/${t.matchId}/messages`} className="admin-card" style={{ display: "block", color: "inherit", textDecoration: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{t.companyName} × {t.talentName}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {t.contractProposed && (
                  <span className="admin-badge" style={{ color: COLORS.teal }}>契約提案中・人材の回答待ち</span>
                )}
                <span className="admin-badge">{STATUS_LABEL[t.matchStatus] || t.matchStatus}</span>
              </div>
            </div>
            {t.lastMessage && (
              <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.lastMessage.senderRole === "company" ? t.companyName : t.talentName}: {t.lastMessage.body}
              </p>
            )}
            <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: COLORS.faint }}>
              <span>{t.messageCount}件のメッセージ</span>
              {t.lastMessage && <span style={{ fontFamily: FONT_MONO }}>最終: {new Date(t.lastMessage.createdAt).toLocaleString("ja-JP")}</span>}
            </div>
          </a>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
          <a href={qsFor(Math.max(1, page - 1))} className="admin-btn-muted" style={{ display: "inline-block", opacity: page === 1 ? 0.4 : 1, pointerEvents: page === 1 ? "none" : "auto" }}>前へ</a>
          <span style={{ fontSize: 13, color: COLORS.muted, alignSelf: "center" }}>{page} / {totalPages}</span>
          <a href={qsFor(Math.min(totalPages, page + 1))} className="admin-btn-muted" style={{ display: "inline-block", opacity: page === totalPages ? 0.4 : 1, pointerEvents: page === totalPages ? "none" : "auto" }}>次へ</a>
        </div>
      )}
    </AdminShell>
  );
}
