import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectIfAuthorized } from "@/lib/projectAccess";

// GET /api/projects/[id]/rating
// 認証必須。当事者(企業/人材/管理者)のみアクセス可能。
export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getProjectIfAuthorized(params.id, user);
  if (!authorized) return NextResponse.json({ error: "このプロジェクトへのアクセス権がありません" }, { status: 403 });

  const rating = await prisma.talentRating.findUnique({ where: { projectId: params.id } });
  return NextResponse.json({ rating, myRole: authorized.myRole });
}

// POST /api/projects/[id]/rating
// 認証必須(role=company、そのプロジェクトの企業側当事者のみ)。既存があれば更新する(1プロジェクト1件)。
// body: { rating: 1-5, comment? }
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getProjectIfAuthorized(params.id, user);
  if (!authorized) return NextResponse.json({ error: "このプロジェクトへのアクセス権がありません" }, { status: 403 });
  if (authorized.myRole !== "company") {
    return NextResponse.json({ error: "評価は企業側アカウントのみ記録できます" }, { status: 403 });
  }

  const { rating, comment } = await req.json();
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: "評価は1〜5の整数で指定してください" }, { status: 400 });
  }

  const saved = await prisma.talentRating.upsert({
    where: { projectId: params.id },
    update: { rating: ratingNum, comment: comment || null },
    create: { projectId: params.id, rating: ratingNum, comment: comment || null },
  });

  return NextResponse.json({ ok: true, rating: saved });
}
