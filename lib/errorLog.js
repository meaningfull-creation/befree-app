import { prisma } from "@/lib/prisma";

// 外部エラー監視サービス(Sentry等)は未導入のため、DBに簡易記録する。
// 本番運用では、SENTRY_DSN等を設定して外部サービスに置き換える/併用することを推奨する。
export async function logError(source, error, context) {
  console.error(`[${source}]`, error);
  try {
    await prisma.errorLog.create({
      data: {
        source,
        message: error?.message || String(error),
        stack: error?.stack || null,
        context: context || null,
      },
    });
  } catch (e) {
    // ログ保存自体の失敗でリクエストを落とさない
    console.error("failed to persist error log:", e.message);
  }
}
