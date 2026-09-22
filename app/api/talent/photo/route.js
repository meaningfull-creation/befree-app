import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logError } from "@/lib/errorLog";

const MAX_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

// POST /api/talent/photo
// 認証必須(role=talent)。自分の顔写真を登録・差し替えする。
// multipart/form-data: photo(1ファイル・3MBまで・png/jpeg/webp)
// 外部ストレージを使わずDB(TalentPhoto.data)に保存する(WorkLogAttachmentと同じ方針)。
export async function POST(req) {
  try {
    const user = await requireRole("talent");
    if (!user) return NextResponse.json({ error: "実務経験者アカウントでのログインが必要です" }, { status: 401 });
    if (!user.talentId) return NextResponse.json({ error: "先にプロフィールを作成してください" }, { status: 400 });

    const form = await req.formData();
    const file = form.get("photo");
    if (!file || typeof file !== "object" || typeof file.arrayBuffer !== "function" || !file.size) {
      return NextResponse.json({ error: "画像ファイルを選択してください" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "画像が大きすぎます(3MBまで)" }, { status: 400 });
    }
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "JPEG・PNG・WebP形式の画像を選択してください" }, { status: 400 });
    }

    const data = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "image/jpeg";
    await prisma.$transaction([
      prisma.talentPhoto.upsert({
        where: { talentId: user.talentId },
        update: { contentType, size: file.size, data },
        create: { talentId: user.talentId, contentType, size: file.size, data },
      }),
      // 一覧取得で画像本体を読まずに「写真があるか」を判定するためのフラグ兼キャッシュキー
      prisma.talent.update({ where: { id: user.talentId }, data: { photoUpdatedAt: new Date() } }),
    ]);

    return NextResponse.json({ ok: true, photoUpdatedAt: new Date().toISOString() });
  } catch (e) {
    await logError("api/talent/photo", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/talent/photo — 自分の顔写真を削除する
export async function DELETE() {
  try {
    const user = await requireRole("talent");
    if (!user) return NextResponse.json({ error: "実務経験者アカウントでのログインが必要です" }, { status: 401 });
    if (!user.talentId) return NextResponse.json({ error: "先にプロフィールを作成してください" }, { status: 400 });

    await prisma.$transaction([
      prisma.talentPhoto.deleteMany({ where: { talentId: user.talentId } }),
      prisma.talent.update({ where: { id: user.talentId }, data: { photoUpdatedAt: null } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    await logError("api/talent/photo", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
