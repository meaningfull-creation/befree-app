import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 12,
          padding: "10px 24px 0",
          maxWidth: 1100,
          margin: "0 auto",
          fontSize: 12,
          color: "#8B93A7",
        }}
      >
        <span>{user.email}としてログイン中</span>
        <form action={logoutAction}>
          <button type="submit" className="admin-btn-muted">ログアウト</button>
        </form>
      </div>
      {children}
    </div>
  );
}
