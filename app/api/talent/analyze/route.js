import { NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/claude";
import { clampAxisScores, sanitizeGrowthAreas } from "@/lib/axes";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/errorLog";
import { buildTalentSystemPrompt, buildTalentAnalysisPrompt } from "@/lib/talentPrompts";

// AI呼び出しを含むため、Vercelの関数タイムアウトに余裕を持たせる
export const maxDuration = 60;

// POST /api/talent/analyze
// 認証は必須ではない(未ログインでもスキル解析を進められる。アカウント作成は
// 結果が出た後にまとめて行う設計 — /api/talent/claim 参照)。
// 実務経験者アカウントでログイン済みの場合のみ、その場でDB保存する。
// body: { talentForm: { name, title, industry, years, summary, experiencedFunctions, workStyleTags, valueTags, values } }
// returns: { scores, phases, bottlenecks, growthAreas, summary, talentId, talentSkillMapId }
export async function POST(req) {
  try {
    const user = await getCurrentUser();
    const isTalentUser = !!(user && user.role === "talent");

    const { talentForm } = await req.json();
    if (!talentForm?.name) {
      return NextResponse.json({ error: "talentForm.name is required" }, { status: 400 });
    }

    const result = await callClaudeJSON(buildTalentSystemPrompt(), buildTalentAnalysisPrompt(talentForm), 3500, { fast: true }); // モバイル利用が中心の人材側は速度を優先
    const scores = clampAxisScores(result.scores, 30);
    const phases = Array.isArray(result.phases) ? result.phases : [];
    const bottlenecks = Array.isArray(result.bottlenecks) ? result.bottlenecks : [];
    const growthAreas = sanitizeGrowthAreas(result.growthAreas);
    const experiencedFunctions = Array.isArray(talentForm.experiencedFunctions) ? talentForm.experiencedFunctions : [];
    const workStyleTags = Array.isArray(talentForm.workStyleTags) ? talentForm.workStyleTags : [];
    const valueTags = Array.isArray(talentForm.valueTags) ? talentForm.valueTags : [];

    // 同一アカウントでの再解析は、新しいTalentを作らず既存プロフィールを更新し、
    // スキルマップだけ新規追加する(履歴として残す)。
    let talentId = isTalentUser ? user.talentId : null;
    let talentSkillMapId = null;
    let talentStatus = "approved"; // 新規作成時のDBデフォルトと合わせている(現段階は自動承認運用)
    if (isTalentUser) {
      try {
        if (talentId) {
          const skillMap = await prisma.talentSkillMap.create({
            data: { talentId, axisScores: scores, phases, bottlenecks, growthAreas, summary: result.summary || null },
          });
          const updated = await prisma.talent.update({
            where: { id: talentId },
            data: {
              title: talentForm.title,
              industry: talentForm.industry || null,
              years: talentForm.years,
              bio: talentForm.summary || null,
              experiencedFunctions,
              workStyleTags,
              valueTags,
              values: talentForm.values || null,
            },
          });
          talentSkillMapId = skillMap.id;
          talentStatus = updated.status;
        } else {
          const talent = await prisma.talent.create({
            data: {
              name: talentForm.name,
              title: talentForm.title,
              industry: talentForm.industry || null,
              years: talentForm.years,
              bio: talentForm.summary || null,
              experiencedFunctions,
              workStyleTags,
              valueTags,
              values: talentForm.values || null,
              skillMaps: {
                create: [{ axisScores: scores, phases, bottlenecks, growthAreas, summary: result.summary || null }],
              },
              capacity: { create: { maxConcurrentEngagements: 3, currentCommittedHours: 0 } },
            },
            include: { skillMaps: true },
          });
          talentId = talent.id;
          talentSkillMapId = talent.skillMaps[0]?.id || null;
          talentStatus = talent.status;
          await prisma.user.update({ where: { id: user.id }, data: { talentId } });
        }
      } catch (persistErr) {
        // DB未接続でもAI解析自体は継続できるよう、永続化の失敗は握りつぶしてログのみ残す
        console.error("failed to persist talent skill map:", persistErr.message);
      }
    }

    return NextResponse.json({
      scores,
      phases,
      bottlenecks,
      growthAreas,
      summary: result.summary || null,
      talentId,
      talentSkillMapId,
      talentStatus,
    });
  } catch (e) {
    await logError("api/talent/analyze", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
