import { prisma } from "@/lib/prisma";

// リクエストからクライアントIPを推定する(Vercel等のプロキシ環境ではx-forwarded-forを使う)。
export function getClientIp(req) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// 固定ウィンドウ方式のレート制限。サーバーレス環境でインスタンスをまたいでも機能するよう、
// メモリではなくDB(RateLimitEntry)でカウントする。
// 高頻度・大規模トラフィックには向かない(DB書き込みが都度発生するため)。
// 本格運用ではUpstash Redis等への置き換えを推奨する。
//
// @param key 制限の単位。例: `login:${email}` / `contact:${ip}`
// @param limit ウィンドウ内で許可する回数
// @param windowMs ウィンドウの長さ(ミリ秒)
// @returns { allowed: boolean, remaining: number }
export async function checkRateLimit(key, limit, windowMs) {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  try {
    const entry = await prisma.rateLimitEntry.upsert({
      where: { key_windowStart: { key, windowStart } },
      update: { count: { increment: 1 } },
      create: { key, windowStart, count: 1 },
    });
    return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
  } catch (e) {
    // DB未接続・エラー時は、機能停止よりも許可を優先する(可用性 > 完全なレート制限)
    console.error("rate limit check failed:", e.message);
    return { allowed: true, remaining: limit };
  }
}
