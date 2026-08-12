import { prisma } from "@/lib/prisma";

// 管理画面での変更操作(Server Actions)を記録する。内部統制・不正操作の追跡のため、
// お金や個人情報に関わる操作は必ずこれを通す。
export async function logAudit({ actorId, actorEmail, action, targetType, targetId, metadata }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actorId || null,
        actorEmail: actorEmail || null,
        action,
        targetType: targetType || null,
        targetId: targetId || null,
        metadata: metadata || null,
      },
    });
  } catch (e) {
    console.error("failed to persist audit log:", e.message);
  }
}
