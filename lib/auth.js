// 認証の共通ロジック。追加の外部ライブラリ(bcrypt等)を使わず、
// Node.js組み込みのcryptoモジュール(scrypt)でパスワードハッシュを行う。

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/passwordHash";

export { hashPassword, verifyPassword };

export const SESSION_COOKIE = "befree_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14日

// Sessionレコードを作成するだけ(Cookieのセットは呼び出し側でNextResponse経由で行う)。
export async function createSessionToken(userId) {
  const session = await prisma.session.create({
    data: { userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  return session;
}

export async function deleteSessionToken(token) {
  if (!token) return;
  await prisma.session.delete({ where: { id: token } }).catch(() => {});
}

// Server Component / Server Action / Route Handler のいずれからでも呼べる、現在ログイン中のユーザー取得。
export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: { include: { company: true, talent: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function requireRole(role) {
  const user = await getCurrentUser();
  if (!user || user.role !== role) return null;
  return user;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};
