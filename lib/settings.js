import { prisma } from "@/lib/prisma";
import { PLATFORM_FEE_RATE as DEFAULT_FEE_RATE } from "@/lib/pricing";

const FEE_RATE_KEY = "platformFeeRate";

// 現在有効な手数料率を返す。管理画面から変更されていればその値、なければlib/pricing.jsの
// デフォルト値(0.4)にフォールバックする。DB未接続時もデフォルト値で動作を継続する。
export async function getPlatformFeeRate() {
  try {
    const setting = await prisma.platformSetting.findUnique({ where: { key: FEE_RATE_KEY } });
    if (!setting) return DEFAULT_FEE_RATE;
    const parsed = Number(setting.value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : DEFAULT_FEE_RATE;
  } catch (e) {
    console.error("failed to read platform fee rate, falling back to default:", e.message);
    return DEFAULT_FEE_RATE;
  }
}

export async function setPlatformFeeRate(rate) {
  const clamped = Math.max(0, Math.min(1, rate));
  await prisma.platformSetting.upsert({
    where: { key: FEE_RATE_KEY },
    update: { value: String(clamped) },
    create: { key: FEE_RATE_KEY, value: String(clamped) },
  });
  return clamped;
}
