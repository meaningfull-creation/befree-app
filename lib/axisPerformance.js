import { prisma } from "@/lib/prisma";
import { AXIS_KEYS } from "@/lib/axes";
import { topMatchingAxes } from "@/lib/matching";
import { aggregateAxisPerformance } from "@/lib/learning";

// 蓄積されたEngagementOutcome(成果スコア)を集計し、軸ごとの学習係数(AxisPerformance)を
// 再計算してDBに保存する。管理画面から手動トリガーする想定(スケジューラ未導入のため)。
export async function recomputeAxisPerformance() {
  const outcomes = await prisma.engagementOutcome.findMany({
    include: {
      engagement: {
        include: {
          match: {
            include: { companySkillMap: true, talentSkillMap: true },
          },
        },
      },
    },
  });

  const records = outcomes.map((o) => {
    const { companySkillMap, talentSkillMap } = o.engagement.match;
    const axisKeys = topMatchingAxes(companySkillMap.axisScores, talentSkillMap.axisScores);
    return { axisKeys, outcomeScore: o.outcomeScore };
  });

  const performance = aggregateAxisPerformance(records, AXIS_KEYS);

  await prisma.$transaction(
    AXIS_KEYS.map((k) =>
      prisma.axisPerformance.upsert({
        where: { axisKey: k },
        update: {
          sampleCount: performance[k].sampleCount,
          avgOutcomeScore: performance[k].avgOutcomeScore,
          weightMultiplier: performance[k].weightMultiplier,
        },
        create: {
          axisKey: k,
          sampleCount: performance[k].sampleCount,
          avgOutcomeScore: performance[k].avgOutcomeScore,
          weightMultiplier: performance[k].weightMultiplier,
        },
      })
    )
  );

  return performance;
}

// scoreMatch()にそのまま渡せる { axisKey: multiplier } 形式で現在の学習係数を取得する。
export async function getAxisWeightMultipliers() {
  try {
    const rows = await prisma.axisPerformance.findMany();
    return Object.fromEntries(rows.map((r) => [r.axisKey, r.weightMultiplier]));
  } catch (e) {
    console.error("failed to load axis performance:", e.message);
    return {};
  }
}
