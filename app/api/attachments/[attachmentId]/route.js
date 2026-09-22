import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectIfAuthorized } from "@/lib/projectAccess";

// GET /api/attachments/[attachmentId]
// 稼働ログの添付ファイル(成果物)をダウンロードする。
// そのプロジェクトの当事者(企業・人材)と管理者のみアクセスできる。
export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const attachment = await prisma.workLogAttachment.findUnique({
    where: { id: params.attachmentId },
    include: { workLog: true },
  });
  if (!attachment) return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });

  const authorized = await getProjectIfAuthorized(attachment.workLog.projectId, user);
  if (!authorized) return NextResponse.json({ error: "このファイルへのアクセス権がありません" }, { status: 403 });

  return new NextResponse(Buffer.from(attachment.data), {
    headers: {
      "Content-Type": attachment.contentType,
      "Content-Length": String(attachment.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
