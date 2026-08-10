import { NextResponse } from "next/server";
import { rankCandidates, scoreMatch } from "@/lib/matching";
import { TALENT_CANDIDATES } from "@/lib/mockDb";

// POST /api/match/company
// body: { companyScores, companyPhase }
// returns: { candidates: [...TALENT_CANDIDATES, match] }  match降順
export async function POST(req) {
  try {
    const { companyScores, companyPhase } = await req.json();
    if (!companyScores) {
      return NextResponse.json({ error: "companyScores is required" }, { status: 400 });
    }

    const candidates = rankCandidates(TALENT_CANDIDATES, (t) =>
      scoreMatch(companyScores, t.axisScores, companyPhase, t.phaseTags)
    );

    return NextResponse.json({ candidates });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
