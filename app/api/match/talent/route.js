import { NextResponse } from "next/server";
import { rankCandidates, scoreMatch } from "@/lib/matching";
import { COMPANY_CANDIDATES } from "@/lib/mockDb";

// POST /api/match/talent
// body: { talentScores, talentPhases }
// returns: { candidates: [...COMPANY_CANDIDATES, match] }  match降順
export async function POST(req) {
  try {
    const { talentScores, talentPhases } = await req.json();
    if (!talentScores) {
      return NextResponse.json({ error: "talentScores is required" }, { status: 400 });
    }

    const candidates = rankCandidates(COMPANY_CANDIDATES, (c) =>
      scoreMatch(c.companyScores, talentScores, c.phase, talentPhases || [])
    );

    return NextResponse.json({ candidates });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
