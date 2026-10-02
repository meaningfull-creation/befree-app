// 「この続きはこちらから」メールのワンタイムログインリンク。
//
// v6.8でアカウント作成を入力より前に移した。入力の途中で間が空いたり、
// PCで登録してスマホで続きをやるようなケースで、パスワードを思い出さなくても
// メールから同じアカウントに戻ってこられるようにするための仕組み。
//
// 安全のための決めごと:
//  - 使い捨て(usedAt)。1回使ったリンクは無効になる
//  - 期限付き(7日)。登録直後の「続き」が目的なので長く持たせすぎない
//  - リンクを開いただけではログインしない。メールクライアントやセキュリティ製品が
//    リンクを先読みすることがあり、それだけで消費されてしまうため、
//    /continue 画面のボタン(POST)で初めて消費する

import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";

export const LOGIN_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7日

export async function issueLoginLink(userId) {
  const token = await prisma.loginToken.create({
    data: { userId, expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS) },
  });
  return `${getSiteUrl()}/continue?token=${token.id}`;
}

// トークンを検証して消費する。有効なら userId を返し、無効なら null を返す。
// 使用済みフラグの更新は updateMany + usedAt:null 条件で行い、
// 同じリンクが同時に2回叩かれても1回しか成立しないようにする。
export async function consumeLoginToken(tokenId) {
  if (!tokenId || typeof tokenId !== "string") return null;
  const token = await prisma.loginToken.findUnique({ where: { id: tokenId } }).catch(() => null);
  if (!token) return null;
  if (token.usedAt) return null;
  if (token.expiresAt < new Date()) return null;

  const claimed = await prisma.loginToken.updateMany({
    where: { id: tokenId, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return null; // 別のリクエストに先に消費された

  return token.userId;
}
