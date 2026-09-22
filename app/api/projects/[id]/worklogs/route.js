import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectIfAuthorized } from "@/lib/projectAccess";

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "application/pdf",
  "text/plain", "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
];

// POST /api/projects/[id]/worklogs
// JSON: { description, hours }
// または multipart/form-data: description, hours, files(最大3・各5MB) — 成果物の添付に対応
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getProjectIfAuthorized(params.id, user);
  if (!authorized) return NextResponse.json({ error: "このプロジェクトへのアクセス権がありません" }, { status: 403 });

  let description = "";
  let hours = null;
  let files = [];

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    description = String(form.get("description") || "");
    hours = form.get("hours");
    files = form.getAll("files").filter((f) => typeof f === "object" && f && typeof f.arrayBuffer === "function" && f.size > 0);
  } else {
    const body = await req.json();
    description = body.description || "";
    hours = body.hours;
  }

  if (!description.trim() || !hours) {
    return NextResponse.json({ error: "内容と稼働時間は必須です" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `添付は${MAX_FILES}ファイルまでです` }, { status: 400 });
  }
  for (const f of files) {
    if (f.size > MAX_FILE_SIZE) return NextResponse.json({ error: `「${f.name}」が大きすぎます(5MBまで)` }, { status: 400 });
    if (f.type && !ALLOWED_TYPES.includes(f.type)) return NextResponse.json({ error: `「${f.name}」のファイル形式には対応していません` }, { status: 400 });
  }

  const workLog = await prisma.workLog.create({
    data: { projectId: params.id, description: description.trim().slice(0, 2000), hours: Number(hours) },
  });

  const attachments = [];
  for (const f of files) {
    const buf = Buffer.from(await f.arrayBuffer());
    const att = await prisma.workLogAttachment.create({
      data: {
        workLogId: workLog.id,
        filename: (f.name || "file").slice(0, 200),
        contentType: f.type || "application/octet-stream",
        size: f.size,
        data: buf,
      },
      select: { id: true, filename: true, size: true, contentType: true },
    });
    attachments.push(att);
  }

  return NextResponse.json({ workLog: { ...workLog, attachments } });
}
