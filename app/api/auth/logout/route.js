import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSessionToken, SESSION_COOKIE } from "@/lib/auth";

// POST /api/auth/logout
export async function POST() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  await deleteSessionToken(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
