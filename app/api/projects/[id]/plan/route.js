import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProjectIfAuthorized } from "@/lib/projectAccess";
import { generate90DayPlan } from "@/lib/ninetyDayPlan";
import { logError } from "@/lib/errorLog";
import { AXES } from "@/lib/axes";

const AXIS_LABEL_BY_KEY = Object.fromEntries(AXES.map((a) => [a.key, a.label]));

// POST /api/projects/[id]/plan
// 認証必須。プロジェクトの90日間実行プランをAIに生成させる(保存はしない、都度生成)。
export async function POST(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

    const authorized = await getProjectIfAuthorized(params.id, user);
    if (!authorized) return NextResponse.json({ error: "このプロジェクトへのアクセス権がありません" }, { status: 403 });

    const { project } = authorized;
    const plan = await generate90DayPlan({
      name: project.name,
      targetAxisLabel: project.targetAxis ? AXIS_LABEL_BY_KEY[project.targetAxis] : null,
      currentMonthGoal: project.currentMonthGoal,
      monthlyHours: project.engagement?.monthlyHours,
    });

    if (!plan) return NextResponse.json({ error: "プランの生成に失敗しました。もう一度お試しください。" }, { status: 502 });
    return NextResponse.json({ plan });
  } catch (e) {
    await logError("api/projects/[id]/plan", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
