import { prisma } from "@/lib/prisma";
import { isTalentAvailable } from "@/lib/capacityPure";

export { isTalentAvailable };

// 進行中(active)のEngagement数を人材(talentId)ごとに集計する。
export async function getActiveEngagementCountByTalent() {
  const activeEngagements = await prisma.engagement.findMany({
    where: { status: "active" },
    select: { match: { select: { talentSkillMap: { select: { talentId: true } } } } },
  });
  const counts = {};
  for (const e of activeEngagements) {
    const tId = e.match?.talentSkillMap?.talentId;
    if (!tId) continue;
    counts[tId] = (counts[tId] || 0) + 1;
  }
  return counts;
}
