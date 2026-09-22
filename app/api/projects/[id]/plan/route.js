import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectIfAuthorized } from "@/lib/projectAccess";
import { generate90DayPlan } from "@/lib/ninetyDayPlan";
import { logError } from "@/lib/errorLog";
import { AXES } from "@/lib/axes";

// AI呼び出しを含むため、Vercelの関数タイムアウトに余裕を持たせる
export const maxDuration = 60;

const AXIS_LABEL_BY_KEY = Object.fromEntries(AXES.map((a) => [a.key, a.label]));

// POST /api/projects/[id]/plan
// 認証必須。契約条件(月間稼働時間)に収まる90日間実行プランとKPI設計をAIに生成させ、
// プロジェクトに保存する。人材側はプロジェクト画面を開けば常に最新のプランを確認できる。
// - Month 1 の項目は、タスクが1件もないプロジェクトに限りタスクとして自動登録する
// - KPIは、KPIが1件もないプロジェクトに限り自動登録する
// (手入力済みのタスク・KPIを勝手に消したり重複させたりしないための制約)
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

    // プランを保存(再生成時は上書き)
    await prisma.project.update({
      where: { id: project.id },
      data: { plan, planGeneratedAt: new Date() },
    });

    // タスク・KPIの自動登録(既存データがある場合は触らない)
    let tasksSeeded = 0;
    let kpisSeeded = 0;
    const [taskCount, kpiCount] = await Promise.all([
      prisma.projectTask.count({ where: { projectId: project.id } }),
      prisma.projectKPI.count({ where: { projectId: project.id } }),
    ]);
    if (taskCount === 0 && plan.months[0]?.items?.length) {
      const created = await prisma.projectTask.createMany({
        data: plan.months[0].items.map((it) => ({
          projectId: project.id,
          title: it.hours ? `${it.action}(目安${it.hours}h)` : it.action,
        })),
      });
      tasksSeeded = created.count;
    }
    if (kpiCount === 0 && plan.kpis?.length) {
      const created = await prisma.projectKPI.createMany({
        data: plan.kpis.map((k) => ({
          projectId: project.id,
          name: k.name,
          targetValue: k.target,
          currentValue: 0,
          unit: k.unit,
        })),
      });
      kpisSeeded = created.count;
    }

    return NextResponse.json({ plan, tasksSeeded, kpisSeeded });
  } catch (e) {
    await logError("api/projects/[id]/plan", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
