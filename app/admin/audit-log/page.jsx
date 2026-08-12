import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";

export const dynamic = "force-dynamic";

async function getData() {
  const [logs, errors] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.errorLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return { logs, errors };
}

export default async function AuditLogPage() {
  const { logs, errors } = await getData();

  return (
    <AdminShell current="audit-log">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>監査ログ・エラーログ</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px" }}>
        管理画面での操作履歴(直近100件)と、AI呼び出し等で発生したエラー(直近20件)です。
      </p>

      {errors.length > 0 && (
        <div className="admin-card">
          <div style={{ fontSize: 12, color: COLORS.amber, marginBottom: 12 }}>直近のエラー</div>
          <table>
            <thead><tr><th>発生箇所</th><th>メッセージ</th><th>日時</th></tr></thead>
            <tbody>
              {errors.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontFamily: FONT_MONO, fontSize: 12 }}>{e.source}</td>
                  <td style={{ color: COLORS.muted, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.message}</td>
                  <td style={{ color: COLORS.muted, whiteSpace: "nowrap" }}>{new Date(e.createdAt).toLocaleString("ja-JP")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>操作者</th>
              <th>操作</th>
              <th>対象</th>
              <th>詳細</th>
              <th>日時</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td style={{ color: COLORS.muted }}>{l.actorEmail || "—"}</td>
                <td><span className="admin-badge">{l.action}</span></td>
                <td style={{ color: COLORS.muted, fontFamily: FONT_MONO, fontSize: 11 }}>
                  {l.targetType ? `${l.targetType}:${(l.targetId || "").slice(0, 8)}` : "—"}
                </td>
                <td style={{ color: COLORS.muted, fontFamily: FONT_MONO, fontSize: 11, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.metadata ? JSON.stringify(l.metadata) : "—"}
                </td>
                <td style={{ color: COLORS.muted, whiteSpace: "nowrap" }}>{new Date(l.createdAt).toLocaleString("ja-JP")}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: COLORS.muted, textAlign: "center", padding: 30 }}>
                  まだ操作履歴がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
