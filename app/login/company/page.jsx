import RoleLoginForm from "@/app/login/RoleLoginForm";

export const metadata = { title: "企業ログイン | BATTER BOX" };

export default function CompanyLoginPage() {
  return <RoleLoginForm role="company" />;
}
