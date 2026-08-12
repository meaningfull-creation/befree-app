// BATTER BOXの標準手数料率。企業がBATTER BOXに支払う金額のうち、この割合を取り分とし、
// 残りを人材への支払額とする。2026年8月に40%で確定。
export const PLATFORM_FEE_RATE = 0.4;

// 企業請求額から、標準料率適用時の人材支払額を計算する(参考値。個別契約では金額を直接入力できる)。
export function standardTalentAmount(companyAmount) {
  return Math.round(companyAmount * (1 - PLATFORM_FEE_RATE));
}
