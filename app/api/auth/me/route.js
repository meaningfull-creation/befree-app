import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// GET /api/auth/me
// returns: { user: { id, email, role, companyId, talentId } | null }
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      talentId: user.talentId,
      companyName: user.company?.name || null,
      talentName: user.talent?.name || null,
    },
  });
}
