import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { clampAxisScores, sanitizeGrowthAreas } from "@/lib/axes";
import { logError } from "@/lib/errorLog";

// POST /api/talent/claim
// 認証必須(role=talent)。未ログインのまま /api/talent/analyze を進めて得た結果
// (talentForm・スコア等)を、アカウント作成の直後にまとめて保存する。
// body: { talentForm, scores, phases, bottlenecks, growthAreas, summary }
export async function POST(req) {
  try {
    const user = await requireRole("talent");
    if (!user) {
      return NextResponse.json({ error: "実務経験者アカウントでのログインが必要です" }, { status: 401 });
    }

    const { talentForm, scores, phases, bottlenecks, growthAreas, summary } = await req.json();
    if (!talentForm?.name || !scores) {
      return NextResponse.json({ error: "talentForm, scores are required" }, { status: 400 });
    }

    const clampedScores = clampAxisScores(scores, 30);
    const safePhases = Array.isArray(phases) ? phases : [];
    const safeBottlenecks = Array.isArray(bottlenecks) ? bottlenecks : [];
    const safeGrowthAreas = sanitizeGrowthAreas(growthAreas);
    const experiencedFunctions = Array.isArray(talentForm.experiencedFunctions) ? talentForm.experiencedFunctions : [];
    const workStyleTags = Array.isArray(talentForm.workStyleTags) ? talentForm.workStyleTags : [];
    const valueTags = Array.isArray(talentForm.valueTags) ? talentForm.valueTags : [];

    // 新規作成直後のアカウントを想定しているが、念のため既存のTalentがあれば使い回す。
    let talentId = user.talentId;
    let talentSkillMapId = null;
    if (talentId) {
      const skillMap = await prisma.talentSkillMap.create({
        data: { talentId, axisScores: clampedScores, phases: safePhases, bottlenecks: safeBottlenecks, growthAreas: safeGrowthAreas, summary: summary || null },
      });
      await prisma.talent.update({
        where: { id: talentId },
        data: {
          title: talentForm.title,
          industry: talentForm.industry || null,
          years: talentForm.years,
          bio: talentForm.summary || summary || null,
          experiencedFunctions,
          workStyleTags,
          valueTags,
          values: talentForm.values || null,
        },
      });
      talentSkillMapId = skillMap.id;
    } else {
      const talent = await prisma.talent.create({
        data: {
          name: talentForm.name,
          title: talentForm.title,
          industry: talentForm.industry || null,
          years: talentForm.years,
          bio: talentForm.summary || summary || null,
          experiencedFunctions,
          workStyleTags,
          valueTags,
          values: talentForm.values || null,
          skillMaps: { create: [{ axisScores: clampedScores, phases: safePhases, bottlenecks: safeBottlenecks, growthAreas: safeGrowthAreas, summary: summary || null }] },
          capacity: { create: { maxConcurrentEngagements: 3, currentCommittedHours: 0 } },
        },
        include: { skillMaps: true },
      });
      talentId = talent.id;
      talentSkillMapId = talent.skillMaps[0]?.id || null;
      await prisma.user.update({ where: { id: user.id }, data: { talentId } });
    }

    return NextResponse.json({ ok: true, talentId, talentSkillMapId });
  } catch (e) {
    await logError("api/talent/claim", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
