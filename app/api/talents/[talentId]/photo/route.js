import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/talents/[talentId]/photo
// 人材の顔写真を返す。企業(マッチング候補・詳細画面での閲覧)、管理者、本人のみ。
// 未ログインには返さない(登録者の顔写真が公開Webに流出しないようにする)。
export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  // 企業(候補の閲覧)・管理者・本人のみ。人材が他の人材の顔写真を引けないようにする。
  const allowed = user.role === "company" || user.role === "admin" || user.talentId === params.talentId;
  if (!allowed) return NextResponse.json({ error: "この写真へのアクセス権がありません" }, { status: 403 });

  const photo = await prisma.talentPhoto.findUnique({ where: { talentId: params.talentId } });
  if (!photo) return NextResponse.json({ error: "写真が登録されていません" }, { status: 404 });

  return new NextResponse(Buffer.from(photo.data), {
    headers: {
      "Content-Type": photo.contentType,
      "Content-Length": String(photo.size),
      // 本人以外にも配信されるため public ではなく private(共有キャッシュに載せない)
      "Cache-Control": "private, max-age=3600",
    },
  });
}
