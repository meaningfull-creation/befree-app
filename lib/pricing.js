// BeFreeの標準手数料率。企業がBeFreeに支払う金額のうち、この割合をBeFreeが取り分とし、
// 残りを人材への支払額とする。2026年8月に40%で確定。
export const BEFREE_FEE_RATE = 0.4;

// 企業請求額から、標準料率適用時の人材支払額を計算する(参考値。個別契約では金額を直接入力できる)。
export function standardTalentAmount(companyAmount) {
  return Math.round(companyAmount * (1 - BEFREE_FEE_RATE));
}
