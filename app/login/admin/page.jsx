import RoleLoginForm from "@/app/login/RoleLoginForm";

export const metadata = { title: "管理者ログイン | BATTER BOX" };

export default function AdminLoginPage() {
  return <RoleLoginForm role="admin" />;
}
