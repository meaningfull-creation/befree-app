import { sanitizeSubFunctions } from "./axes.js";

// アカウント作成だけ済ませて、経歴入力に進まずに離脱した方のTalentレコードは
// 氏名が空のまま作られる。管理画面で空欄になって行が読めなくなるのを避けるため、
// 表示と削除確認の両方でこの文字列に置き換える。
export const NO_NAME_PLACEHOLDER = "(氏名未入力)";

// 管理画面に出す氏名。空なら上のプレースホルダを返す。
export function talentDisplayName(name) {
  return name && name.trim() ? name : NO_NAME_PLACEHOLDER;
}

// 経歴入力フォーム(talentForm)から、Talentテーブルに保存する形へ揃える。
//
// v6.12まで、人材のTalentレコードは5問の対話が終わって初めて作られていた。
// そのため、途中で離脱した方は管理画面の人材一覧に一切現れず、
// 「登録されたのかどうか運営から分からない」状態になっていた。
// いまは経歴入力(お名前を入れた時点)で作り、対話の完了時に同じ形で上書きする。
// 2箇所から同じ変換を使うため、ここに1つだけ定義している。
export function talentProfileFromForm(talentForm) {
  return {
    name: talentForm.name,
    title: talentForm.title || null,
    industry: talentForm.industry || null,
    years: talentForm.years || null,
    bio: talentForm.summary || null,
    careerHistory: talentForm.summary || null,
    experiencedFunctions: Array.isArray(talentForm.experiencedFunctions) ? talentForm.experiencedFunctions : [],
    experiencedSubAreas: sanitizeSubFunctions(talentForm.experiencedSubAreas),
    workStyleTags: Array.isArray(talentForm.workStyleTags) ? talentForm.workStyleTags : [],
    valueTags: Array.isArray(talentForm.valueTags) ? talentForm.valueTags : [],
    values: talentForm.values || null,
  };
}

// アカウント作成(メールアドレス+パスワード)の直後に、氏名が空のTalentを用意する。
// 経歴入力まで進まずに離脱した方も管理画面の人材一覧に出すため(v6.13)。
// 経歴入力まで進めば saveTalentProfile() が同じレコードを氏名入りで更新する。
export function emptyTalentProfile() {
  return talentProfileFromForm({ name: "" });
}

// ログイン中の実務経験者アカウントに紐づくTalentを、作成または更新する。
// 既に紐づくTalentがあれば使い回し、再診断のたびに別レコードを作らない。
// 戻り値は talentId。保存できなかった場合は null(対話自体は続けられるようにする)。
export async function saveTalentProfile(prisma, user, talentForm) {
  const data = talentProfileFromForm(talentForm);

  if (user.talentId) {
    await prisma.talent.update({ where: { id: user.talentId }, data });
    return user.talentId;
  }

  const talent = await prisma.talent.create({
    data: {
      ...data,
      // 稼働枠は人材ごとに必ず1つ必要。以前は対話完了時に作っていたが、
      // レコード作成をここに前倒ししたのに合わせて同時に作る。
      capacity: { create: { maxConcurrentEngagements: 3, currentCommittedHours: 0 } },
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { talentId: talent.id } });
  return talent.id;
}
