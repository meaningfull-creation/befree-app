// メール本文内のリンクは、送信先の受信環境(メールクライアント)には「今どのURLで見ているか」という
// 文脈がないため、常に絶対URLで書く必要がある。優先順位:
// 1. NEXT_PUBLIC_SITE_URL(独自ドメインを設定した場合に手動で設定する想定)
// 2. VERCEL_URL(Vercelが自動的に設定する、そのデプロイの実URL。プロトコルは含まれないため付与する)
// 3. ローカル開発用のフォールバック
export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
