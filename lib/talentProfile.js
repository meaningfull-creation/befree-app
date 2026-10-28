import { sanitizeSubFunctions } from "./axes.js";

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
