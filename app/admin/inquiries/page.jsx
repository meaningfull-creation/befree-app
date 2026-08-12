import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";
import { updateInquiryStatusAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

async function getInquiries() {
  return prisma.inquiry.findMany({ orderBy: { createdAt: "desc" } });
}

const STATUS_LABEL = { new: "未対応", replied: "返信済み", closed: "対応完了" };

export default async function InquiriesPage() {
  const inquiries = await getInquiries();
  const newCount = inquiries.filter((i) => i.status === "new").length;

  return (
    <AdminShell current="inquiries">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>お問い合わせ</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px" }}>
        {inquiries.length}件の問い合わせがあります。{newCount > 0 && <span style={{ color: COLORS.amber }}>未対応が{newCount}件あります。</span>}
      </p>

      {inquiries.length === 0 && (
        <div className="admin-card" style={{ color: COLORS.muted, textAlign: "center" }}>
          まだ問い合わせはありません。
        </div>
      )}

      {inquiries.map((inq) => (
        <div key={inq.id} className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15 }}>{inq.name}</span>
              {inq.companyName && <span style={{ color: COLORS.muted, fontSize: 12.5, marginLeft: 8 }}>({inq.companyName})</span>}
            </div>
            <span className="admin-badge" style={{ color: inq.status === "new" ? COLORS.amber : undefined }}>{STATUS_LABEL[inq.status]}</span>
          </div>
          <div style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 10, fontFamily: FONT_MONO }}>
            {inq.email} ・ {new Date(inq.createdAt).toLocaleString("ja-JP")}
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.8, color: COLORS.text, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 12, whiteSpace: "pre-wrap" }}>
            {inq.message}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["new", "replied", "closed"].map((s) => (
              <form action={updateInquiryStatusAction} key={s}>
                <input type="hidden" name="inquiryId" value={inq.id} />
                <input type="hidden" name="status" value={s} />
                <input type="hidden" name="redirectPath" value="/admin/inquiries" />
                <button type="submit" className={inq.status === s ? "admin-btn" : "admin-btn-muted"}>{STATUS_LABEL[s]}</button>
              </form>
            ))}
          </div>
        </div>
      ))}
    </AdminShell>
  );
}
