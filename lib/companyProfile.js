// 企業プロフィールの保存ロジック。人材側の lib/talentProfile.js と同じ考え方で、
// レコードを「入力の冒頭」で作り、あとから同じレコードを更新していく。
//
// v6.13までの企業側は、Companyレコードが会社情報の入力時にしか作られず、
// アカウント作成だけで離脱した方は管理画面の企業一覧に現れなかった。

// アカウント作成だけ済ませて、会社情報の入力に進まずに離脱した企業のレコードは
// 会社名が空のまま作られる。管理画面で空欄になって行が読めなくなるのを避けるため、
// 表示と削除確認の両方でこの文字列に置き換える。
export const NO_COMPANY_NAME_PLACEHOLDER = "(会社名未入力)";

// 管理画面に出す会社名。空なら上のプレースホルダを返す。
export function companyDisplayName(name) {
  return name && name.trim() ? name : NO_COMPANY_NAME_PLACEHOLDER;
}

// 会社情報フォーム(companyForm)から、Companyテーブルに保存する形へ揃える。
export function companyProfileFromForm(companyForm) {
  return {
    name: companyForm.name,
    industry: companyForm.industry || null,
    headcount: companyForm.headcount || null,
    fundingType: companyForm.fundingType || null,
    phase: companyForm.phase || null,
    revenue: companyForm.revenue || null,
  };
}

// アカウント作成の直後に、会社名が空のCompanyを用意するための入力。
export function emptyCompanyProfile() {
  return companyProfileFromForm({ name: "" });
}

// ログイン中の企業アカウントに紐づくCompanyを、作成または更新する。
// 既に紐づくCompanyがあれば使い回し、再診断のたびに別レコードを作らない。
// 戻り値は companyId。
export async function saveCompanyProfile(prisma, user, companyForm) {
  const data = companyProfileFromForm(companyForm);

  if (user.companyId) {
    await prisma.company.update({ where: { id: user.companyId }, data });
    return user.companyId;
  }

  const company = await prisma.company.create({ data });
  await prisma.user.update({ where: { id: user.id }, data: { companyId: company.id } });
  return company.id;
}
