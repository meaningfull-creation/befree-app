import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";
import { adminResetPasswordAction, adminToggleUserDisabledAction, adminCreateAdminAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

async function getUsers() {
  return prisma.user.findMany({
    include: { company: true, talent: true },
    orderBy: { createdAt: "desc" },
  });
}

const ROLE_LABEL = { company: "企業", talent: "実務経験者", admin: "運営者" };

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <AdminShell current="users">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>ユーザーアカウント</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px" }}>
        {users.length}件のアカウントがあります。パスワードリセットの代行、アカウントの停止・再開ができます。
      </p>

      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>新しい管理者アカウントを作成</div>
        <form action={adminCreateAdminAction} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="admin-input" type="email" name="email" placeholder="メールアドレス" required style={{ minWidth: 220 }} />
          <input className="admin-input" type="password" name="password" placeholder="パスワード(8文字以上)" required minLength={8} style={{ minWidth: 180 }} />
          <button type="submit" className="admin-btn">作成する</button>
        </form>
      </div>

      <table>
        <thead>
          <tr>
            <th>メールアドレス</th>
            <th>ロール</th>
            <th>紐づく名前</th>
            <th>状態</th>
            <th>登録日</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={{ fontFamily: FONT_MONO, fontSize: 12.5 }}>{u.email}</td>
              <td><span className="admin-badge">{ROLE_LABEL[u.role] || u.role}</span></td>
              <td>{u.company?.name || u.talent?.name || "—"}</td>
              <td>
                {u.disabledAt ? (
                  <span className="admin-badge" style={{ color: COLORS.amber }}>停止中</span>
                ) : (
                  <span className="admin-badge">有効</span>
                )}
              </td>
              <td style={{ fontFamily: FONT_MONO, fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString("ja-JP")}</td>
              <td>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <form action={adminResetPasswordAction} style={{ display: "flex", gap: 4 }}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="redirectPath" value="/admin/users" />
                    <input className="admin-input" type="password" name="newPassword" placeholder="新パスワード" minLength={8} style={{ width: 130 }} />
                    <button type="submit" className="admin-btn-muted">リセット</button>
                  </form>
                  <form action={adminToggleUserDisabledAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="disable" value={u.disabledAt ? "false" : "true"} />
                    <input type="hidden" name="redirectPath" value="/admin/users" />
                    <button type="submit" className={u.disabledAt ? "admin-btn" : "admin-btn-muted"}>
                      {u.disabledAt ? "再開する" : "停止する"}
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
